import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import TraditionalCalendar from "@/components/TraditionalCalendar";

export default function Calendar() {
  const [, setLocation] = useLocation();

  const handleGoBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-start mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleGoBack}
          className="gap-2"
          data-testid="button-back-to-home"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </Button>
      </div>

      {/* 전통 달력 컴포넌트 */}
      <div className="flex justify-center">
        <TraditionalCalendar />
      </div>
    </div>
  );
}