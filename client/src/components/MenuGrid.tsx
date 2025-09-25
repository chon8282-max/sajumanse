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

export default function MenuGrid() {
  const { toast } = useToast();

  const handleMenuClick = (menuName: string) => {
    toast({
      title: menuName,
      description: `${menuName} 기능이 준비 중입니다.`,
    });
  };

  const menuItems = [
    {
      title: "만세력",
      icon: <Calendar className="w-8 h-8" />,
      onClick: () => handleMenuClick("만세력")
    },
    {
      title: "사주불러오기",
      icon: <FileText className="w-8 h-8" />,
      onClick: () => handleMenuClick("사주불러오기")
    },
    {
      title: "지천명 유튜브",
      icon: <Youtube className="w-8 h-8" />,
      onClick: () => handleMenuClick("지천명 유튜브")
    },
    {
      title: "역학달력",
      icon: <BookOpen className="w-8 h-8" />,
      onClick: () => handleMenuClick("역학달력")
    },
    {
      title: "사주공부",
      icon: <GraduationCap className="w-8 h-8" />,
      onClick: () => handleMenuClick("사주공부")
    },
    {
      title: "오늘의 운세",
      icon: <Star className="w-8 h-8" />,
      onClick: () => handleMenuClick("오늘의 운세")
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {menuItems.map((item, index) => (
          <Card 
            key={index} 
            className="aspect-square hover-elevate cursor-pointer"
            onClick={item.onClick}
            data-testid={`menu-${item.title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-3 text-center">
              <div className="text-primary mb-2">
                {item.icon}
              </div>
              <p className="text-xs font-medium leading-tight">
                {item.title}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}