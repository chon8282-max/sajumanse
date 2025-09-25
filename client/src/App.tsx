import { useState, useEffect, useRef } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import MobileHeader from "@/components/MobileHeader";
import BottomNavigation from "@/components/BottomNavigation";
import Home from "@/pages/Home";
import Exit from "@/pages/Exit";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/exit" component={Exit} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { toast } = useToast();
  
  // 뒤로가기 버튼 두 번 눌러 종료 기능
  const backPressedOnce = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuClick = () => {
    setShowMobileMenu(!showMobileMenu);
    console.log('Mobile menu toggled');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log(`Navigation changed to: ${tab}`);
  };

  // 뒤로가기 이벤트 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 현재 홈 페이지이거나 루트 경로에 있을 때만 종료 로직 실행
      if (window.location.pathname === "/" || window.location.pathname === "/home") {
        event.preventDefault();
        
        if (backPressedOnce.current) {
          // 두 번째 뒤로가기: 종료 페이지로 이동
          window.location.href = '/exit';
          return;
        }

        // 첫 번째 뒤로가기: 경고 메시지 표시
        backPressedOnce.current = true;
        
        // 현재 위치를 다시 히스토리에 추가해서 뒤로가기를 방지
        history.pushState(null, "", window.location.pathname);
        
        toast({
          title: "앱 종료",
          description: "한 번 더 뒤로가기를 누르면 앱이 종료됩니다.",
          duration: 2000,
        });

        // 2초 후 초기화
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          backPressedOnce.current = false;
        }, 2000);
      }
    };

    // 현재 위치를 히스토리에 추가하여 뒤로가기 이벤트를 감지할 수 있게 함
    history.pushState(null, "", window.location.pathname);
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [toast]);

  // 키보드 이벤트로도 뒤로가기 감지 (안드로이드 하드웨어 뒤로가기 버튼)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 안드로이드 하드웨어 뒤로가기 버튼 (keyCode 4)
      if (event.key === 'GoBack' || event.keyCode === 4) {
        event.preventDefault();
        
        if (backPressedOnce.current) {
          // 두 번째 뒤로가기: 종료 페이지로 이동
          window.location.href = '/exit';
          return;
        }

        // 첫 번째 뒤로가기: 경고 메시지 표시
        backPressedOnce.current = true;
        
        toast({
          title: "앱 종료",
          description: "한 번 더 뒤로가기를 누르면 앱이 종료됩니다.",
          duration: 2000,
        });

        // 2초 후 초기화
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          backPressedOnce.current = false;
        }, 2000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <MobileHeader
        currentDate={new Date()}
        isDarkMode={theme === "dark"}
        onThemeToggle={toggleTheme}
        onMenuClick={handleMenuClick}
        userName="만세력 사용자"
      />
      
      <main className="pb-20"> {/* 하단 네비게이션 공간 */}
        <Router />
      </main>

      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
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
