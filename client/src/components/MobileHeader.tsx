import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Moon, Sun, Calendar, Settings, User as UserIcon, LogOut } from "lucide-react";
import { format } from "date-fns";
import logoPath from "@assets/만세력로고_1758875108140.png";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleUserClick = () => {
    if (!isAuthenticated && !isLoading) {
      // 로그인하지 않은 경우 로그인 페이지로 이동
      window.location.href = '/api/login';
    } else {
      // 로그인한 경우 메뉴 토글
      setShowUserMenu(!showUserMenu);
      console.log('User menu toggled');
    }
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
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
              className="w-4 h-4 dark:invert"
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

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUserClick}
              data-testid="button-user-menu"
              className="h-8 w-8"
            >
              <UserIcon className="w-4 h-4" />
            </Button>
            
            {showUserMenu && isAuthenticated && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border rounded-md shadow-md p-2 z-50">
                <div className="p-2 border-b border-border">
                  <p className="font-medium text-sm" data-testid="text-user-name">
                    {(user as User)?.firstName || (user as User)?.email || '사용자'}
                  </p>
                  <p className="text-xs text-muted-foreground">환영합니다!</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start mt-2"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}