import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { LogIn, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isStandalone] = useState(() => 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone
  );

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

  const handleGoogleSignIn = () => {
    // PWA standalone 모드 감지
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone;
    
    if (isStandalone) {
      // PWA 모드: location.href로 시스템 브라우저에서 열기
      // window.open()은 여전히 PWA WebView에서 열려서 Google이 차단함
      // location.href로 이동하면 시스템 브라우저가 열리고 로그인 후 앱으로 돌아옴
      window.location.href = '/api/auth/login';
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
            {isStandalone && (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>앱 사용자 안내:</strong> 로그인 버튼을 누르면 브라우저가 열립니다. 
                  로그인 완료 후 <strong>이 앱으로 다시 돌아오면</strong> 자동으로 로그인됩니다.
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              className="w-full"
              size="lg"
              onClick={handleGoogleSignIn}
              data-testid="button-google-signin"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Google로 로그인
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
