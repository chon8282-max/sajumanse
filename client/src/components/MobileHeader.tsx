import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Moon, Sun, Calendar, Settings, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import logoPath from "@assets/메인화면로고_1760616257592.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface MobileHeaderProps {
  currentDate: Date;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onMenuClick: () => void;
}

export default function MobileHeader({ 
  currentDate, 
  isDarkMode, 
  onThemeToggle, 
  onMenuClick
}: MobileHeaderProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAuthClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 로딩 중이면 아무것도 하지 않음
    if (loading) {
      return;
    }
    
    // 로그인 상태면 로그아웃
    if (isAuthenticated && user) {
      try {
        await logout();
        setLocation('/');
        toast({
          title: "로그아웃",
          description: "로그아웃되었습니다.",
          duration: 500
        });
      } catch (error) {
        toast({
          title: "로그아웃 실패",
          description: "로그아웃 중 오류가 발생했습니다.",
          variant: "destructive",
          duration: 500
        });
      }
    } 
    // 로그인 안된 상태면 로그인
    else {
      window.location.href = '/api/auth/login';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between p-2.5">
        {/* 좌측: 메뉴 버튼 */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMenuClick}
          data-testid="button-menu"
          className="h-8 w-8"
        >
          <Menu className="w-4 h-4" />
        </Button>

        {/* 중앙: 앱 제목과 날짜 */}
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold font-serif flex items-center justify-center gap-1.5" data-testid="text-app-title">
            <img 
              src={logoPath} 
              alt="만세력 로고" 
              className="w-5 h-5"
            />
            지천명 만세력
          </h1>
        </div>

        {/* 우측: 사용자 메뉴와 테마 토글 */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            data-testid="button-theme-toggle"
            className="h-8 w-8"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleAuthClick}
            disabled={loading}
            data-testid="button-auth"
            className={`h-8 px-2 ${
              isAuthenticated 
                ? 'text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400' 
                : 'text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400'
            }`}
          >
            <span className="text-xs font-medium">
              {/* 로그인 텍스트 제거 - 나중에 추가 예정 */}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}