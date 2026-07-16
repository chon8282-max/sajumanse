import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { FontProvider } from "@/contexts/FontContext";
import { AuthProvider } from "@/contexts/AuthContext";
import MobileHeader from "@/components/MobileHeader";
import MobileMenu from "@/components/MobileMenu";
import BottomNavigation from "@/components/BottomNavigation";
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
import InstallGuide from "@/pages/InstallGuide";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import CacheClear from "@/pages/CacheClear";
import Admin from "@/pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/install" component={InstallGuide} />
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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location, setLocation] = useLocation();

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const backPressedRef = useRef(false); // 뒤로가기 두 번 감지용

  // PWA 로그인: URL에서 auth_token 감지하고 세션 생성
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');

    if (authToken) {
      console.log('🔑 Auth token detected, exchanging for session...');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      fetch('/api/auth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ authToken })
      })
        .then(res => {
          if (res.ok) {
            console.log('✅ Token exchange successful');
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
    const timer = setTimeout(hideLoadingScreen, 200);
    return () => clearTimeout(timer);
  }, []);

  // PWA/TWA 뒤로가기 처리: 홈 화면에서 뒤로가기 두 번 누르면 앱 종료
  useEffect(() => {
    if (location === "/") {
      window.history.pushState(null, '', window.location.pathname);
    }

    const handlePopState = () => {
      if (location !== "/") return;

      if (backPressedRef.current) {
        window.removeEventListener('popstate', handlePopState);
        window.history.back();
        return;
      }

      backPressedRef.current = true;
      toast({ title: "한 번 더 누르면 종료됩니다", duration: 2000 });
      window.history.pushState(null, '', window.location.pathname);

      setTimeout(() => {
        backPressedRef.current = false;
      }, 2000);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location, toast]);

  const handleMenuClick = () => {
    setShowMobileMenu(!showMobileMenu);
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
      if (touchStartX.current > 30) return;

      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const diffX = touchCurrentX - touchStartX.current;
      const diffY = touchCurrentY - touchStartY.current;

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
      case 'calendar':
        setLocation('/calendar');
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
  }, [location]);

  const isCompatibilityPage = location === "/compatibility";

  return (
    <div className="flex h-screen flex-col bg-background font-sans">
      {isCompatibilityPage ? (
        <Router />
      ) : (
        <>
          {location === "/" && (
            <MobileHeader
              currentDate={new Date()}
              isDarkMode={theme === "dark"}
              onThemeToggle={toggleTheme}
              onMenuClick={handleMenuClick}
            />
          )}

          <main className="flex-1 min-h-0 pb-20 overflow-y-auto">
            <Router />
          </main>
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </>
      )}

      {!isCompatibilityPage && location === "/" && (
        <MobileMenu
          isOpen={showMobileMenu}
          onClose={handleCloseMenu}
        />
      )}

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