import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Database, 
  Download, 
  Upload, 
  Bell, 
  MessageSquare, 
  X,
  Info,
  Type
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useFont } from "@/contexts/FontContext";
import { useState, useRef, useEffect } from "react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { font, setFont } = useFont();
  const menuRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleDbBackup = () => {
    toast({
      title: "DB 백업",
      description: "데이터베이스 백업 기능이 준비 중입니다.",
    });
    onClose();
  };

  const handleDbRestore = () => {
    toast({
      title: "DB 불러오기",
      description: "데이터베이스 복원 기능이 준비 중입니다.",
    });
    onClose();
  };

  const handleNotifications = () => {
    toast({
      title: "알립니다",
      description: "공지사항을 확인해주세요.",
    });
    onClose();
  };

  const handleFeedback = () => {
    window.open("https://open.kakao.com/o/pnk7MdVh", "_blank");
    onClose();
  };

  const handleGuide = () => {
    setLocation("/guide");
    onClose();
  };

  // 스와이프 감지
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // 왼쪽으로 50px 이상 스와이프하면 닫기
      onClose();
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
        data-testid="menu-overlay"
      />
      
      {/* 사이드 메뉴 */}
      <div 
        ref={menuRef}
        className="fixed left-0 top-0 h-full w-[60%] bg-background border-r z-50 transform transition-transform duration-300 ease-in-out"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mobile-menu"
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold font-serif">메뉴</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              data-testid="button-close-menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 메뉴 항목들 */}
          <div className="flex-1 p-2 space-y-3 overflow-y-auto">
            <Card className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">도움말</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleGuide}
                  data-testid="button-guide"
                >
                  <Info className="w-4 h-4 mr-1" />
                  만세력 소개 사용법
                </Button>
              </div>
            </Card>

            <Card className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">데이터 관리</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleDbBackup}
                  data-testid="button-db-backup"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  DB백업하기
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleDbRestore}
                  data-testid="button-db-restore"
                >
                  <Download className="w-4 h-4 mr-1" />
                  DB불러오기
                </Button>
              </div>
            </Card>

            <Card className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">소통</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleNotifications}
                  data-testid="button-notifications"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  알립니다
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleFeedback}
                  data-testid="button-feedback"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  의견·오류신고
                </Button>
              </div>
            </Card>

            <Card className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">폰트 설정</h3>
              <div className="space-y-1">
                <Button
                  variant={font === 'chosungs' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('chosungs')}
                  data-testid="button-font-chosungs"
                >
                  <Type className="w-4 h-4 mr-1" />
                  조선궁서체
                </Button>
                <Button
                  variant={font === 'chosunkm' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('chosunkm')}
                  data-testid="button-font-chosunkm"
                >
                  <Type className="w-4 h-4 mr-1" />
                  조선굵은명조체
                </Button>
                <Button
                  variant={font === 'togebara' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('togebara')}
                  data-testid="button-font-togebara"
                >
                  <Type className="w-4 h-4 mr-1" />
                  토가보라체
                </Button>
                <Button
                  variant={font === 'mingti' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('mingti')}
                  data-testid="button-font-mingti"
                >
                  <Type className="w-4 h-4 mr-1" />
                  특별 명나라체
                </Button>
                <Button
                  variant={font === 'chinesemingti' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('chinesemingti')}
                  data-testid="button-font-chinesemingti"
                >
                  <Type className="w-4 h-4 mr-1" />
                  중국테밍체
                </Button>
                <Button
                  variant={font === 'chinesecalligraphy' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('chinesecalligraphy')}
                  data-testid="button-font-chinesecalligraphy"
                >
                  <Type className="w-4 h-4 mr-1" />
                  중국 필기체
                </Button>
                <Button
                  variant={font === 'chinesecalligraphy2' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('chinesecalligraphy2')}
                  data-testid="button-font-chinesecalligraphy2"
                >
                  <Type className="w-4 h-4 mr-1" />
                  중국 필기체2
                </Button>
              </div>
            </Card>
          </div>

          {/* 푸터 */}
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              지천명 만세력 v1.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}