// server/member-sync-routes.ts
// 회원 계정 기준 데이터 동기화 API (사주/궁합/예약 공용)
// - 공용 Neon DB의 member_sync_items 한 테이블에 kind별로 저장
// - 회원 식별: x-member-email 헤더 (prosaju.co.kr 로그인 후 앱이 전달)
// - 충돌 규칙: updated_at 최신 우선. 삭제는 tombstone(deleted=true)로 보존.
import { type Express } from "express";
import { pool } from "./db";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS member_sync_items (
     kind varchar NOT NULL,
     member_email varchar NOT NULL,
     id varchar NOT NULL,
     data jsonb,
     deleted boolean NOT NULL DEFAULT false,
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (kind, member_email, id)
   )`,
  `CREATE INDEX IF NOT EXISTS msync_email_kind_idx ON member_sync_items(member_email, kind)`,
];

const KINDS = new Set(["saju", "compat", "reservation"]);

function emailOf(req: any): string {
  const c = req.cookies?.ps_member_email;
  const cookieEmail = c ? decodeURIComponent(String(c)) : "";
  const e = String(cookieEmail || req.headers["x-member-email"] || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

export function registerMemberSyncRoutes(app: Express) {
  (async () => {
    for (const m of MIGRATIONS) {
      try { await pool.query(m); } catch (e: any) { console.error("msync 마이그레이션 경고:", e?.message); }
    }
    console.log("✅ 회원 동기화 테이블 확인/생성 완료");
  })();

  // 전체 목록 (tombstone 포함)
  app.get("/api/msync/:kind", async (req, res) => {
    try {
      const kind = req.params.kind;
      const email = emailOf(req);
      if (!KINDS.has(kind)) return res.status(400).json({ success: false, error: "kind" });
      if (!email) return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      const r = await pool.query(
        `SELECT id, data, deleted, updated_at FROM member_sync_items WHERE kind=$1 AND member_email=$2`,
        [kind, email]
      );
      res.json({ success: true, data: r.rows.map(row => ({
        id: row.id, data: row.data, deleted: row.deleted, updatedAt: new Date(row.updated_at).toISOString(),
      })) });
    } catch (e: any) {
      console.error("msync 목록 오류:", e);
      res.status(500).json({ success: false, error: "동기화 조회 실패" });
    }
  });

  // 업서트 (최신 우선)
  app.post("/api/msync/:kind", async (req, res) => {
    try {
      const kind = req.params.kind;
      const email = emailOf(req);
      if (!KINDS.has(kind)) return res.status(400).json({ success: false, error: "kind" });
      if (!email) return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      for (const it of items) {
        if (!it?.id) continue;
        const ts = it.updatedAt ? new Date(it.updatedAt) : new Date();
        await pool.query(
          `INSERT INTO member_sync_items (kind, member_email, id, data, deleted, updated_at)
           VALUES ($1,$2,$3,$4,false,$5)
           ON CONFLICT (kind, member_email, id) DO UPDATE
           SET data = EXCLUDED.data, deleted = false, updated_at = EXCLUDED.updated_at
           WHERE member_sync_items.updated_at <= EXCLUDED.updated_at`,
          [kind, email, String(it.id), JSON.stringify(it.data ?? null), ts]
        );
      }
      res.json({ success: true, count: items.length });
    } catch (e: any) {
      console.error("msync 업서트 오류:", e);
      res.status(500).json({ success: false, error: "동기화 저장 실패" });
    }
  });

  // 삭제 (tombstone)
  app.post("/api/msync/:kind/delete", async (req, res) => {
    try {
      const kind = req.params.kind;
      const email = emailOf(req);
      if (!KINDS.has(kind)) return res.status(400).json({ success: false, error: "kind" });
      if (!email) return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
      for (const id of ids) {
        await pool.query(
          `INSERT INTO member_sync_items (kind, member_email, id, data, deleted, updated_at)
           VALUES ($1,$2,$3,NULL,true,now())
           ON CONFLICT (kind, member_email, id) DO UPDATE
           SET deleted = true, data = NULL, updated_at = now()`,
          [kind, email, id]
        );
      }
      res.json({ success: true, count: ids.length });
    } catch (e: any) {
      console.error("msync 삭제 오류:", e);
      res.status(500).json({ success: false, error: "동기화 삭제 실패" });
    }
  });

  console.log("✅ 회원 동기화 API 등록 완료 (/api/msync/*)");
}
