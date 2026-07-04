import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { LogIn, Copy, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Embedded browser 감지 함수
function isEmbeddedBrowser(): boolean {
  const ua = navigator.userAgent || navigator.vendor;

  const embeddedBrowsers = [
    'Instagram',
    'FBAN', 'FBAV',        // Facebook
    'LinkedIn',
    'Twitter',
    'Line/',
    'Messenger',
    'KAKAOTALK',          // KakaoTalk
    'wv'                   // WebView indicator
  ];

  return embeddedBrowsers.some(browser => ua.includes(browser));
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isStandalone] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone
  );
  const [isEmbedded] = useState(() => isEmbeddedBrowser());

  // 중복 클릭/터치 방지 (onClick과 onTouchEnd가 겹쳐서 두 번 실행되는 것을 막음)
  const isSigningInRef = useRef(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // postMessage로 OAuth 성공 메시지 받기 (새 탭에서 로그인 완료 시)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // origin 검증
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'auth_success') {
        // 로그인 성공 시 사용자 정보 다시 가져오기
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // PWA 모드에서 시스템 브라우저로 로그인 후 돌아왔을 때 감지 (fallback)
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone;

    if (standalone) {
      // PWA가 포커스될 때마다 로그인 상태 재확인
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  // 로그인 시도 (중복 요청 방지가 핵심)
  const handleGoogleSignIn = () => {
    // 이미 로그인 시도 중이면 무시 (터치/클릭 중복 발생으로 인한
    // /api/auth/login 중복 호출 -> 서버 state 쿠키 덮어쓰기 -> 로그인 실패 방지)
    if (isSigningInRef.current) return;
    isSigningInRef.current = true;
    setIsSigningIn(true);

    window.location.href = '/api/auth/login';

    // 혹시 페이지 이동이 지연되거나 실패하는 경우를 대비한 안전장치
    setTimeout(() => {
      isSigningInRef.current = false;
      setIsSigningIn(false);
    }, 4000);
  };

  const handleCopyUrl = async () => {
    const loginUrl = `${window.location.origin}/api/auth/login`;

    // clipboard API 시도
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(loginUrl);
        toast({
          title: "URL 복사 완료 ✓",
          description: "Chrome, Safari 등 시스템 브라우저에 붙여넣고 로그인하세요.",
          duration: 4000,
        });
        return;
      } catch (error) {
        // clipboard 실패 - fallback으로 진행
      }
    }

    // clipboard 미지원 또는 실패 시: 선택 가능한 텍스트로 표시
    const urlDisplay = document.createElement('div');
    urlDisplay.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: white; padding: 20px; border-radius: 12px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 9999; max-width: 90%;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: #1f2937;">로그인 URL</p>
        <input type="text" value="${loginUrl}" readonly 
               style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #3b82f6; 
                      border-radius: 6px; background: #f3f4f6; font-family: monospace;" />
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">
          길게 눌러 복사 → 시스템 브라우저에 붙여넣기
        </p>
      </div>
    `;

    document.body.appendChild(urlDisplay);
    const input = urlDisplay.querySelector('input') as HTMLInputElement;
    input.focus();
    input.select();

    // 10초 후 또는 클릭 시 제거
    const removeDisplay = () => {
      if (document.body.contains(urlDisplay)) {
        document.body.removeChild(urlDisplay);
      }
    };

    setTimeout(removeDisplay, 10000);
    urlDisplay.addEventListener('click', removeDisplay);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>
              Google 계정으로 로그인하여 데이터를 백업하고 불러올 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PWA 또는 Embedded browser 경고 */}
            {(isStandalone || isEmbedded) && (
              <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Google 보안 정책 제한</strong><br/>
                  {isStandalone ? 'PWA 앱' : '앱 내 브라우저'}에서는 직접 로그인할 수 없습니다.<br/><br/>
                  <strong>로그인 방법:</strong><br/>
                  1. 아래 "로그인 URL 복사" 버튼 클릭<br/>
                  2. Chrome, Safari 등 시스템 브라우저 열기<br/>
                  3. 주소창에 붙여넣고 Google 로그인<br/>
                  4. 로그인 완료 후 이 앱으로 돌아오기
                </AlertDescription>
              </Alert>
            )}

            {/* 일반 브라우저용 로그인 버튼 */}
            {!isStandalone && !isEmbedded && (
              <Button
                className="w-full"
                size="lg"
                disabled={isSigningIn}
                onClick={handleGoogleSignIn}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleGoogleSignIn();
                }}
                data-testid="button-google-signin"
              >
                <LogIn className="w-5 h-5 mr-2" />
                {isSigningIn ? "이동 중..." : "Google로 로그인"}
              </Button>
            )}

            {/* PWA/Embedded용 URL 복사 버튼 */}
            {(isStandalone || isEmbedded) && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleCopyUrl}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleCopyUrl();
                }}
                data-testid="button-copy-login-url"
              >
                <Copy className="w-5 h-5 mr-2" />
                로그인 URL 복사
              </Button>
            )}

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setLocation("/");
                }}
                data-testid="button-back-home"
              >
                홈으로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
