import { Router, type Request } from "express";
import { storage } from "./storage";
import crypto from "crypto";

const router = Router();

// 인스턴스 메모리에 의존하지 않는 자체 서명 토큰 (Cloud Run 다중 인스턴스 대응)
function signAuthToken(userId: string, expiry: number): string {
  const secret = process.env.SESSION_SECRET || "fallback-secret";
  const payload = Buffer.from(JSON.stringify({ userId, expiry })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyAuthToken(token: string): { userId: string; expiry: number } | null {
  try {
    const secret = process.env.SESSION_SECRET || "fallback-secret";
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (Date.now() > data.expiry) return null;
    return data;
  } catch {
    return null;
  }
}

// 임시 토큰 저장소 (메모리 기반, 5분 자동 만료)
interface TempToken {
  userId: string;
  expiry: number;
}
const tempTokens = new Map<string, TempToken>();

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of Array.from(tempTokens.entries())) {
    if (now > data.expiry) {
      tempTokens.delete(token);
    }
  }
}, 60000);

// Google OAuth 설정
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"; // v3는 sub 필드를 사용

function getRedirectUri(req?: Request) {
  // Request의 Host 헤더를 사용해서 정확한 도메인 감지
  if (req) {
    const host = req.get('host');
    if (host) {
      // Replit은 항상 HTTPS를 사용 (프록시 뒤에서 req.protocol이 http일 수 있음)
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const uri = `${protocol}://${host}/api/auth/callback`;
      console.log("OAuth Redirect URI from request:", uri);
      return uri;
    }
  }
  
  // Fallback: Replit 환경에서는 REPLIT_DOMAINS 환경 변수 사용
  const replitDomains = process.env.REPLIT_DOMAINS;
  
  if (replitDomains) {
    // REPLIT_DOMAINS는 쉼표로 구분된 여러 도메인을 포함할 수 있음
    const firstDomain = replitDomains.split(',')[0].trim();
    const uri = `https://${firstDomain}/api/auth/callback`;
    console.log("OAuth Redirect URI from env:", uri);
    return uri;
  }
  
  // 로컬 개발 환경
  return "http://localhost:5000/api/auth/callback";
}

// PKCE code verifier 생성
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

// PKCE code challenge 생성
function generateCodeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// Google 로그인 시작
router.get("/login", (req: Request, res) => {
  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    // PKCE verifier와 state를 서명된 쿠키에 저장 (다중 인스턴스 환경 지원)
    const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.GOOGLE_CLIENT_ID);
    const cookieOptions = {
      signed: true,
      httpOnly: true,
      secure: isReplit,
      sameSite: (isReplit ? "none" : "lax") as "none" | "lax",
      path: "/", // 명시적으로 path 설정
      maxAge: 10 * 60 * 1000, // 10분
    };
    
    res.cookie("oauth_verifier", codeVerifier, cookieOptions);
    res.cookie("oauth_state", state, cookieOptions);

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: getRedirectUri(req),
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/drive.appdata",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline", // refresh token을 받기 위해
      prompt: "consent",
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    res.redirect(authUrl);
  } catch (error) {
    console.error("OAuth login error:", error);
    res.status(500).json({ error: "로그인 시작 중 오류가 발생했습니다." });
  }
});

// Google OAuth 콜백
router.get("/callback", async (req: Request, res) => {
  try {
    const { code, state } = req.query;

    // 서명된 쿠키에서 PKCE 데이터 읽기 (다중 인스턴스 환경 지원)
    const savedState = req.signedCookies.oauth_state;
    const codeVerifier = req.signedCookies.oauth_verifier;

    console.log("=== OAuth Callback Debug ===");
    console.log("Received state:", state);
    console.log("Saved state (cookie):", savedState);
    console.log("Has codeVerifier (cookie):", !!codeVerifier);
    console.log("All cookies:", req.cookies);
    console.log("All signed cookies:", req.signedCookies);
    console.log("Cookie header:", req.headers.cookie);

    // State 검증
    if (!state || state !== savedState) {
      console.error("State mismatch!", { received: state, expected: savedState });
      throw new Error("Invalid state parameter");
    }

    if (!code || typeof code !== "string") {
      console.error("No code received");
      throw new Error("No authorization code received");
    }

    if (!codeVerifier) {
      console.error("No codeVerifier in cookies");
      throw new Error("Code verifier not found");
    }

    // 토큰 교환
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        redirect_uri: getRedirectUri(req),
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange failed:", error);
      throw new Error("Failed to exchange authorization code");
    }

    const tokens = await tokenResponse.json();

    // 사용자 정보 가져오기
    const userinfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userinfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userinfo = await userinfoResponse.json();
    
    // Google ID 추출 (v2는 id, v3는 sub 사용)
    const googleId = userinfo.sub || userinfo.id;
    
    if (!googleId) {
      console.error("No Google ID found in userinfo:", userinfo);
      throw new Error("Google ID not found");
    }

    // DB에 사용자 저장/업데이트
    const user = await storage.upsertUser({
      id: googleId,
      email: userinfo.email,
      displayName: userinfo.name || userinfo.email,
      photoUrl: userinfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      isMaster: false,
    });

    // 서명된 쿠키에 사용자 ID 저장 (배포 환경에서 안정적)
    const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.GOOGLE_CLIENT_ID);
    res.cookie("userId", user.id, {
      signed: true,
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      path: "/", // 명시적으로 path 설정
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    });

    // OAuth 임시 쿠키 삭제 (설정과 동일한 옵션 필요)
    const clearCookieOptions = {
      httpOnly: true,
      secure: isReplit,
      sameSite: (isReplit ? "none" : "lax") as "none" | "lax",
      path: "/", // 명시적으로 path 설정
      signed: true,
    };
    res.clearCookie("oauth_verifier", clearCookieOptions);
    res.clearCookie("oauth_state", clearCookieOptions);

    console.log("✅ Login successful, user ID:", user.id);
    
    // PWA용 임시 토큰 생성 (자체 서명, 5분 유효)
    const authToken = signAuthToken(user.id, Date.now() + 5 * 60 * 1000);
    
    const host = req.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const homeUrl = `${protocol}://${host}/`;
    const authRedirectUrl = `${protocol}://${host}/?auth_token=${authToken}`;
    const deepLink = `sajumanseapp://oauth?auth_token=${authToken}`;
    
    // 브릿지 페이지 렌더링 (PWA와 일반 브라우저 모두 처리)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>로그인 완료</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
          }
          .success {
            font-size: 48px;
            margin-bottom: 1rem;
          }
          h1 {
            color: #3d2c1a;
            margin-bottom: 1rem;
          }
          .message {
            color: #666;
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #3d2c1a;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 17px;
          }
          .sub-link {
            display: block;
            margin-top: 1.5rem;
            font-size: 13px;
            color: #999;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>로그인 완료!</h1>
          <p class="message" id="message">로그인이 성공적으로 완료되었습니다.</p>

          <a href="${deepLink}" class="btn" id="appBtn" style="display: none;">📱 앱으로 돌아가기</a>
          <a href="${homeUrl}" class="btn" id="returnBtn" style="display: none;">홈으로 이동</a>
          <a href="${authRedirectUrl}" class="sub-link" id="webFallbackLink" style="display: none;">앱이 없으신가요? 웹에서 계속하기</a>
        </div>
        <script>
  // 모바일 기기(안드로이드/iOS) 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (window.opener) {
    // 팝업으로 열렸을 경우 처리 (데스크탑 등)
    try {
      window.opener.postMessage({ type: 'auth_success' }, '${homeUrl}');
      setTimeout(() => window.close(), 500);
    } catch (e) {
      window.location.href = '${homeUrl}';
    }
  } else if (isMobile) {
    // 🔥 모바일: 자동 이동 대신, 사용자가 직접 누르는 버튼만 노출
    // (자동 리다이렉트는 Chrome 보안 정책으로 딥링크가 막히고,
    //  그 경우 Chrome 자체가 웹사이트를 열어 세션을 가로채는 문제가 있었음)
    document.getElementById('appBtn').style.display = 'inline-block';
    document.getElementById('webFallbackLink').style.display = 'block';

    // 최초 1회 자동 시도는 하되(설치 안내 등), 실패해도 절대 Chrome에서
    // authRedirectUrl로 자동 이동하지 않음 (세션 가로채기 방지)
    try {
      window.location.href = '${deepLink}';
    } catch (e) {}
  } else {
    // 데스크탑 일반 브라우저 환경만 자동 이동
    window.location.href = '${authRedirectUrl}';
  }
</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : "");
    
    // 디버깅: 오류 메시지를 URL에 포함 (완전한 URL 사용)
    const errorMsg = error instanceof Error ? error.message : String(error);
    const host = req.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const redirectUrl = `${protocol}://${host}/?error=auth_failed&details=${encodeURIComponent(errorMsg)}`;
    console.log("Redirecting to (error):", redirectUrl);
    res.redirect(redirectUrl);
  }
});

// PWA 임시 토큰으로 세션 생성
router.post("/exchange-token", (req: Request, res) => {
  try {
    const { authToken } = req.body;
    
    if (!authToken) {
      return res.status(400).json({ error: "Token required" });
    }
    
    // 자체 서명 검증 (메모리 불필요, 인스턴스 무관)
    const tokenData = verifyAuthToken(authToken);
    
    if (!tokenData) {
      return res.status(401).json({ error: "Token expired or invalid" });
    }
    
    // 세션 쿠키 생성 (메인 세션)
    const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.GOOGLE_CLIENT_ID);
    res.cookie("userId", tokenData.userId, {
      signed: true,
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    });
    
    console.log("✅ Token exchanged successfully for user:", tokenData.userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 로그아웃
router.post("/logout", (req: Request, res) => {
  const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.GOOGLE_CLIENT_ID);
  res.clearCookie("userId", {
    httpOnly: true,
    secure: isReplit,
    sameSite: isReplit ? "none" : "lax",
    path: "/",
    signed: true,
  });
  
  res.json({ success: true });
});

// 현재 사용자 정보
router.get("/user", async (req: Request, res) => {
  try {
    // 서명된 쿠키에서 userId 읽기
    const userId = req.signedCookies.userId;
    
    if (!userId) {
      return res.json({ user: null });
    }

    const user = await storage.getUser(userId);
    
    if (!user) {
      // 쿠키 삭제 (설정과 동일한 옵션 필요)
      const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.GOOGLE_CLIENT_ID);
      res.clearCookie("userId", {
        httpOnly: true,
        secure: isReplit,
        sameSite: isReplit ? "none" : "lax",
        path: "/", // 명시적으로 path 설정
        signed: true,
      });
      return res.json({ user: null });
    }

    // 토큰 제외하고 반환
    const { accessToken, refreshToken, ...userWithoutTokens } = user;
    res.json({ user: userWithoutTokens });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "사용자 정보 조회 중 오류가 발생했습니다." });
  }
});

export default router;
