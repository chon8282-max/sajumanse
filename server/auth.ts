import { Router, type Request as ExpressRequest } from "express";
import { storage } from "./storage";
import crypto from "crypto";

const router = Router();

// 세션 타입 확장
interface SessionData {
  userId?: string;
  codeVerifier?: string;
  state?: string;
}

interface AuthRequest extends ExpressRequest {
  session: SessionData & ExpressRequest["session"];
}

// Google OAuth 설정
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getRedirectUri() {
  return process.env.NODE_ENV === "production"
    ? "https://manseryeog-chon8282.replit.app/auth/callback"
    : "http://localhost:5000/auth/callback";
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
router.get("/login", (req: AuthRequest, res) => {
  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    // PKCE verifier와 state를 세션에 저장
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: getRedirectUri(),
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
router.get("/callback", async (req: AuthRequest, res) => {
  try {
    const { code, state } = req.query;

    // State 검증
    if (!state || state !== req.session.state) {
      throw new Error("Invalid state parameter");
    }

    if (!code || typeof code !== "string") {
      throw new Error("No authorization code received");
    }

    const codeVerifier = req.session.codeVerifier;
    if (!codeVerifier) {
      throw new Error("Code verifier not found in session");
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
        redirect_uri: getRedirectUri(),
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

    // DB에 사용자 저장/업데이트
    const user = await storage.upsertUser({
      id: userinfo.id,
      email: userinfo.email,
      displayName: userinfo.name || userinfo.email,
      photoUrl: userinfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      isMaster: false,
    });

    // 세션에 사용자 ID 저장
    req.session.userId = user.id;
    req.session.codeVerifier = undefined;
    req.session.state = undefined;

    // 프론트엔드로 리다이렉트
    res.redirect("/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect("/?error=auth_failed");
  }
});

// 로그아웃
router.post("/logout", (req: AuthRequest, res) => {
  req.session.destroy((err: any) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "로그아웃 중 오류가 발생했습니다." });
    }
    res.json({ success: true });
  });
});

// 현재 사용자 정보
router.get("/user", async (req: AuthRequest, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    const user = await storage.getUser(userId);
    
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 토큰 제외하고 반환
    const { accessToken, refreshToken, ...userWithoutTokens } = user;
    res.json(userWithoutTokens);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "사용자 정보 조회 중 오류가 발생했습니다." });
  }
});

export default router;
