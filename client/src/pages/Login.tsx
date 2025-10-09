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
    if (isStandalone) {
      // PWA standalone 모드: 새 탭에서 OAuth 진행 (Google 정책 준수)
      const authUrl = `${window.location.origin}/api/auth/login`;
      
      try {
        // 새 탭 열기 (사용자 클릭에 직접 반응해야 팝업 차단 방지)
        const authWindow = window.open(authUrl, 'oauth-login', 'width=500,height=700');
        
        if (!authWindow) {
          // 팝업 차단됨
          toast({
            title: "팝업이 차단되었습니다",
            description: "브라우저 설정에서 팝업을 허용해주세요.",
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
        
        toast({
          title: "로그인 창이 열렸습니다",
          description: "새 창에서 Google 로그인을 진행하세요.",
          duration: 3000,
        });
      } catch (error) {
        console.error('OAuth window open error:', error);
        toast({
          title: "로그인 실패",
          description: "로그인 창을 열 수 없습니다.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else {
      // 일반 브라우저: 현재 창에서 리다이렉트
      window.location.href = '/api/auth/login';
    }
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
                  <strong>앱 내 브라우저에서는 로그인할 수 없습니다</strong><br/>
                  Google 보안 정책상 제한됩니다.<br/><br/>
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
                  <strong>PWA 앱 모드 로그인:</strong><br/>
                  버튼 클릭 시 새 창에서 Google 로그인이 진행됩니다.<br/>
                  로그인 후 창이 자동으로 닫히고 앱으로 돌아옵니다.
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              className="w-full"
              size="lg"
              onClick={handleGoogleSignIn}
              data-testid="button-google-signin"
              disabled={isEmbedded && !isStandalone}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Google로 로그인
            </Button>
            
            {isEmbedded && !isStandalone && (
              <p className="text-xs text-center text-muted-foreground">
                시스템 브라우저(Chrome/Safari)로 이동 후 로그인하세요
              </p>
            )}
            
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
