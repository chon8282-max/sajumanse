// server/session-routes.ts
// 동시접속 방지: 회원 이메일당 "현재 세션 1개"만 유효.
// 다른 기기에서 로그인하면 새 session_id로 덮어써지고, 먼저 있던 기기는 조회 시 불일치 → 로그아웃.
import { type Express } from "express";
import { pool } from "./db";
import crypto from "crypto";

const MIGRATION =
  `CREATE TABLE IF NOT EXISTS member_sessions (
     member_email varchar PRIMARY KEY,
     session_id varchar NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`;

function emailOf(req: any): string {
  const c = req.cookies?.ps_member_email;
  const cookieEmail = c ? decodeURIComponent(String(c)) : "";
  const e = String(cookieEmail || req.headers["x-member-email"] || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

export function registerSessionRoutes(app: Express) {
  (async () => {
    try { await pool.query(MIGRATION); console.log("✅ 세션 테이블 확인/생성 완료"); }
    catch (e: any) { console.error("세션 테이블 생성 경고:", e?.message); }
  })();

  // 로그인 시 현재 기기를 활성 세션으로 등록 (기존 세션 덮어씀)
  app.post("/api/session/claim", async (req, res) => {
    try {
      const email = emailOf(req);
      if (!email) return res.status(401).json({ success: false });
      let sid = String(req.body?.sessionId || "").slice(0, 64);
      if (!sid) sid = crypto.randomBytes(12).toString("hex");
      await pool.query(
        `INSERT INTO member_sessions (member_email, session_id, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (member_email) DO UPDATE SET session_id = EXCLUDED.session_id, updated_at = now()`,
        [email, sid]
      );
      res.json({ success: true, sessionId: sid });
    } catch (e: any) {
      console.error("세션 등록 오류:", e?.message);
      res.status(500).json({ success: false });
    }
  });

  // 현재 활성 세션 조회 (내 sessionId와 다르면 다른 기기가 로그인한 것)
  app.get("/api/session/current", async (req, res) => {
    try {
      const email = emailOf(req);
      if (!email) return res.json({ success: false, sessionId: null });
      const r = await pool.query(`SELECT session_id FROM member_sessions WHERE member_email = $1`, [email]);
      res.json({ success: true, sessionId: r.rows[0]?.session_id || null });
    } catch (e: any) {
      console.error("세션 조회 오류:", e?.message);
      res.json({ success: false, sessionId: null });
    }
  });

  console.log("✅ 세션 API 등록 완료 (/api/session/*)");
}
