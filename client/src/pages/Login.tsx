import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { LogIn, Info, Copy, ExternalLink, AlertTriangle } from "lucide-react";
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

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone;
    
    if (isStandalone) {
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

  const handleGoogleSignIn = async () => {
    // 일반 브라우저: 현재 창에서 리다이렉트
    window.location.href = '/api/auth/login';
  };

  const handleCopyUrl = async () => {
    const loginUrl = `${window.location.origin}/api/auth/login`;
    
    // clipboard API 시도
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(loginUrl);
        toast({
          title: "URL 복사 완료",
          description: "브라우저 주소창에 붙여넣고 로그인하세요.",
          duration: 3000,
        });
        return;
      } catch (error) {
        // clipboard 실패 - fallback으로 진행
      }
    }
    
    // clipboard 미지원 또는 실패 시: input 요소로 수동 복사
    const input = document.createElement('input');
    input.value = loginUrl;
    input.style.position = 'fixed';
    input.style.top = '50%';
    input.style.left = '50%';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.width = '80%';
    input.style.padding = '12px';
    input.style.fontSize = '14px';
    input.style.border = '2px solid #3b82f6';
    input.style.borderRadius = '8px';
    input.style.zIndex = '9999';
    input.style.backgroundColor = 'white';
    input.readOnly = true;
    
    document.body.appendChild(input);
    input.focus(); // 모바일 호환성 향상
    input.select();
    input.setSelectionRange(0, input.value.length);
    
    toast({
      title: "URL이 표시되었습니다",
      description: "파란색 입력창에서 URL을 복사하세요. (길게 눌러서 복사 또는 탭하여 닫기)",
      duration: 5000,
    });
    
    // 10초 후 또는 클릭/포커스 잃으면 제거 (충분한 시간 제공)
    const removeInput = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    setTimeout(removeInput, 10000);
    input.addEventListener('blur', removeInput);
    input.addEventListener('click', removeInput); // 클릭해도 닫기
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
            {/* Embedded browser 경고 (최우선) */}
            {isEmbedded && !isStandalone && (
              <Alert className="bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>현재 앱 내 브라우저를 사용 중입니다</strong><br/>
                  Google 정책상 앱 내 브라우저에서는 로그인할 수 없습니다.<br/><br/>
                  <strong>해결 방법:</strong><br/>
                  1. 화면 우측 상단 메뉴(⋯) 클릭<br/>
                  2. "Safari에서 열기" 또는 "Chrome에서 열기" 선택<br/>
                  3. 시스템 브라우저에서 로그인
                </AlertDescription>
              </Alert>
            )}
            
            {/* PWA standalone 모드 안내 */}
            {isStandalone && (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>앱 사용자 로그인 방법:</strong><br/>
                  1. "로그인 URL 복사" 버튼 클릭<br/>
                  2. 시스템 브라우저(Chrome, Safari 등) 열기<br/>
                  3. 주소창에 붙여넣고 Google 로그인<br/>
                  4. 로그인 완료 후 이 앱으로 돌아오기
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              className="w-full"
              size="lg"
              onClick={isStandalone || isEmbedded ? handleCopyUrl : handleGoogleSignIn}
              data-testid={isStandalone || isEmbedded ? "button-copy-login-url" : "button-google-signin"}
            >
              {isStandalone || isEmbedded ? (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  로그인 URL 복사
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Google로 로그인
                </>
              )}
            </Button>
            
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setLocation("/")}
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
