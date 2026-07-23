// client/src/lib/platform.ts
// 앱이 어떤 환경(웹/안드로이드 TWA/iOS Capacitor 앱)에서 실행 중인지 확인하는 헬퍼.
// 안드로이드는 TWA(웹뷰를 그대로 감싸는 방식)라서 별도 표시가 없고,
// iOS는 Capacitor로 감싸서 만들 예정이라 window.Capacitor가 주입됩니다.
// → 이 값으로 "iOS 앱에서만 숨기기" 같은 분기를 안전하게 처리할 수 있습니다.

export function isIOSApp(): boolean {
  try {
    const cap = (window as any).Capacitor;
    return !!cap && typeof cap.getPlatform === "function" && cap.getPlatform() === "ios";
  } catch {
    return false;
  }
}
