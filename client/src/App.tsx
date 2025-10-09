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
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location, setLocation] = useLocation();
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

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
    <div className="min-h-screen bg-background font-sans">
      {/* 궁합 페이지가 아닌 경우에만 메인 페이지 상단 헤더 표시 */}
      {!isCompatibilityPage && location === "/" && (
        <MobileHeader
          currentDate={new Date()}
          isDarkMode={theme === "dark"}
          onThemeToggle={toggleTheme}
          onMenuClick={handleMenuClick}
        />
      )}
      
      <main className={isCompatibilityPage ? "" : "pb-20"}> {/* 궁합 페이지가 아닐 때만 하단 네비게이션 공간 */}
        <Router />
      </main>

      {/* 궁합 페이지가 아닐 때만 하단 네비게이션 표시 */}
      {!isCompatibilityPage && (
        <BottomNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}

      {/* 궁합 페이지가 아니고 메인 페이지일 때만 모바일 메뉴 표시 */}
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
