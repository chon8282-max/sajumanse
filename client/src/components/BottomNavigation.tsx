import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Archive, Home, Heart, Share2 } from "lucide-react";
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", label: "홈", icon: Home },
  { id: "manse", label: "만세력", icon: Calendar },
  { id: "saved", label: "불러오기", icon: Archive },
  { id: "compatibility", label: "궁합", icon: Heart }
];

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { toast } = useToast();

  const handleScreenShare = async () => {
    try {
      // 네비게이션 바 제외하고 캡처
      const element = document.body;
      
      // html2canvas로 화면 캡처
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        scale: 2, // 고화질
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      // Canvas를 Blob으로 변환 (JPEG 형식으로 변경 - 더 나은 호환성)
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({
            title: "캡처 실패",
            description: "화면을 캡처할 수 없습니다.",
            variant: "destructive"
          });
          return;
        }

        const fileName = `사주명식_${new Date().toISOString().slice(0, 10)}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        // Web Share API 지원 확인 (파일 공유 가능 여부 체크)
        let canShareFiles = false;
        try {
          // @ts-ignore - canShare may not exist in all browsers
          canShareFiles = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
        } catch (e) {
          canShareFiles = false;
        }
        
        if (canShareFiles) {
          try {
            await navigator.share({
              files: [file],
              title: '사주 명식',
              text: '사주 명식 화면 공유'
            });
            toast({
              title: "공유 완료",
              description: "화면이 성공적으로 공유되었습니다."
            });
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              // 사용자가 취소한 경우가 아니면 다운로드로 fallback
              downloadImage(canvas);
            }
          }
        } else {
          // Web Share API를 지원하지 않는 경우 다운로드
          downloadImage(canvas);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast({
        title: "오류 발생",
        description: "화면 캡처 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `사주명식_${new Date().toISOString().slice(0, 10)}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
    
    toast({
      title: "다운로드 완료",
      description: "화면이 이미지로 저장되었습니다."
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-sm border-t z-40" style={{ backgroundColor: 'hsl(var(--bottom-nav-bg))' }}>
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
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          );
        })}
        
        {/* 화면공유 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 flex flex-col items-center gap-1 h-auto py-2 px-1 text-muted-foreground hover:text-foreground"
          onClick={handleScreenShare}
          data-testid="button-screen-share"
        >
          <div className="relative">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">화면공유</span>
        </Button>
      </div>
      
      {/* Safe area for devices with home indicator */}
      <div className="h-safe-bottom" style={{ backgroundColor: 'hsl(var(--bottom-nav-bg))' }} />
    </nav>
  );
}