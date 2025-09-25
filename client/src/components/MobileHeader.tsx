import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Moon, Sun, Calendar, Settings, User } from "lucide-react";
import { format } from "date-fns";

interface MobileHeaderProps {
  currentDate: Date;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onMenuClick: () => void;
  userName?: string;
}

export default function MobileHeader({ 
  currentDate, 
  isDarkMode, 
  onThemeToggle, 
  onMenuClick,
  userName = "사용자"
}: MobileHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
    console.log('User menu toggled');
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between p-4">
        {/* 좌측: 메뉴 버튼 */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMenuClick}
          data-testid="button-menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* 중앙: 앱 제목과 날짜 */}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold font-serif flex items-center justify-center gap-2" data-testid="text-app-title">
            <img src="/attached_assets/image_1758813815618.png" alt="지천명 로고" className="w-8 h-8" />
            지천명 만세력
          </h1>
        </div>

        {/* 우측: 사용자 메뉴와 테마 토글 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            data-testid="button-theme-toggle"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUserClick}
              data-testid="button-user-menu"
            >
              <User className="w-5 h-5" />
            </Button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border rounded-md shadow-md p-2 z-50">
                <div className="p-2 border-b border-border">
                  <p className="font-medium text-sm" data-testid="text-user-name">{userName}</p>
                  <p className="text-xs text-muted-foreground">환영합니다!</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start mt-2"
                  onClick={handleSettingsClick}
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  설정
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}