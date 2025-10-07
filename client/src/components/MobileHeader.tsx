import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Moon, Sun, Calendar, Settings, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { format } from "date-fns";
import logoPath from "@assets/만세력아이콘1_1759804001975.png";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle, signOut } from "@/lib/firebase";
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
  const { user, loading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAuthClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[MobileHeader] ===== AUTH BUTTON CLICKED =====');
    console.log('[MobileHeader] Event:', e.type);
    console.log('[MobileHeader] Current state - user:', user?.email || 'none', 'loading:', loading, 'isAuthenticated:', isAuthenticated);
    console.log('[MobileHeader] User Agent:', navigator.userAgent);
    
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
        console.log('[MobileHeader] Logout successful');
        toast({
          title: "로그아웃",
          description: "로그아웃되었습니다.",
          duration: 500
        });
      } catch (error) {
        console.error('[MobileHeader] Logout error:', error);
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
      console.log('[MobileHeader] ===== STARTING LOGIN PROCESS =====');
      console.log('[MobileHeader] Calling signInWithGoogle...');
      try {
        const result = await signInWithGoogle();
        console.log('[MobileHeader] Login successful, result:', result);
      } catch (error: any) {
        console.error('[MobileHeader] ===== LOGIN ERROR =====');
        console.error('[MobileHeader] Error:', error);
        console.error('[MobileHeader] Error message:', error?.message);
        console.error('[MobileHeader] Error code:', error?.code);
        console.error('[MobileHeader] Error stack:', error?.stack);
        
        if (error.message === 'WEBVIEW_CLIPBOARD_SUCCESS') {
          toast({
            title: "앱에서는 로그인 불가",
            description: "Chrome이나 Safari에서 열어주세요. (주소 복사됨)",
            duration: 3000
          });
        } else if (error.message === 'WEBVIEW_CLIPBOARD_FAILED') {
          toast({
            title: "앱에서는 로그인 불가",
            description: "Chrome이나 Safari에서 열어주세요.",
            duration: 3000
          });
        } else if (error.message === 'WEBVIEW_EXTERNAL_BROWSER_OPENED') {
          toast({
            title: "외부 브라우저에서 로그인",
            description: "열린 브라우저에서 로그인을 진행해주세요.",
            duration: 3000
          });
        } else {
          toast({
            title: "로그인 실패",
            description: error?.message || "로그인 중 오류가 발생했습니다.",
            variant: "destructive",
            duration: 5000
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
            size="sm"
            onClick={handleAuthClick}
            disabled={loading}
            data-testid="button-auth"
            className={`h-8 px-2 gap-1 ${
              isAuthenticated 
                ? 'text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400' 
                : 'text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400'
            }`}
          >
            {isAuthenticated ? (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">로그아웃</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">로그인</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}