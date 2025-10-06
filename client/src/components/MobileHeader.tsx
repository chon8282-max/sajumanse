import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Moon, Sun, Calendar, Settings, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { format } from "date-fns";
import logoPath from "@assets/만세력로고_1758875108140.png";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle, signOut } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleAuthClick = async () => {
    console.log('[MobileHeader] Auth button clicked');
    console.log('[MobileHeader] Current state - user:', user?.email || 'none', 'loading:', loading, 'isAuthenticated:', isAuthenticated);
    
    // 로딩 중이면 아무것도 하지 않음
    if (loading) {
      console.log('[MobileHeader] Still loading, ignoring click');
      return;
    }
    
    // 로그인 상태면 로그아웃
    if (isAuthenticated && user) {
      console.log('[MobileHeader] Attempting logout for user:', user.email);
      try {
        await signOut();
        toast({
          title: "로그아웃 완료",
          description: "정상적으로 로그아웃되었습니다.",
          duration: 3000
        });
      } catch (error) {
        console.error('[MobileHeader] Logout error:', error);
        toast({
          title: "로그아웃 실패",
          description: "로그아웃 중 오류가 발생했습니다.",
          variant: "destructive",
          duration: 3000
        });
      }
    } 
    // 로그인 안된 상태면 로그인
    else {
      console.log('[MobileHeader] Attempting login');
      try {
        await signInWithGoogle();
        // 리다이렉트가 시작되면 이 코드는 실행되지 않음
      } catch (error: any) {
        console.error('[MobileHeader] Login error:', error);
        if (error.message && error.message.includes('WebView')) {
          // WebView 환경에서는 이미 alert로 안내했으므로 추가 toast 불필요
        } else {
          toast({
            title: "로그인 실패",
            description: "로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
            variant: "destructive",
            duration: 3000
          });
        }
      }
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
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[MobileHeader] Menu button touched');
            onMenuClick();
          }}
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
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[MobileHeader] Theme button touched');
              onThemeToggle();
            }}
            data-testid="button-theme-toggle"
            className="h-8 w-8"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleAuthClick}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[MobileHeader] Auth button touched');
              handleAuthClick();
            }}
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