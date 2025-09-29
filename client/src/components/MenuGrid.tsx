import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  Youtube, 
  BookOpen, 
  GraduationCap, 
  Star 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function MenuGrid() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleMenuClick = (menuName: string) => {
    if (menuName === "만세력") {
      setLocation("/manseryeok");
    } else if (menuName === "사주불러오기") {
      setLocation("/saju-list");
    } else if (menuName === "역학달력") {
      setLocation("/calendar");
    } else {
      toast({
        title: menuName,
        description: `${menuName} 기능이 준비 중입니다.`,
      });
    }
  };

  const menuItems = [
    {
      title: "만세력",
      icon: <Calendar className="w-8 h-8" />,
      backgroundColor: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      onClick: () => handleMenuClick("만세력")
    },
    {
      title: "사주불러오기",
      icon: <FileText className="w-8 h-8" />,
      backgroundColor: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      onClick: () => handleMenuClick("사주불러오기")
    },
    {
      title: "지선당 유튜브",
      icon: <Youtube className="w-8 h-8" />,
      backgroundColor: "bg-teal-100 dark:bg-teal-900/20",
      iconColor: "text-teal-600 dark:text-teal-400",
      onClick: () => handleMenuClick("지선당 유튜브")
    },
    {
      title: "역학달력",
      icon: <BookOpen className="w-8 h-8" />,
      backgroundColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      onClick: () => handleMenuClick("역학달력")
    },
    {
      title: "사주공부",
      icon: <GraduationCap className="w-8 h-8" />,
      backgroundColor: "bg-yellow-100 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      onClick: () => handleMenuClick("사주공부")
    },
    {
      title: "오늘의 운세",
      icon: <Star className="w-8 h-8" />,
      backgroundColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      onClick: () => handleMenuClick("오늘의 운세")
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {menuItems.map((item, index) => (
          <div
            key={index} 
            className={`cursor-pointer rounded-xl p-4 ${item.backgroundColor} flex flex-col items-center justify-center text-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 border border-white/50 dark:border-white/10`}
            style={{ 
              aspectRatio: '1 / 0.8',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
            }}
            onClick={item.onClick}
            data-testid={`menu-${item.title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <div className={`${item.iconColor} mb-2 drop-shadow-sm`}>
              {item.icon}
            </div>
            <p className="text-sm font-medium leading-tight text-gray-800 dark:text-gray-200 drop-shadow-sm">
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}