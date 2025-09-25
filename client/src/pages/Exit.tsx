import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Exit() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 3초 후 자동으로 홈으로 돌아가기
    const timer = setTimeout(() => {
      setLocation("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  const handleGoBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-serif text-foreground">
              앱을 종료하시겠습니까?
            </h1>
            <p className="text-muted-foreground text-sm">
              브라우저 탭을 닫으시거나 아래 버튼을 눌러 홈으로 돌아가세요.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleGoBack}
            className="w-full"
            data-testid="button-go-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            홈으로 돌아가기
          </Button>
          
          <p className="text-xs text-muted-foreground">
            5초 후 자동으로 홈으로 이동합니다
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            만세력 앱을 이용해 주셔서 감사합니다
          </p>
        </div>
      </Card>
    </div>
  );
}