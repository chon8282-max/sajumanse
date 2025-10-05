import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { signInWithGoogle, auth, onAuthStateChanged } from "@/lib/firebase";
import { LogIn } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLocation("/");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>
            Google 계정으로 로그인하여 데이터를 백업하고 불러올 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
  );
}
