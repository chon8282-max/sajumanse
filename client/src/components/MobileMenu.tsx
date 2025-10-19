import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Download, 
  Upload, 
  Bell, 
  MessageSquare, 
  X,
  Info,
  Type,
  RefreshCw,
  FileText,
  Scale
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useFont } from "@/contexts/FontContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef } from "react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { font, setFont } = useFont();
  const { isAuthenticated } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleDriveBackup = async () => {
    // 로그인 체크
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "Google Drive 백업은 로그인이 필요합니다.",
        variant: "destructive",
        duration: 800,
      });
      onClose();
      setLocation("/login");
      return;
    }

    try {
      toast({
        title: "백업 중...",
        description: "Google Drive에 백업하는 중입니다.",
        duration: 800,
      });

      const response = await fetch('/api/backup/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "백업 완료",
          description: "Google Drive에 성공적으로 백업되었습니다.",
          duration: 800,
        });
      } else {
        throw new Error(result.error || '백업 실패');
      }
    } catch (error) {
      toast({
        title: "백업 실패",
        description: error instanceof Error ? error.message : "Google Drive 백업 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 800,
      });
    }
    onClose();
  };

  const handleDriveRestore = async () => {
    // 로그인 체크
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "Google Drive 복원은 로그인이 필요합니다.",
        variant: "destructive",
        duration: 800,
      });
      onClose();
      setLocation("/login");
      return;
    }

    try {
      toast({
        title: "불러오는 중...",
        description: "Google Drive에서 백업 파일을 불러오는 중입니다.",
        duration: 800,
      });

      const listResponse = await fetch('/api/backup/drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const listResult = await listResponse.json();
      
      if (!listResponse.ok || !listResult.files || listResult.files.length === 0) {
        toast({
          title: "백업 파일 없음",
          description: "Google Drive에 백업 파일이 없습니다.",
          duration: 800,
        });
        onClose();
        return;
      }

      const latestFile = listResult.files[0];

      const downloadResponse = await fetch('/api/backup/drive/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: latestFile.id }),
      });

      const downloadResult = await downloadResponse.json();
      
      if (!downloadResponse.ok) {
        throw new Error(downloadResult.error || '다운로드 실패');
      }

      const backupData = typeof downloadResult.data === 'string' 
        ? JSON.parse(downloadResult.data) 
        : downloadResult.data;

      const importResponse = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      });

      const importResult = await importResponse.json();
      
      if (importResponse.ok) {
        toast({
          title: "복원 완료",
          description: importResult.message || `${importResult.sajuRecordsCount}개의 사주 기록을 복원했습니다.`,
          duration: 800,
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error(importResult.error || '복원 실패');
      }
    } catch (error) {
      toast({
        title: "복원 실패",
        description: error instanceof Error ? error.message : "Google Drive 복원 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 800,
      });
    }
    onClose();
  };

  const handleNotifications = () => {
    setLocation("/announcements");
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

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart - touchEnd > 50) {
      // 왼쪽으로 50px 이상 스와이프하면 닫기
      e.stopPropagation();
      onClose();
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-40"
      data-testid="menu-overlay-wrapper"
    >
      {/* 배경 오버레이 - 클릭/터치로 닫기 */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onTouchStart={(e) => {
          // 배경 터치 시 즉시 닫기 (버튼보다 먼저 처리되지 않도록)
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        data-testid="menu-overlay"
      />
      
      {/* 사이드 메뉴 - 클릭 전파 중단 */}
      <div 
        ref={menuRef}
        className="absolute left-0 top-0 h-full w-[60%] bg-background border-r z-10 transform transition-transform duration-300 ease-in-out overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          e.stopPropagation();
          handleTouchStart(e);
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          handleTouchMove(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          handleTouchEnd(e);
        }}
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
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              data-testid="button-close-menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 메뉴 항목들 */}
          <div 
            className="flex-1 p-2 space-y-3 overflow-y-auto overscroll-contain"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <Card className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">도움말</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleGuide}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGuide();
                  }}
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
                  onClick={handleDriveBackup}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDriveBackup();
                  }}
                  data-testid="button-db-backup"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  DB백업하기
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleDriveRestore}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDriveRestore();
                  }}
                  data-testid="button-db-restore"
                >
                  <Download className="w-4 h-4 mr-1" />
                  DB가져오기
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
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNotifications();
                  }}
                  data-testid="button-notifications"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  알립니다
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleFeedback}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFeedback();
                  }}
                  data-testid="button-feedback"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  의견·오류신고
                </Button>
              </div>
            </Card>

            <Card className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">약관</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={() => {
                    setLocation("/privacy-policy");
                    onClose();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLocation("/privacy-policy");
                    onClose();
                  }}
                  data-testid="button-privacy-policy"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  개인정보 처리방침
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={() => {
                    setLocation("/terms-of-service");
                    onClose();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLocation("/terms-of-service");
                    onClose();
                  }}
                  data-testid="button-terms-of-service"
                >
                  <Scale className="w-4 h-4 mr-1" />
                  서비스 이용약관
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
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFont('chosungs');
                  }}
                  data-testid="button-font-chosungs"
                >
                  <Type className="w-4 h-4 mr-1" />
                  조선궁서체
                </Button>
                <Button
                  variant={font === 'chosunkm' ? 'default' : 'ghost'}
                  className="w-full justify-start h-8 px-2"
                  onClick={() => setFont('chosunkm')}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFont('chosunkm');
                  }}
                  data-testid="button-font-chosunkm"
                >
                  <Type className="w-4 h-4 mr-1" />
                  조선굵은명조체
                </Button>
              </div>
            </Card>
          </div>

          {/* 푸터 */}
          <div className="p-4 border-t space-y-2">
            <Button
              onClick={() => {
                console.log('🔄 Force refresh requested');
                window.location.reload();
              }}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-force-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              앱 새로고침
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              V.1.25.10.34
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}