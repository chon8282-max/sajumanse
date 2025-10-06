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

// WebView 환경 감지
const isWebView = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('wv') || // Android WebView
    userAgent.includes('webview') ||
    (userAgent.includes('android') && !userAgent.includes('chrome')) ||
    /; wv\)/.test(userAgent)
  );
};

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const { toast } = useToast();

  const handleScreenShare = async () => {
    console.log('Screen share button clicked');
    
    try {
      // 네비게이션 바 제외하고 캡처
      const element = document.body;
      
      // html2canvas로 화면 캡처
      const canvas = await html2canvas(element, {
        allowTaint: false, // WebView 호환성 향상
        useCORS: true,
        scale: 2, // 고화질
        logging: true, // 디버깅용
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      console.log('Canvas captured successfully');

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
              // 공유 실패 시 다운로드로 fallback
              console.error('Share failed:', error);
              downloadImage(canvas, true); // 공유 실패 플래그 전달
            }
          }
        } else {
          // Web Share API를 지원하지 않는 경우 다운로드
          downloadImage(canvas, false);
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

  const downloadImage = (canvas: HTMLCanvasElement, isShareFailed: boolean = false) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `사주명식_${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = dataUrl;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        toast({
          title: isShareFailed ? "이미지 다운로드됨" : "다운로드 완료",
          description: isShareFailed 
            ? "다운로드된 이미지를 갤러리에서 직접 공유하세요." 
            : "화면이 이미지로 저장되었습니다."
        });
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "다운로드 실패",
        description: "이미지를 저장할 수 없습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
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
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Tab ${tab.id} touched`);
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
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Screen share button touched');
            handleScreenShare();
          }}
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