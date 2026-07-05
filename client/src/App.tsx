import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { FontProvider } from "@/contexts/FontContext";
import { AuthProvider } from "@/contexts/AuthContext";
import MobileHeader from "@/components/MobileHeader";
import MobileMenu from "@/components/MobileMenu";
import BottomNavigation from "@/components/BottomNavigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Home from "@/pages/Home";
import Manseryeok from "@/pages/Manseryeok";
import Calendar from "@/pages/Calendar";
import SajuInput from "@/pages/SajuInput";
import NotFound from "@/pages/not-found";
import SajuResult from "@/pages/SajuResult";
import SajuList from "@/pages/SajuList";
import Guide from "@/pages/Guide";
import Compatibility from "@/pages/Compatibility";
import GanjiInput from "@/pages/GanjiInput";
import GanjiResult from "@/pages/GanjiResult";
import Announcements from "@/pages/Announcements";
import AnnouncementDetail from "@/pages/AnnouncementDetail";
import AnnouncementAdmin from "@/pages/AnnouncementAdmin";
import Login from "@/pages/Login";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import CacheClear from "@/pages/CacheClear";
import Admin from "@/pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/manseryeok" component={Manseryeok} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/saju-input" component={SajuInput} />
      <Route path="/saju-result/:id" component={SajuResult} />
      <Route path="/saju-list" component={SajuList} />
      <Route path="/guide" component={Guide} />
      <Route path="/compatibility" component={Compatibility} />
      <Route path="/ganji-input" component={GanjiInput} />
      <Route path="/ganji-result" component={GanjiResult} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/announcements/:id" component={AnnouncementDetail} />
      <Route path="/announcement-admin" component={AnnouncementAdmin} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/cache-clear" component={CacheClear} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const [showMobileMenu, setShowMobileMenu] = useState(false); // 메뉴 기본값: 닫힘
  const [showExitDialog, setShowExitDialog] = useState(false); // 종료 확인 다이얼로그
  const [location, setLocation] = useLocation();
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // PWA 로그인: URL에서 auth_token 감지하고 세션 생성
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');
    
    if (authToken) {
      console.log('🔑 Auth token detected, exchanging for session...');
      
      // URL에서 토큰 제거
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // 토큰을 세션으로 교환
      fetch('/api/auth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ authToken })
      })
        .then(res => {
          if (res.ok) {
            console.log('✅ Token exchange successful');
            // react-query 캐시 타이밍 문제를 완전히 피하기 위해
            // 캐시 무효화 대신 페이지를 통째로 새로고침 (쿠키는 이미 저장되어 있어 자동 반영됨)
            window.location.href = '/';
          } else {
            console.error('Token exchange failed:', res.status);
          }
        })
        .catch(err => {
          console.error('❌ Token exchange error:', err);
        });
    }
  }, []);

  // React 렌더링 완료 후 로딩 화면 숨기기
  useEffect(() => {
    const hideLoadingScreen = () => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 300);
      }
    };
    
    // 첫 렌더링 후 약간의 지연을 두고 로딩 화면 숨김
    const timer = setTimeout(hideLoadingScreen, 200);
    return () => clearTimeout(timer);
  }, []);

  // PWA 뒤로가기 처리: 홈 화면에서 뒤로가기 시 앱 종료 확인
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (location === "/" && window.history.length <= 2) {
        // 홈 화면이고 히스토리가 거의 없으면 종료 확인 다이얼로그 표시
        setShowExitDialog(true);
        // 히스토리에 다시 추가하여 뒤로가기 방지 (다이얼로그에서 취소 시)
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    // 초기 진입 시 히스토리 상태 추가 (뒤로가기 감지용)
    if (location === "/" && window.history.state === null) {
      window.history.pushState(null, '', window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location]);

  const handleMenuClick = () => {
    setShowMobileMenu(!showMobileMenu);
    console.log('Mobile menu toggled');
  };

  const handleCloseMenu = () => {
    setShowMobileMenu(false);
  };

  // 왼쪽 가장자리에서 스와이프로 메뉴 열기
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current) return;
      
      // 왼쪽 가장자리에서 시작했는지 확인 (30px 이내)
      if (touchStartX.current > 30) return;
      
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const diffX = touchCurrentX - touchStartX.current;
      const diffY = touchCurrentY - touchStartY.current;
      
      // 오른쪽으로 50px 이상 스와이프하고, 수평 이동이 수직 이동보다 클 때
      if (diffX > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        setShowMobileMenu(true);
        touchStartX.current = 0;
        touchStartY.current = 0;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = 0;
      touchStartY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleTabChange = (tab: string) => {
    console.log(`Navigation changed to: ${tab}`);
    
    // 탭 클릭 시 해당 페이지로 이동
    switch (tab) {
      case 'home':
        setLocation('/');
        break;
      case 'manse':
        setLocation('/manseryeok');
        break;
      case 'saved':
        setLocation('/saju-list');
        break;
      case 'compatibility':
        setLocation('/compatibility');
        break;
      case 'admin':
        setLocation('/admin');
        break;
      default:
        setLocation('/');
        break;
    }
  };

  // 현재 location에 따라 activeTab 동기화
  useEffect(() => {
    if (location === '/') {
      setActiveTab('home');
    } else if (location === '/manseryeok') {
      setActiveTab('manse');
    } else if (location === '/saju-list') {
      setActiveTab('saved');
    }
    // 기타 경로는 기본값 유지
  }, [location]);

  // 궁합 페이지인지 확인
  const isCompatibilityPage = location === "/compatibility";

  return (
    <div className="flex h-screen flex-col bg-background font-sans">
      {/* 궁합 페이지는 완전 독립 */}
      {isCompatibilityPage ? (
        <Router />
      ) : (
        <>
          {/* 메인 페이지 상단 헤더 표시 */}
          {location === "/" && (
            <MobileHeader
              currentDate={new Date()}
              isDarkMode={theme === "dark"}
              onThemeToggle={toggleTheme}
              onMenuClick={handleMenuClick}
            />
          )}
          
          <main className="flex-1 flex flex-col min-h-0 pb-20 overflow-y-auto">
            <Router />
          </main>
          {/* 하단 네비게이션 표시 */}
          <BottomNavigation 
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </>
      )}

      {/* 메인 페이지일 때만 모바일 메뉴 표시 */}
      {!isCompatibilityPage && location === "/" && (
        <MobileMenu 
          isOpen={showMobileMenu}
          onClose={handleCloseMenu}
        />
      )}
      
      {/* 앱 종료 확인 다이얼로그 */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>앱을 종료하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 앱을 종료하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-exit-cancel">아니오</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                // 앱 종료 (브라우저 뒤로가기)
                window.history.back();
              }}
              data-testid="button-exit-confirm"
            >
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <FontProvider>
              <AppContent />
            </FontProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
