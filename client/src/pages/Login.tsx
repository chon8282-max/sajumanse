import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { signInWithGoogle, auth, onAuthStateChanged } from "@/lib/firebase";
import { LogIn, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const [, setLocation] = useLocation();
  const [webViewMessage, setWebViewMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLocation("/");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setLocation]);

  const handleGoogleSignIn = async () => {
    setWebViewMessage(null);
    
    try {
      await signInWithGoogle();
    } catch (error) {
      
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
