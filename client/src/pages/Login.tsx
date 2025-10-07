import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { signInWithGoogle, auth, onAuthStateChanged } from "@/lib/firebase";
import { LogIn, AlertCircle, Bug } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Login() {
  const [, setLocation] = useLocation();
  const [webViewMessage, setWebViewMessage] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // 콘솔 로그를 가로채서 화면에 표시
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugLogs(prev => [...prev, `[LOG] ${message}`].slice(-50)); // 최근 50개만 유지
    };
    
    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugLogs(prev => [...prev, `[ERROR] ${message}`].slice(-50));
    };
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLocation("/");
      }
    });

    return () => {
      console.log = originalLog;
      console.error = originalError;
      unsubscribe();
    };
  }, [setLocation]);

  const handleGoogleSignIn = async () => {
    console.log('[Login] 로그인 버튼 클릭됨');
    setWebViewMessage(null);
    
    try {
      console.log('[Login] signInWithGoogle 호출 시작');
      const result = await signInWithGoogle();
      console.log('[Login] 로그인 성공:', result);
    } catch (error) {
      console.error("[Login] Google sign-in error:", error);
      console.error("[Login] Error details:", {
        message: (error as Error).message,
        code: (error as any).code,
        stack: (error as Error).stack
      });
      
      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'WEBVIEW_EXTERNAL_BROWSER_OPENED') {
        setWebViewMessage('외부 브라우저에서 앱이 열렸습니다. 그곳에서 로그인을 진행해주세요.');
      } else if (errorMessage === 'WEBVIEW_CLIPBOARD_SUCCESS') {
        setWebViewMessage('앱 내부 브라우저에서는 로그인이 불가능합니다. URL이 클립보드에 복사되었습니다. Chrome이나 Safari에 붙여넣어 열어주세요.');
      } else if (errorMessage === 'WEBVIEW_CLIPBOARD_FAILED') {
        setWebViewMessage('앱 내부 브라우저에서는 로그인이 불가능합니다. Chrome이나 Safari 브라우저에서 직접 열어주세요.');
      } else {
        // 기타 에러 메시지 표시
        setWebViewMessage(`로그인 실패: ${errorMessage || '알 수 없는 오류'}`);
      }
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
            {webViewMessage && (
              <Alert data-testid="alert-webview-message" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="text-webview-message" className="font-medium">
                  {webViewMessage}
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
            
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowDebug(!showDebug)}
              data-testid="button-toggle-debug"
            >
              <Bug className="w-4 h-4 mr-2" />
              {showDebug ? '로그 숨기기' : '로그 보기 (개발자용)'}
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
        
        {showDebug && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">디버그 로그</CardTitle>
              <CardDescription>앱 내부 로그 정보</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded border p-4">
                <div className="space-y-1 font-mono text-xs">
                  {debugLogs.length === 0 ? (
                    <p className="text-muted-foreground">로그가 없습니다. 로그인을 시도해보세요.</p>
                  ) : (
                    debugLogs.map((log, i) => (
                      <div 
                        key={i} 
                        className={log.includes('[ERROR]') ? 'text-red-500' : 'text-foreground'}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <Button
                className="w-full mt-2"
                variant="outline"
                size="sm"
                onClick={() => setDebugLogs([])}
              >
                로그 지우기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
