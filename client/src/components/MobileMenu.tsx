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
  Type,
  LogIn,
  LogOut,
  Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useFont } from "@/contexts/FontContext";
import { useAuth } from "@/contexts/AuthContext";
import { signOut, auth } from "@/lib/firebase";
import { useState, useRef } from "react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { font, setFont } = useFont();
  const { user, googleAccessToken } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleLogin = () => {
    setLocation("/login");
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      });
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    onClose();
  };

  const handleDriveBackup = async () => {
    if (!user || !googleAccessToken) {
      toast({
        title: "로그인 필요",
        description: "Google Drive 백업을 위해 로그인이 필요합니다.",
      });
      setLocation("/login");
      onClose();
      return;
    }

    try {
      toast({
        title: "백업 중...",
        description: "Google Drive에 백업하는 중입니다.",
      });

      const response = await fetch('/api/backup/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: googleAccessToken }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "백업 완료",
          description: "Google Drive에 성공적으로 백업되었습니다.",
        });
      } else {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "인증 만료",
            description: "Google 인증이 만료되었습니다. 다시 로그인해주세요.",
          });
          await signOut();
          setLocation("/login");
        } else {
          throw new Error(result.error || '백업 실패');
        }
      }
    } catch (error) {
      toast({
        title: "백업 실패",
        description: error instanceof Error ? error.message : "Google Drive 백업 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    onClose();
  };

  const handleDriveRestore = async () => {
    if (!user || !googleAccessToken) {
      toast({
        title: "로그인 필요",
        description: "Google Drive 불러오기를 위해 로그인이 필요합니다.",
      });
      setLocation("/login");
      onClose();
      return;
    }

    try {
      toast({
        title: "불러오는 중...",
        description: "Google Drive에서 백업 파일을 불러오는 중입니다.",
      });

      const listResponse = await fetch('/api/backup/drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: googleAccessToken }),
      });

      const listResult = await listResponse.json();
      
      if (listResponse.status === 401 || listResponse.status === 403) {
        toast({
          title: "인증 만료",
          description: "Google 인증이 만료되었습니다. 다시 로그인해주세요.",
        });
        await signOut();
        setLocation("/login");
        onClose();
        return;
      }
      
      if (!listResponse.ok || !listResult.files || listResult.files.length === 0) {
        toast({
          title: "백업 파일 없음",
          description: "Google Drive에 백업 파일이 없습니다.",
        });
        onClose();
        return;
      }

      const latestFile = listResult.files[0];

      const downloadResponse = await fetch('/api/backup/drive/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: googleAccessToken, fileId: latestFile.id }),
      });

      const downloadResult = await downloadResponse.json();
      
      if (downloadResponse.status === 401 || downloadResponse.status === 403) {
        toast({
          title: "인증 만료",
          description: "Google 인증이 만료되었습니다. 다시 로그인해주세요.",
        });
        await signOut();
        setLocation("/login");
        onClose();
        return;
      }
      
      if (!downloadResponse.ok) {
        throw new Error(downloadResult.error || '다운로드 실패');
      }

      const importResponse = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadResult.data),
      });

      const importResult = await importResponse.json();
      
      if (importResponse.ok) {
        toast({
          title: "복원 완료",
          description: importResult.message || `${importResult.imported}개의 데이터를 복원했습니다.`,
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

            {user ? (
              <Card className="p-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Google Drive 백업
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2"
                    onClick={handleDriveBackup}
                    data-testid="button-drive-backup"
                  >
                    <Cloud className="w-4 h-4 mr-1" />
                    백업하기
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2"
                    onClick={handleDriveRestore}
                    data-testid="button-drive-restore"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    불러오기
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    로그아웃
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  계정
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2"
                    onClick={handleLogin}
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    로그인
                  </Button>
                </div>
              </Card>
            )}

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