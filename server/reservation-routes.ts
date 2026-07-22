// server/reservation-routes.ts
// 예약(스케줄) API — 서버 로컬 JSON 파일에 저장.
// 나중에 DB(drizzle)로 교체해도 API 형식이 같아 클라이언트 수정이 필요 없습니다.
import { type Express } from "express";
import fs from "fs";
import path from "path";
import { pool } from "./db";

interface ReservationAlarm {
  id: string;
  timing: string; // '10min' | '30min' | '1hour' | '1day' | '3day'
}

interface Reservation {
  id: string;
  title: string;
  date: string;      // "2026-07-06"
  time: string;      // "14:30"
  phone: string;     // 손님 전화번호
  content: string | null;
  amount: number;
  alarms: ReservationAlarm[];
  createdAt: string;
  updatedAt: string;
}

// 저장 파일 위치: 프로젝트 루트의 data/reservations.json
const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "reservations.json");

function loadAll(): Reservation[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Reservation[];
  } catch (e) {
    console.error("예약 데이터 읽기 실패:", e);
    return [];
  }
}

function saveAll(list: Reservation[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── 회원 계정 클라우드 동기화 (Neon member_sync_items, kind='reservation') ──
function memberEmailOf(req: any): string {
  const c = req.cookies?.ps_member_email;
  const cookieEmail = c ? decodeURIComponent(String(c)) : "";
  const e = String(cookieEmail || req.headers["x-member-email"] || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

async function cloudUpsert(email: string, r: Reservation) {
  try {
    await pool.query(
      `INSERT INTO member_sync_items (kind, member_email, id, data, deleted, updated_at)
       VALUES ('reservation',$1,$2,$3,false,$4)
       ON CONFLICT (kind, member_email, id) DO UPDATE
       SET data = EXCLUDED.data, deleted = false, updated_at = EXCLUDED.updated_at
       WHERE member_sync_items.updated_at <= EXCLUDED.updated_at`,
      [email, r.id, JSON.stringify(r), new Date(r.updatedAt || Date.now())]
    );
  } catch (e: any) { console.error("예약 클라우드 저장 경고:", e?.message); }
}

async function cloudDelete(email: string, id: string) {
  try {
    await pool.query(
      `INSERT INTO member_sync_items (kind, member_email, id, data, deleted, updated_at)
       VALUES ('reservation',$1,$2,NULL,true,now())
       ON CONFLICT (kind, member_email, id) DO UPDATE
       SET deleted = true, data = NULL, updated_at = now()`,
      [email, id]
    );
  } catch (e: any) { console.error("예약 클라우드 삭제 경고:", e?.message); }
}

// 클라우드와 로컬 파일을 병합(최신 우선), 파일 갱신 + 누락분 업로드
async function mergeWithCloud(email: string): Promise<Reservation[]> {
  const local = loadAll();
  let rows: any[] = [];
  try {
    const r = await pool.query(
      `SELECT id, data, deleted, updated_at FROM member_sync_items WHERE kind='reservation' AND member_email=$1`,
      [email]
    );
    rows = r.rows;
  } catch (e: any) {
    console.error("예약 클라우드 조회 경고(오프라인?):", e?.message);
    return local; // 오프라인이면 로컬 그대로
  }
  const byId = new Map<string, Reservation>();
  for (const l of local) byId.set(l.id, l);
  const cloudIds = new Set<string>();
  for (const row of rows) {
    cloudIds.add(row.id);
    const cloudTs = new Date(row.updated_at).getTime();
    const l = byId.get(row.id);
    const localTs = l ? new Date(l.updatedAt || 0).getTime() : -1;
    if (row.deleted) {
      if (l && cloudTs >= localTs) byId.delete(row.id);
      else if (l && localTs > cloudTs) await cloudUpsert(email, l); // 로컬이 더 최신(복구)
    } else if (!l || cloudTs > localTs) {
      if (row.data) byId.set(row.id, row.data as Reservation);
    } else if (l && localTs > cloudTs) {
      await cloudUpsert(email, l);
    }
  }
  // 클라우드에 없는 로컬 항목 업로드
  for (const [id, l] of Array.from(byId.entries())) {
    if (!cloudIds.has(id)) await cloudUpsert(email, l);
  }
  const merged = Array.from(byId.values());
  saveAll(merged);
  return merged;
}

export function registerReservationRoutes(app: Express) {
  // 목록 조회 (?start=YYYY-MM-DD&end=YYYY-MM-DD 선택)
  app.get("/api/reservations", async (req, res) => {
    const { start, end } = req.query as { start?: string; end?: string };
    const email = memberEmailOf(req);
    let list = email ? await mergeWithCloud(email) : loadAll();
    if (start) list = list.filter(r => r.date >= start);
    if (end) list = list.filter(r => r.date <= end);
    list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    res.json({ success: true, data: list });
  });

  // 등록
  app.post("/api/reservations", (req, res) => {
    const { title, date, time, content, phone, amount, alarms } = req.body || {};
    if (!title || !date) {
      return res.status(400).json({ success: false, error: "제목과 날짜는 필수입니다." });
    }
    const now = new Date().toISOString();
    const item: Reservation = {
      id: newId("rsv"),
      title: String(title),
      date: String(date),
      time: String(time || "10:00"),
      phone: phone ? String(phone) : "",
      content: content ? String(content) : null,
      amount: Number(amount) || 0,
      alarms: Array.isArray(alarms)
        ? alarms.map((t: string) => ({ id: newId("alm"), timing: String(t) }))
        : [],
      createdAt: now,
      updatedAt: now,
    };
    const list = loadAll();
    list.push(item);
    saveAll(list);
    const email = memberEmailOf(req);
    if (email) cloudUpsert(email, item);
    res.json({ success: true, data: item });
  });

  // 수정
  app.put("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    const { title, date, time, content, phone, amount, alarms } = req.body || {};
    const list = loadAll();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "예약을 찾을 수 없습니다." });
    }
    const prev = list[idx];
    const updated: Reservation = {
      ...prev,
      title: title !== undefined ? String(title) : prev.title,
      date: date !== undefined ? String(date) : prev.date,
      time: time !== undefined ? String(time) : prev.time,
      phone: phone !== undefined ? String(phone) : (prev.phone || ""),
      content: content !== undefined ? (content ? String(content) : null) : prev.content,
      amount: amount !== undefined ? (Number(amount) || 0) : prev.amount,
      alarms: Array.isArray(alarms)
        ? alarms.map((t: string) => ({ id: newId("alm"), timing: String(t) }))
        : prev.alarms,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    saveAll(list);
    const email = memberEmailOf(req);
    if (email) cloudUpsert(email, updated);
    res.json({ success: true, data: updated });
  });

  // 삭제
  app.delete("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    const list = loadAll();
    const newList = list.filter(r => r.id !== id);
    if (newList.length === list.length) {
      return res.status(404).json({ success: false, error: "예약을 찾을 수 없습니다." });
    }
    saveAll(newList);
    const email = memberEmailOf(req);
    if (email) cloudDelete(email, id);
    res.json({ success: true });
  });

  console.log("✅ 예약 API 등록 완료 (/api/reservations)");
}
