import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  FileText,
  Youtube,
  BookOpen,
  CalendarCheck,
  Star,
  Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { isIOSApp } from "@/lib/platform";
import { useMembership } from "@/contexts/MembershipContext";

export default function MenuGrid() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { can } = useMembership();
  // 예약은 유료 회원 전용 기능입니다. 서버가 내려준 권한을 그대로 따릅니다.
  // (앱이 등급을 스스로 계산하지 않는다는 원칙에 맞춥니다)
  const showReservation = !isIOSApp() && can('reservation');

  const handleMenuClick = (menuName: string) => {
    if (menuName === "만세력") {
      setLocation("/manseryeok");
    } else if (menuName === "사주불러오기") {
      setLocation("/saju-list");
    } else if (menuName === "역학달력") {
      setLocation("/calendar");
    } else if (menuName === "궁합") {
      setLocation("/compatibility");
    } else if (menuName === "지천명 유튜브") {
      window.open("https://www.youtube.com/@chon8282", "_blank");
    } else if (menuName === "예약") {
      setLocation("/reservation");
    } else if (menuName === "감정중인 사주") {
      const currentSajuId = sessionStorage.getItem('currentSajuId');
      if (currentSajuId) {
        setLocation(`/saju-result/${currentSajuId}`);
      } else {
        toast({
          title: "감정중인 사주 없음",
          description: "최근 감정한 사주가 없습니다.",
        });
      }
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
      icon: <Calendar style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      onClick: () => handleMenuClick("만세력")
    },
    {
      title: "사주불러오기",
      icon: <FileText style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      onClick: () => handleMenuClick("사주불러오기")
    },
    {
      title: "지천명 유튜브",
      icon: <Youtube style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-teal-100 dark:bg-teal-900/20",
      iconColor: "text-teal-600 dark:text-teal-400",
      onClick: () => handleMenuClick("지천명 유튜브")
    },
    {
      title: "역학달력",
      icon: <BookOpen style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      onClick: () => handleMenuClick("역학달력")
    },
    // 이 자리는 회원 등급에 따라 달라집니다.
    //  - 유료 회원: "예약" (예약은 유료 기능이라 무료 회원에게는 보여줘도 쓸 수 없습니다)
    //  - 무료 회원: "궁합" (전 등급이 쓸 수 있는 기능으로 칸을 채웁니다)
    // 애플 앱스토어 심사 대응으로 iOS 앱에서는 등급과 무관하게 항상 "궁합"입니다.
    ...(showReservation ? [{
      title: "예약",
      icon: <CalendarCheck style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-yellow-100 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      onClick: () => handleMenuClick("예약")
    }] : [{
      title: "궁합",
      icon: <Heart style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-pink-100 dark:bg-pink-900/20",
      iconColor: "text-pink-600 dark:text-pink-400",
      onClick: () => handleMenuClick("궁합")
    }]),
    {
      title: "감정중인 사주",
      icon: <Star style={{ width: '38.4px', height: '38.4px' }} />,
      backgroundColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      onClick: () => handleMenuClick("감정중인 사주")
    }
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
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
            <p className="font-medium leading-tight text-gray-800 dark:text-gray-200 drop-shadow-sm whitespace-nowrap" style={{ fontSize: '1.025rem' }}>
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}