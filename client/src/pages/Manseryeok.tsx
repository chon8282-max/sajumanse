import { useState } from "react";
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
      description: "생년월일과 시간을 입력하여 사주를 확인하세요",
      icon: Calendar,
      color: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      id: "compatibility",
      title: "궁합사주 입력",
      description: "두 사람의 사주 궁합을 확인해보세요",
      icon: Users,
      color: "bg-pink-50 dark:bg-pink-950",
      borderColor: "border-pink-200 dark:border-pink-800",
    },
    {
      id: "birth-from-saju",
      title: "팔자로 생일 입력",
      description: "사주 팔자로부터 생일을 역산해보세요",
      icon: Calculator,
      color: "bg-green-50 dark:bg-green-950",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      id: "saved-saju",
      title: "저장사주 불러오기",
      description: "이전에 저장한 사주 정보를 불러오세요",
      icon: Database,
      color: "bg-purple-50 dark:bg-purple-950",
      borderColor: "border-purple-200 dark:border-purple-800",
    },
  ];

  const handleMenuClick = (menuId: string) => {
    // 각 메뉴에 따라 다른 동작 수행
    console.log(`만세력 메뉴 클릭: ${menuId}`);
    // 향후 구현: 각 메뉴에 맞는 페이지나 모달로 이동
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBackToHome}
          data-testid="button-back-home"
          className="hover-elevate active-elevate-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">만세력</h1>
          <p className="text-sm text-muted-foreground">전통 사주 만세력 서비스</p>
        </div>
      </div>

      {/* 메뉴 그리드 */}
      <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
        {menuItems.map((item) => (
          <Card 
            key={item.id}
            className={`${item.color} ${item.borderColor} border-2 hover-elevate active-elevate-2 cursor-pointer transition-all duration-200`}
            onClick={() => handleMenuClick(item.id)}
            data-testid={`card-manseryeok-${item.id}`}
          >
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="p-2 rounded-lg bg-background/50">
                <item.icon className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg text-foreground">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {item.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          만세력의 모든 기능을 이용하여 정확한 사주를 확인하세요
        </p>
      </div>
    </div>
  );
}