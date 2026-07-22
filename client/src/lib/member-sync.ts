// client/src/lib/member-sync.ts
// 회원 계정 기준 사주·궁합 데이터 동기화.
// - 로그인 후 startMemberSync(email): 서버와 양방향 병합(최신 우선)
// - 이후 저장/수정/삭제는 localDB 메서드를 감싸 자동으로 서버에 반영
import { localDB } from "./saju-local-storage";

let email = "";
let patched = false;

function hdr() {
  return { "Content-Type": "application/json", "x-member-email": email };
}

async function push(kind: "saju" | "compat", id: string, data: any) {
  if (!email || !id) return;
  try {
    await fetch(`/api/msync/${kind}`, {
      method: "POST", headers: hdr(),
      body: JSON.stringify({ items: [{ id, data, updatedAt: new Date().toISOString() }] }),
    });
  } catch { /* 오프라인: 다음 로그인 동기화 때 반영됨 */ }
}

async function pushDelete(kind: "saju" | "compat", id: string) {
  if (!email || !id) return;
  try {
    await fetch(`/api/msync/${kind}/delete`, {
      method: "POST", headers: hdr(), body: JSON.stringify({ ids: [id] }),
    });
  } catch { /* 오프라인 무시 */ }
}

function ts(v: any): number {
  if (!v) return 0;
  const n = new Date(v).getTime();
  return isNaN(n) ? 0 : n;
}

async function pullMerge() {
  // 사주
  try {
    const r = await fetch("/api/msync/saju", { headers: hdr() });
    const j = await r.json();
    if (j?.success) {
      const localList: any[] = await (localDB as any).getSajuRecords();
      const localById = new Map(localList.map((x: any) => [x.id, x]));
      const cloudIds = new Set<string>();
      for (const row of j.data as any[]) {
        cloudIds.add(row.id);
        const l = localById.get(row.id);
        if (row.deleted) {
          if (l && ts(row.updatedAt) >= ts(l.updatedAt || l.createdAt)) await localDB.deleteRawSaju(row.id);
          continue;
        }
        if (!row.data) continue;
        if (!l || ts(row.updatedAt) > ts(l.updatedAt || l.createdAt)) await localDB.putRawSaju(row.data);
      }
      // 서버에 없는 로컬 기록 업로드
      for (const l of localList) {
        if (!cloudIds.has(l.id)) await push("saju", l.id, l);
      }
    }
  } catch (e) { console.warn("[sync] 사주 동기화 실패(오프라인?)", e); }

  // 궁합
  try {
    const r = await fetch("/api/msync/compat", { headers: hdr() });
    const j = await r.json();
    if (j?.success && typeof (localDB as any).getCompatibilityRecords === "function") {
      const localList: any[] = await (localDB as any).getCompatibilityRecords();
      const localById = new Map(localList.map((x: any) => [x.id, x]));
      const cloudIds = new Set<string>();
      for (const row of j.data as any[]) {
        cloudIds.add(row.id);
        const l = localById.get(row.id);
        if (row.deleted) {
          if (l && ts(row.updatedAt) >= ts(l.createdAt)) await localDB.deleteRawCompat(row.id);
          continue;
        }
        if (!row.data) continue;
        if (!l || ts(row.updatedAt) > ts(l.createdAt)) await localDB.putRawCompat(row.data);
      }
      for (const l of localList) {
        if (!cloudIds.has(l.id)) await push("compat", l.id, l);
      }
    }
  } catch (e) { console.warn("[sync] 궁합 동기화 실패(오프라인?)", e); }
}

function patchLocalDB() {
  if (patched) return;
  patched = true;
  const db: any = localDB;

  const origCreate = db.createSajuRecord.bind(db);
  db.createSajuRecord = async (data: any) => {
    const rec = await origCreate(data);
    push("saju", rec.id, rec);
    return rec;
  };
  const origUpdate = db.updateSajuRecord.bind(db);
  db.updateSajuRecord = async (id: string, data: any) => {
    const rec = await origUpdate(id, data);
    if (rec) push("saju", rec.id, rec);
    return rec;
  };
  const origDelete = db.deleteSajuRecord.bind(db);
  db.deleteSajuRecord = async (id: string) => {
    const ok = await origDelete(id);
    if (ok) pushDelete("saju", id);
    return ok;
  };
  if (typeof db.saveCompatibilityRecord === "function") {
    const origSaveC = db.saveCompatibilityRecord.bind(db);
    db.saveCompatibilityRecord = async (data: any) => {
      const rec = await origSaveC(data);
      push("compat", rec.id, rec);
      return rec;
    };
  }
  if (typeof db.deleteCompatibilityRecord === "function") {
    const origDelC = db.deleteCompatibilityRecord.bind(db);
    db.deleteCompatibilityRecord = async (id: string) => {
      const ok = await origDelC(id);
      if (ok) pushDelete("compat", id);
      return ok;
    };
  }
}

export async function syncNow(memberEmail?: string): Promise<{ ok: boolean; message: string }> {
  const e = String(memberEmail || email || "").trim().toLowerCase();
  if (!e.includes("@")) return { ok: false, message: "로그인이 필요합니다. 먼저 로그인해주세요." };
  email = e;
  patchLocalDB();
  try {
    await pullMerge();
    return { ok: true, message: "동기화가 완료되었습니다." };
  } catch (err: any) {
    return { ok: false, message: "동기화 실패: " + (err?.message || "네트워크 오류") };
  }
}

export async function startMemberSync(memberEmail: string) {
  const e = String(memberEmail || "").trim().toLowerCase();
  if (!e.includes("@")) return;
  email = e;
  patchLocalDB();
  await pullMerge();
  console.log("[sync] 회원 데이터 동기화 완료:", e);
}
