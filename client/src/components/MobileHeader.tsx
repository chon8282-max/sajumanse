import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Moon, Sun, Calendar, Settings, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { format } from "date-fns";
import logoPath from "@assets/만세력로고_1758875108140.png";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle, signOut } from "@/lib/firebase";

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
  const { user, loading, isAuthenticated } = useAuth();

  const handleAuthClick = async () => {
    if (!isAuthenticated && !loading) {
      signInWithGoogle();
    } else if (isAuthenticated) {
      await signOut();
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

          <Button
            variant="ghost"
            size="icon"
            onClick={handleAuthClick}
            data-testid="button-auth"
            className={`h-8 w-8 ${
              isAuthenticated 
                ? 'text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isAuthenticated ? (
              <LogOut className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}