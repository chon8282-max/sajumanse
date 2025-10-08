import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { pool } from "./db";

const app = express();

// Trust all proxies for secure cookies behind Replit multi-hop proxy
app.set("trust proxy", true);

// Session secret 검증
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set. Please add it to your environment variables.");
}

// 환경 감지: Replit 도메인 감지 (개발/배포 모두 HTTPS 사용)
const isReplit = !!process.env.REPLIT_DOMAINS;

console.log(`🔒 Session cookie mode: ${isReplit ? 'REPLIT (secure:true, sameSite:none)' : 'LOCALHOST (secure:false, sameSite:lax)'}`);

// Session store 설정
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true, // 배포 환경에서 자동 생성
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust upstream proxy for secure cookies
    cookie: {
      secure: isReplit, // Replit은 HTTPS, localhost는 HTTP
      httpOnly: true,
      sameSite: isReplit ? "none" : "lax", // Replit: 크로스 사이트 OAuth, localhost: lax
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Production: serve static files from dist/public
    // Try multiple path resolution strategies for Replit deployment
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
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
