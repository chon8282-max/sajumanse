import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Calculator, Database, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Manseryeok() {
  const [, setLocation] = useLocation();

  const handleBackToHome = () => {
    setLocation("/");
  };

  const menuItems = [
    {
      id: "new-birth",
      title: "새 생년월일 입력",
      description: "생년월일과 시간을 입력하세요.",
      icon: Calendar,
      color: "bg-blue-100 dark:bg-blue-900/50",
      borderColor: "border-blue-300 dark:border-blue-700",
      textColor: "text-blue-800 dark:text-blue-200",
      descriptionColor: "text-blue-800/70 dark:text-blue-200/70",
    },
    {
      id: "compatibility",
      title: "궁합사주 입력",
      description: "두 사람의 사주 궁합을 확인해보세요",
      icon: Users,
      color: "bg-pink-100 dark:bg-pink-900/50",
      borderColor: "border-pink-300 dark:border-pink-700",
      textColor: "text-pink-800 dark:text-pink-200",
      descriptionColor: "text-pink-800/70 dark:text-pink-200/70",
    },
    {
      id: "birth-from-saju",
      title: "팔자로 생일 입력",
      description: "사주 팔자로부터 생일을 역산해보세요",
      icon: Calculator,
      color: "bg-green-100 dark:bg-green-900/50",
      borderColor: "border-green-300 dark:border-green-700",
      textColor: "text-green-800 dark:text-green-200",
      descriptionColor: "text-green-800/70 dark:text-green-200/70",
    },
    {
      id: "saved-saju",
      title: "저장사주 불러오기",
      description: "이전에 저장한 사주 정보를 불러오세요",
      icon: Database,
      color: "bg-purple-100 dark:bg-purple-900/50",
      borderColor: "border-purple-300 dark:border-purple-700",
      textColor: "text-purple-800 dark:text-purple-200",
      descriptionColor: "text-purple-800/70 dark:text-purple-200/70",
    },
  ];

  const handleMenuClick = (menuId: string) => {
    console.log(`만세력 메뉴 클릭: ${menuId}`);
    
    switch (menuId) {
      case "new-birth":
        setLocation("/saju-input");
        break;
      case "compatibility":
        setLocation("/compatibility");
        break;
      case "birth-from-saju":
        setLocation("/ganji-input");
        break;
      case "saved-saju":
        setLocation("/saju-list");
        break;
      default:
        console.log("알 수 없는 메뉴:", menuId);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="mb-6 relative">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackToHome}
              data-testid="button-back-home"
              className="hover-elevate active-elevate-2 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">홈</span>
            </Button>
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-xl font-bold text-foreground">만세력</h1>
            </div>
            <div className="w-[60px]"></div> {/* 균형을 위한 투명한 공간 */}
          </div>
        </div>

        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-1 gap-4">
        {menuItems.map((item) => (
          <Card 
            key={item.id}
            className={`${item.color} ${item.borderColor} border-2 hover-elevate active-elevate-2 cursor-pointer transition-all duration-200`}
            onClick={() => handleMenuClick(item.id)}
            data-testid={`card-manseryeok-${item.id}`}
          >
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 py-4">
              <div className="p-3 rounded-lg bg-white/80 dark:bg-black/20 flex items-center justify-center min-h-[48px]">
                <item.icon className={`h-6 w-6 ${item.textColor}`} />
              </div>
              <div className="flex-1 flex flex-col justify-center min-h-[48px]">
                <CardTitle className={`text-lg font-semibold ${item.textColor} leading-6`}>
                  {item.title}
                </CardTitle>
                <CardDescription className={`text-sm ${item.descriptionColor} leading-5`}>
                  {item.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}