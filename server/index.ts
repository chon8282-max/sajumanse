import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { initializeFirebaseAdmin } from "./firebase-admin";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

// Trust all proxies for secure cookies behind Replit multi-hop proxy
app.set("trust proxy", true);

// Health check endpoint (DB 의존성 없음, 즉시 응답)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(express.json());

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.urlencoded({ extended: false }));

// Session secret 검증
if (!process.env.SESSION_SECRET) {
  console.error("❌ SESSION_SECRET is not set!");
  throw new Error("SESSION_SECRET must be set. Please add it to your environment variables.");
}

// 환경 감지: Replit 환경 감지 (개발/배포 모두 HTTPS 사용)
const isReplit = !!process.env.REPLIT_DOMAINS;
const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';

console.log(`🔒 Environment: ${isDeployment ? 'DEPLOYMENT' : (isReplit ? 'DEVELOPMENT' : 'LOCALHOST')}`);
console.log(`🔒 Cookie mode: ${isReplit ? 'secure:true, sameSite:none' : 'secure:false, sameSite:lax'}`);
console.log(`🔒 REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS || 'not set'}`);

// 서명된 쿠키 파서 (OAuth 완전 stateless 인증)
app.use(cookieParser(process.env.SESSION_SECRET));

console.log("✅ Using stateless signed cookies for OAuth authentication");

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // 1️⃣ 먼저 HTTP 서버 생성
    const { createServer } = await import("http");
    const server = createServer(app);
    
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // 2️⃣ 즉시 서버 시작 (헬스 체크 응답 가능)
    server.listen(port, "0.0.0.0", () => {
      log(`✅ Server listening on port ${port} (health check ready)`);
    });

    // 3️⃣ 백그라운드에서 라우트 및 정적 파일 설정
    (async () => {
      try {
        // Firebase Admin 초기화
        initializeFirebaseAdmin();
        
        // 라우트 등록 (비동기 작업)
        await registerRoutes(app);
        log("✅ Routes registered");

        // 에러 핸들러
        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
          const status = err.status || err.statusCode || 500;
          const message = err.message || "Internal Server Error";
          res.status(status).json({ message });
          throw err;
        });

        // 정적 파일 설정
        if (app.get("env") === "development") {
          await setupVite(app, server);
          log("✅ Vite dev server ready");
        } else {
          const possiblePaths = [
            path.resolve(import.meta.dirname, "..", "dist", "public"),
            path.resolve(import.meta.dirname, "public"),
            path.resolve(process.cwd(), "dist", "public"),
            path.join("/app", "dist", "public")
          ];
          
          let distPath: string | null = null;
          for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
              distPath = testPath;
              log(`Found static files at: ${distPath}`);
              break;
            }
          }
          
          if (!distPath) {
            const errorMsg = `Could not find build directory. Tried: ${possiblePaths.join(", ")}`;
            log(errorMsg);
            throw new Error(errorMsg);
          }
          
          app.use(express.static(distPath));
          app.use("*", (_req, res) => {
            res.sendFile(path.resolve(distPath!, "index.html"));
          });
          log("✅ Static files ready");
        }
      } catch (error) {
        console.error("⚠️  Background initialization error:", error);
      }
    })();

  } catch (error) {
    console.error("❌ Fatal startup error:", error);
    process.exit(1);
  }
})();
