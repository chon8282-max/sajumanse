import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Star, BookOpen, Home } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", label: "홈", icon: Home },
  { id: "manse", label: "만세력", icon: Calendar },
  { id: "fortune", label: "운세", icon: Star },
  { id: "study", label: "학습", icon: BookOpen },
  { id: "profile", label: "내정보", icon: User }
];

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t z-40">
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
                console.log(`Tab ${tab.id} clicked`);
                onTabChange(tab.id);
              }}
              data-testid={`button-tab-${tab.id}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === "fortune" && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 w-2 h-2 p-0 text-xs"
                    data-testid="badge-fortune-notification"
                  />
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          );
        })}
      </div>
      
      {/* Safe area for devices with home indicator */}
      <div className="h-safe-bottom bg-background/95" />
    </nav>
  );
}