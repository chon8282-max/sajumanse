// client/src/lib/reservation-alarms.ts
// 예약 알람. 설정만 되고 실제로 울리지 않던 것을 울리게 합니다.
//
// 지금 방식: 앱이 켜져 있는 동안(화면을 보고 있지 않아도 앱이 살아 있으면) 시간을 지켜보다가
// 알람 시각이 되면 휴대폰 알림을 띄웁니다. 앱을 닫아둔 사이에 지나간 알람은
// 다음에 앱을 열 때 "놓친 알람"으로 한 번 보여줍니다.
// (앱을 완전히 닫아둔 상태에서도 울리게 하려면 서버 푸시가 필요합니다 — 웹 푸시 인증서 필요)

export interface AlarmReservation {
  id: string;
  title: string;
  date: string;            // "YYYY-MM-DD"
  time: string;            // "HH:MM"
  content?: string | null;
  alarms?: { id: string; timing: string }[];
}

/** 알람 설정값 → 예약 시각으로부터 몇 분 전인지 */
export const ALARM_MINUTES: Record<string, number> = {
  "1min": 1,
  "10min": 10,
  "30min": 30,
  "1hour": 60,
  "1day": 60 * 24,
  "3day": 60 * 24 * 3,
};

export const ALARM_LABEL: Record<string, string> = {
  "1min": "1분 전",
  "10min": "10분 전",
  "30min": "30분 전",
  "1hour": "1시간 전",
  "1day": "1일 전",
  "3day": "3일 전",
};

// 앱을 닫아둔 사이 지나간 알람을 언제까지 "놓친 알람"으로 알려줄지.
// 너무 길면 며칠 전 알람이 무더기로 뜨고, 너무 짧으면 놓칩니다.
export const MISSED_WINDOW_MS = 6 * 60 * 60 * 1000; // 6시간

/** 예약 날짜+시각을 하나의 시각으로. 형식이 이상하면 null. */
export function reservationTime(r: AlarmReservation): Date | null {
  if (!r?.date || !r?.time) return null;
  const m = String(r.time).match(/^(\d{1,2}):(\d{2})/);
  const d = String(r.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !d) return null;
  const dt = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(m[1]), Number(m[2]), 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export interface DueAlarm {
  key: string;          // 이미 울린 알람인지 가리는 표식
  reservationId: string;
  title: string;
  timing: string;
  fireAt: Date;
  reservedAt: Date;
  missed: boolean;      // 앱이 꺼져 있는 사이 지나간 알람인지
}

/**
 * 지금 울려야 할 알람을 골라냅니다.
 *
 * 규칙:
 *  - 알람 시각이 지났고
 *  - 예약 시각이 아직 지나지 않았거나 지난 지 1시간 이내이며
 *  - 알람 시각이 지난 지 6시간을 넘지 않았고 (오래된 알람이 무더기로 뜨는 것 방지)
 *  - 아직 울린 적이 없는 것
 */
export function findDueAlarms(
  reservations: AlarmReservation[],
  fired: Record<string, number>,
  now: Date = new Date(),
): DueAlarm[] {
  const out: DueAlarm[] = [];
  for (const r of reservations || []) {
    const reservedAt = reservationTime(r);
    if (!reservedAt) continue;
    // 이미 한참 지난 예약은 알릴 필요가 없습니다.
    if (now.getTime() - reservedAt.getTime() > 60 * 60 * 1000) continue;

    for (const a of r.alarms || []) {
      const mins = ALARM_MINUTES[a.timing];
      if (mins == null) continue;
      const fireAt = new Date(reservedAt.getTime() - mins * 60 * 1000);
      const late = now.getTime() - fireAt.getTime();
      if (late < 0) continue;                 // 아직 때가 아님
      if (late > MISSED_WINDOW_MS) continue;  // 너무 오래 지난 것은 건너뜀

      const key = `${r.id}:${a.id}`;
      if (fired[key]) continue;               // 이미 울렸음

      out.push({
        key,
        reservationId: r.id,
        title: r.title || "예약",
        timing: a.timing,
        fireAt,
        reservedAt,
        missed: late > 90 * 1000, // 1분 30초 넘게 지났으면 앱이 꺼져 있던 것으로 봅니다
      });
    }
  }
  // 예약이 임박한 순서대로
  out.sort((a, b) => a.reservedAt.getTime() - b.reservedAt.getTime());
  return out;
}

/** 알림에 띄울 문구 */
export function alarmMessage(d: DueAlarm): { title: string; body: string } {
  const hh = String(d.reservedAt.getHours()).padStart(2, "0");
  const mm = String(d.reservedAt.getMinutes()).padStart(2, "0");
  const when = `${d.reservedAt.getMonth() + 1}월 ${d.reservedAt.getDate()}일 ${hh}:${mm}`;
  const label = ALARM_LABEL[d.timing] || d.timing;
  return {
    title: d.missed ? `놓친 알람 · ${d.title}` : `${label} · ${d.title}`,
    body: `${when} 예약${d.missed ? " (지난 알람입니다)" : ""}`,
  };
}

// ── 울린 알람 기록 (같은 알람이 반복해서 뜨지 않게) ──
const FIRED_KEY = "reservation_alarm_fired";

export function loadFired(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveFired(fired: Record<string, number>) {
  try {
    // 오래된 기록은 정리합니다(30일).
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const trimmed: Record<string, number> = {};
    for (const [k, v] of Object.entries(fired)) if (v > cutoff) trimmed[k] = v;
    localStorage.setItem(FIRED_KEY, JSON.stringify(trimmed));
  } catch { /* 저장 실패해도 알람 동작 자체는 막지 않습니다 */ }
}

/** 휴대폰 알림 띄우기. 서비스워커가 있으면 그쪽으로(앱 아이콘과 함께 뜹니다). */
export async function showAlarmNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const opts: NotificationOptions = {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    requireInteraction: false,
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return true;
    }
  } catch { /* 아래 기본 방식으로 넘어갑니다 */ }
  try {
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

// base64(url) 공개키 → 브라우저가 요구하는 형식으로
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * 이 기기를 서버에 등록합니다. 등록해두면 앱을 꺼둬도 알람이 옵니다.
 * (알림 권한을 허용한 뒤에 부릅니다)
 */
export async function registerPushDevice(): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "이 기기는 앱을 꺼둔 상태의 알람을 지원하지 않습니다." };
  }
  try {
    const r = await fetch("/api/push/public-key");
    const { key } = await r.json();
    if (!key) return { ok: false, reason: "서버에 푸시 키가 아직 설정되지 않았습니다." };

    const reg = await navigator.serviceWorker.ready;
    // 이미 구독돼 있으면 그대로 쓰고, 없으면 새로 만듭니다.
    const sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, reason: d.error || "기기 등록에 실패했습니다." };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "기기 등록 중 오류가 났습니다." };
  }
}

/** 알림 권한 요청 (반드시 버튼 누름 같은 사용자 동작 안에서 불러야 합니다) */
export async function requestAlarmPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
