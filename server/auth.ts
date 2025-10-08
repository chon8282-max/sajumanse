import { Router, type Request } from "express";
import { storage } from "./storage";
import crypto from "crypto";

const router = Router();

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
  const replitDomain = process.env.REPLIT_DOMAINS;
  
  if (replitDomain) {
    const uri = `https://${replitDomain}/api/auth/callback`;
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
    const isReplit = !!process.env.REPLIT_DOMAINS;
    res.cookie("oauth_verifier", codeVerifier, {
      signed: true,
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      maxAge: 10 * 60 * 1000, // 10분
    });
    res.cookie("oauth_state", state, {
      signed: true,
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      maxAge: 10 * 60 * 1000, // 10분
    });

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: getRedirectUri(req),
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/drive.appdata",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline", // refresh token을 받기 위해
      prompt: "consent", // 항상 consent 화면 표시 (refresh token 받기 위해)
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
    const isReplit = !!process.env.REPLIT_DOMAINS;
    res.cookie("userId", user.id, {
      signed: true,
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    });

    // OAuth 임시 쿠키 삭제 (설정과 동일한 옵션 필요)
    res.clearCookie("oauth_verifier", {
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      signed: true,
    });
    res.clearCookie("oauth_state", {
      httpOnly: true,
      secure: isReplit,
      sameSite: isReplit ? "none" : "lax",
      signed: true,
    });

    console.log("✅ Login successful, user ID:", user.id);
    // 프론트엔드로 리다이렉트
    res.redirect("/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : "");
    
    // 디버깅: 오류 메시지를 URL에 포함
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.redirect(`/?error=auth_failed&details=${encodeURIComponent(errorMsg)}`);
  }
});

// 로그아웃
router.post("/logout", (req: Request, res) => {
  // 서명된 쿠키 삭제 (설정과 동일한 옵션 필요)
  const isReplit = !!process.env.REPLIT_DOMAINS;
  res.clearCookie("userId", {
    httpOnly: true,
    secure: isReplit,
    sameSite: isReplit ? "none" : "lax",
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
      const isReplit = !!process.env.REPLIT_DOMAINS;
      res.clearCookie("userId", {
        httpOnly: true,
        secure: isReplit,
        sameSite: isReplit ? "none" : "lax",
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
