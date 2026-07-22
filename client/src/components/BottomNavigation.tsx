import { Button } from "@/components/ui/button";
import { Calendar, Archive, Home, Heart, MessageCircle, Settings, CalendarDays, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ADMIN_EMAIL = "chon8282@gmail.com";

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const isAdmin = (authData as any)?.user?.email === ADMIN_EMAIL;

  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "manse", label: "만세력", icon: Calendar },
    { id: "saved", label: "불러오기", icon: Archive },
    { id: "compatibility", label: "궁합", icon: Heart },
    { id: "calendar", label: "역학달력", icon: CalendarDays },
    { id: "consult", label: "상담", icon: MessageCircle },
    ...(isAdmin ? [{ id: "admin", label: "관리자", icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t z-40 pb-safe" style={{ backgroundColor: 'hsl(var(--bottom-nav-bg))' }}>
      <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 px-1 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                if (tab.id === 'consult') {
                  window.open('https://map.naver.com/p/entry/place/11819780?c=15.00,0,0,0,dh&placePath=%2Fhome%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202606262329%26locale%3Dko%26svcName%3Dmap_pcv5', '_blank');
                  return;
                }
                onTabChange(tab.id);
              }}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          );
        })}
      </div>
      <div className="h-safe-bottom" style={{ backgroundColor: 'hsl(var(--bottom-nav-bg))' }} />
    </nav>
  );
}