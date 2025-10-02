import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import MobileHeader from "@/components/MobileHeader";
import MobileMenu from "@/components/MobileMenu";
import BottomNavigation from "@/components/BottomNavigation";
import Home from "@/pages/Home";
import Exit from "@/pages/Exit";
import Manseryeok from "@/pages/Manseryeok";
import Calendar from "@/pages/Calendar";
import SajuInput from "@/pages/SajuInput";
import NotFound from "@/pages/not-found";
import SajuResult from "@/pages/SajuResult";
import SajuList from "@/pages/SajuList";
import Guide from "@/pages/Guide";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/manseryeok" component={Manseryeok} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/saju-input" component={SajuInput} />
      <Route path="/saju-result/:id" component={SajuResult} />
      <Route path="/saju-list" component={SajuList} />
      <Route path="/guide" component={Guide} />
      <Route path="/exit" component={Exit} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const previousLocation = useRef<string>("");
  const justCameFromOtherPage = useRef(false);

  const handleMenuClick = () => {
    setShowMobileMenu(!showMobileMenu);
    console.log('Mobile menu toggled');
  };

  const handleCloseMenu = () => {
    setShowMobileMenu(false);
  };

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
        toast({
          title: "궁합 서비스",
          description: "궁합 페이지는 현재 준비 중입니다.",
          duration: 2000,
        });
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

  // 위치 변경 시 페이지 전환 감지
  useEffect(() => {
    // 이전 위치가 홈이 아닌 곳에서 홈으로 온 경우
    const cameFromOtherPage = previousLocation.current !== "" && 
                              previousLocation.current !== "/" && 
                              previousLocation.current !== "/home" &&
                              (location === "/" || location === "/home");
    
    if (cameFromOtherPage) {
      // 다른 페이지에서 홈으로 온 경우, pushState를 건너뛰도록 플래그 설정
      justCameFromOtherPage.current = true;
      
      // 잠깐 후 플래그 초기화
      setTimeout(() => {
        justCameFromOtherPage.current = false;
      }, 100);
    }
    
    // 이전 위치 업데이트
    previousLocation.current = location;
  }, [location]);

  // 종료 처리 함수
  const handleExit = () => {
    window.location.href = '/exit';
  };

  // 뒤로가기 이벤트 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 현재 홈 페이지이거나 루트 경로에 있을 때만 종료 로직 실행
      if (window.location.pathname === "/" || window.location.pathname === "/home") {
        event.preventDefault();
        
        // 현재 위치를 다시 히스토리에 추가해서 뒤로가기를 방지
        history.pushState(null, "", window.location.pathname);
        
        // 종료 확인 대화상자 표시
        setShowExitDialog(true);
      }
    };

    // 현재 위치를 히스토리에 추가하여 뒤로가기 이벤트를 감지할 수 있게 함
    // 단, 다른 페이지에서 방금 온 경우에는 건너뛰기
    if (!justCameFromOtherPage.current) {
      history.pushState(null, "", window.location.pathname);
    }
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 키보드 이벤트로도 뒤로가기 감지 (안드로이드 하드웨어 뒤로가기 버튼)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 안드로이드 하드웨어 뒤로가기 버튼 (keyCode 4)
      if ((event.key === 'GoBack' || event.keyCode === 4) && 
          (window.location.pathname === "/" || window.location.pathname === "/home")) {
        event.preventDefault();
        
        // 종료 확인 대화상자 표시
        setShowExitDialog(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* 메인 페이지에만 상단 헤더 표시 */}
      {location === "/" && (
        <MobileHeader
          currentDate={new Date()}
          isDarkMode={theme === "dark"}
          onThemeToggle={toggleTheme}
          onMenuClick={handleMenuClick}
          userName="만세력 사용자"
        />
      )}
      
      <main className="pb-20"> {/* 하단 네비게이션 공간 */}
        <Router />
      </main>

      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* 메인 페이지에만 모바일 메뉴 표시 */}
      {location === "/" && (
        <MobileMenu 
          isOpen={showMobileMenu}
          onClose={handleCloseMenu}
        />
      )}
      
      {/* 종료 확인 대화상자 */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-lg font-bold">지천명 만세력 종료</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              앱을 종료 하겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-center">
            <AlertDialogCancel 
              className="flex-1"
              data-testid="button-exit-cancel"
            >
              아니오
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExit}
              className="flex-1"
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
          <AppContent />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
