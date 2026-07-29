// server/push-routes.ts
// 예약 알람을 앱이 꺼져 있어도 받게 해주는 웹 푸시.
//
// 흐름:
//   1) 손님이 예약 화면에서 "알람 켜기" → 브라우저가 구독 정보를 만들고 여기에 저장
//   2) 1분마다 외부(Cloud Scheduler)가 /api/push/alarm-tick 을 두드림
//   3) 그때 알람 시각이 된 예약을 찾아 그 회원의 기기로 푸시를 보냄
//
// 서버가 스스로 시계를 돌리지 않는 이유: Cloud Run은 접속이 없으면 잠들기 때문에
// 안에서 돌리는 타이머는 믿을 수 없습니다. 그래서 밖에서 깨워주는 방식을 씁니다.
import { type Express, type Request } from "express";
import webpush from "web-push";
import { pool } from "./db";

const MIGRATIONS = [
  // 기기별 푸시 구독 정보. 한 회원이 여러 기기를 쓸 수 있습니다.
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
     endpoint text PRIMARY KEY,
     member_email varchar NOT NULL,
     p256dh text NOT NULL,
     auth text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     last_ok_at timestamptz
   )`,
  `CREATE INDEX IF NOT EXISTS push_sub_email_idx ON push_subscriptions(member_email)`,
  // 이미 보낸 알람은 다시 보내지 않기 위한 기록.
  `CREATE TABLE IF NOT EXISTS reservation_alarm_sent (
     member_email varchar NOT NULL,
     alarm_key varchar NOT NULL,
     sent_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (member_email, alarm_key)
   )`,
];

// 예약 시각으로부터 몇 분 전인지
const ALARM_MINUTES: Record<string, number> = {
  "1min": 1, "10min": 10, "30min": 30, "1hour": 60, "1day": 60 * 24, "3day": 60 * 24 * 3,
};
const ALARM_LABEL: Record<string, string> = {
  "1min": "1분 전", "10min": "10분 전", "30min": "30분 전",
  "1hour": "1시간 전", "1day": "1일 전", "3day": "3일 전",
};

// 알람 시각이 지난 지 이만큼 넘으면 보내지 않습니다(서버가 한동안 멈췄다가 살아나도
// 며칠 전 알람이 무더기로 날아가지 않게).
const LATE_LIMIT_MS = 2 * 60 * 60 * 1000; // 2시간

// 한국 시간 기준으로 예약 시각을 계산합니다.
// (예약은 "2026-07-29" "14:00" 처럼 시간대 없이 저장되고, 손님도 서버도 한국 기준입니다)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function reservationTimeUtc(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const t = /^(\d{1,2}):(\d{2})/.exec(String(time || ""));
  if (!d || !t) return null;
  const asUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2], 0, 0);
  return new Date(asUtc - KST_OFFSET_MS); // 한국시각 → 실제 시각
}

function vapidReady(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:chon8282@gmail.com", pub, priv);
  return true;
}

function memberEmailOf(req: Request): string {
  const c = (req as any).cookies?.ps_member_email;
  const cookieEmail = c ? decodeURIComponent(String(c)) : "";
  const e = String(cookieEmail || req.headers["x-member-email"] || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

export function registerPushRoutes(app: Express) {
  let ready = false;
  const init = (async () => {
    for (const sql of MIGRATIONS) {
      try { await pool.query(sql); } catch (e: any) { console.error("[push] 표 만들기 실패:", e?.message); }
    }
    ready = true;
  })();

  // 브라우저가 구독할 때 필요한 공개키
  app.get("/api/push/public-key", (_req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
  });

  // 기기 등록
  app.post("/api/push/subscribe", async (req, res) => {
    await init;
    const email = memberEmailOf(req);
    if (!email) return res.status(401).json({ error: "회원 로그인이 필요합니다." });
    const sub = req.body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "구독 정보가 올바르지 않습니다." });
    try {
      await pool.query(
        `INSERT INTO push_subscriptions (endpoint, member_email, p256dh, auth)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (endpoint) DO UPDATE SET member_email = EXCLUDED.member_email,
           p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
        [endpoint, email, p256dh, auth]
      );
      console.log(`[push] 기기 등록: ${email}`);
      res.json({ success: true });
    } catch (e: any) {
      console.error("[push] 구독 저장 실패:", e?.message);
      res.status(500).json({ error: "알람 등록에 실패했습니다." });
    }
  });

  // 기기 해제
  app.post("/api/push/unsubscribe", async (req, res) => {
    await init;
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ error: "endpoint가 없습니다." });
    try {
      await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "해제 실패" });
    }
  });

  // ── 알람 확인·발송 (밖에서 1분마다 두드립니다) ──
  app.post("/api/push/alarm-tick", async (req, res) => {
    await init;
    // 아무나 두드리지 못하게 약속된 열쇠를 확인합니다.
    const secret = process.env.ALARM_TICK_SECRET;
    if (secret && req.headers["x-alarm-secret"] !== secret) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (!vapidReady()) return res.status(503).json({ error: "푸시 키가 설정되지 않았습니다." });

    const now = new Date();
    let checked = 0, sent = 0, cleaned = 0;
    try {
      // 알람이 걸린 예약만 훑습니다. (지난 예약은 볼 필요가 없어 날짜로 한 번 걸러냅니다)
      const since = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { rows } = await pool.query(
        `SELECT member_email, data FROM member_sync_items
          WHERE kind='reservation' AND NOT deleted
            AND data->>'date' >= $1`, [since]
      );

      for (const row of rows) {
        const r = row.data || {};
        const at = reservationTimeUtc(r.date, r.time);
        if (!at) continue;
        checked++;
        // 예약 시각이 1시간 넘게 지났으면 이제 알릴 필요가 없습니다.
        if (now.getTime() - at.getTime() > 60 * 60 * 1000) continue;

        for (const a of r.alarms || []) {
          const mins = ALARM_MINUTES[a?.timing];
          if (mins == null) continue;
          const fireAt = at.getTime() - mins * 60 * 1000;
          const late = now.getTime() - fireAt;
          if (late < 0 || late > LATE_LIMIT_MS) continue;

          const key = `${r.id}:${a.id}`;
          // 이미 보냈으면 건너뜁니다. (넣기가 성공한 경우에만 처음 보내는 것)
          const ins = await pool.query(
            `INSERT INTO reservation_alarm_sent (member_email, alarm_key) VALUES ($1,$2)
             ON CONFLICT DO NOTHING RETURNING 1`, [row.member_email, key]
          );
          if (ins.rowCount === 0) continue;

          const kst = new Date(at.getTime() + KST_OFFSET_MS);
          const title = `${ALARM_LABEL[a.timing] || a.timing} · ${r.title || "예약"}`;
          const body = `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")} 예약`;
          sent += await sendToMember(row.member_email, { title, body, tag: key });
        }
      }
      res.json({ ok: true, checked, sent, cleaned });
    } catch (e: any) {
      console.error("[push] 알람 처리 실패:", e?.message);
      res.status(500).json({ error: "알람 처리 중 오류" });
    }
  });

  /** 한 회원의 모든 기기로 보냅니다. 끊긴 기기는 정리합니다. */
  async function sendToMember(email: string, payload: { title: string; body: string; tag: string }): Promise<number> {
    const { rows } = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE member_email = $1`, [email]
    );
    let ok = 0;
    for (const s of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        ok++;
        await pool.query(`UPDATE push_subscriptions SET last_ok_at = now() WHERE endpoint = $1`, [s.endpoint]);
      } catch (e: any) {
        // 410/404 = 손님이 앱을 지웠거나 구독이 만료된 기기 → 지웁니다.
        const code = e?.statusCode;
        if (code === 404 || code === 410) {
          await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [s.endpoint]);
          console.log(`[push] 끊긴 기기 정리: ${email}`);
        } else {
          console.error(`[push] 발송 실패(${code}):`, e?.message);
        }
      }
    }
    return ok;
  }

  // 원장님이 직접 눌러 확인할 수 있는 시험 발송
  app.post("/api/push/test", async (req, res) => {
    await init;
    const email = memberEmailOf(req);
    if (!email) return res.status(401).json({ error: "회원 로그인이 필요합니다." });
    if (!vapidReady()) return res.status(503).json({ error: "푸시 키가 설정되지 않았습니다." });
    const n = await sendToMember(email, {
      title: "알람 시험", body: "이렇게 알림이 옵니다.", tag: "test-" + Date.now(),
    });
    res.json({ success: n > 0, sentTo: n });
  });
}
