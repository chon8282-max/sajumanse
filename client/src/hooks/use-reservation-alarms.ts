// client/src/hooks/use-reservation-alarms.ts
// 앱이 살아 있는 동안 예약 알람 시각을 지켜보다가 알림을 띄웁니다.
// 앱 어디에 있든 동작하도록 App 최상단에 한 번만 걸어둡니다.
import { useEffect, useRef } from "react";
import {
  findDueAlarms, loadFired, saveFired, alarmMessage, showAlarmNotification,
  type AlarmReservation,
} from "@/lib/reservation-alarms";

const CHECK_MS = 30 * 1000; // 30초마다 확인 (1분 전 알람도 놓치지 않을 간격)

export function useReservationAlarms(onFallback?: (title: string, body: string) => void) {
  // 확인 도중에 또 확인이 겹치지 않게 하는 빗장
  const busy = useRef(false);
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (stopped || busy.current) return;
      // 알림 권한이 없으면 서버를 부를 이유가 없습니다(배터리·트래픽 낭비 방지).
      const canNotify = typeof Notification !== "undefined" && Notification.permission === "granted";
      if (!canNotify && !fallbackRef.current) return;
      busy.current = true;
      try {
        const res = await fetch("/api/reservations");
        if (!res.ok) return;
        const json = await res.json();
        const list: AlarmReservation[] = json?.data || [];

        const fired = loadFired();
        const due = findDueAlarms(list, fired);
        if (due.length === 0) return;

        for (const d of due) {
          const { title, body } = alarmMessage(d);
          const shown = await showAlarmNotification(title, body, d.key);
          if (!shown) fallbackRef.current?.(title, body);
          fired[d.key] = Date.now();
        }
        saveFired(fired);
      } catch {
        // 통신이 잠깐 끊겨도 다음 차례에 다시 봅니다.
      } finally {
        busy.current = false;
      }
    };

    check();
    const timer = setInterval(check, CHECK_MS);
    // 앱을 다시 열었을 때(화면 복귀) 바로 확인해 놓친 알람을 알려줍니다.
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
}
