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
import { useMembership } from "@/contexts/MembershipContext";
import { syncNow } from "@/lib/member-sync";
import { useState, useRef, useEffect } from "react";
import { localDB } from "@/lib/saju-local-storage";
import { queryClient } from "@/lib/queryClient";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { font, setFont } = useFont();
  const { isAuthenticated, logout } = useAuth();
  const { can, user } = useMembership();
  const doMemberSync = async () => {
    if (!(user as any)?.email) { toast({ title: "로그인 필요", description: "먼저 PRO 로그인 후 이용하세요.", duration: 1500 }); return; }
    toast({ title: "동기화 중...", description: "서버와 데이터를 맞추는 중입니다.", duration: 1500 });
    const r = await syncNow((user as any).email);
    queryClient.invalidateQueries();
    toast({ title: r.ok ? "동기화 완료" : "동기화 실패", description: r.message, duration: 2500 });
  };
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTouchStartY = useRef(0);

  // 메뉴 열릴 때 배경 스크롤 차단
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // 스크롤 영역 끝에서 bounce/새어나감 방지
  // React의 onTouchMove는 passive:true로 등록되어 preventDefault가 무시되므로
  // 네이티브 addEventListener로 passive:false 지정하여 직접 등록
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isOpen) return;

    const handleNativeTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
      scrollTouchStartY.current = e.touches[0].clientY;
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const currentY = e.touches[0].clientY;
      const movingDown = currentY > scrollTouchStartY.current;
      const movingUp = currentY < scrollTouchStartY.current;

      if ((isAtTop && movingDown) || (isAtBottom && movingUp)) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', handleNativeTouchStart, { passive: true });
    container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleNativeTouchStart);
      container.removeEventListener('touchmove', handleNativeTouchMove);
    };
  }, [isOpen]);

  const handleDriveBackup = async () => {
    // 로그인 체크
    if (!isAuthenticated) {
      toast({
        title: "구글 드라이브 로그인 필요",
        description: "DB백업은 PRO 로그인과는 별개로, 구글 드라이브 전용 로그인이 필요합니다.",
        variant: "destructive",
        duration: 2000,
      });
      onClose();
      setLocation("/login");
      return;
    }

    try {
      toast({
        title: "백업 중...",
        description: "로컬 데이터를 Google Drive에 백업하는 중입니다.",
        duration: 800,
      });

      // localDB에서 모든 데이터 가져오기 (사주, 그룹, 운세 결과)
      const backupData = await localDB.exportAllData();

      const response = await fetch('/api/backup/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 🔥 쿠키 전송 옵션 추가!
        body: JSON.stringify(backupData)
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "백업 완료",
          description: `${backupData.sajuRecords.length}개의 사주 레코드가 Google Drive에 백업되었습니다.`,
          duration: 1500,
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
        title: "구글 드라이브 로그인 필요",
        description: "DB가져오기는 PRO 로그인과는 별개로, 구글 드라이브 전용 로그인이 필요합니다.",
        variant: "destructive",
        duration: 2000,
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
        credentials: 'include', // 🔥 쿠키 전송 옵션 추가!
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
        credentials: 'include', // 🔥 쿠키 전송 옵션 추가!
        body: JSON.stringify({ fileId: latestFile.id }),
      });

      const downloadResult = await downloadResponse.json();
      
      if (!downloadResponse.ok) {
        throw new Error(downloadResult.error || '다운로드 실패');
      }

      const backupData = typeof downloadResult.data === 'string' 
        ? JSON.parse(downloadResult.data) 
        : downloadResult.data;

      // localDB에 데이터 복원 (중복 체크 후 병합)
      const importResult = await localDB.importAllData(backupData);
// staleTime이 길게 설정되어 있어 invalidate만으로는 화면에 즉시 반영되지 않을 수 있어
// refetchType: 'active'로 현재 열려있는 쿼리를 강제로 다시 불러오게 함
queryClient.invalidateQueries({ queryKey: ['local-saju-records'], exact: false, refetchType: 'active' });
queryClient.invalidateQueries({ queryKey: ['local-groups'], refetchType: 'active' });
queryClient.invalidateQueries({ queryKey: ['local-compatibility-records'], refetchType: 'active' });

      toast({
        title: "복원 완료",
        description: `${importResult.sajuRecordsCount}개의 사주, ${importResult.groupsCount}개의 그룹을 복원했습니다.`,
        duration: 800,
      });
    } catch (error) {
      toast({
        title: "복원 실패",
        description: error instanceof Error ? error.message : "Google Drive 복원 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 1500,
      });
    }
    onClose();
  };

  const handleNotifications = () => {
    setLocation("/announcements");
    onClose();
  };

  const handleFeedback = () => {
    window.open("https://open.kakao.com/o/ggsR7tBi", "_blank");
    onClose();
  };

  const handleGuide = () => {
    setLocation("/guide");
    onClose();
  };

  // 스와이프 감지 (ref 사용 - state 지연 문제 방지, 가로/세로 방향 엄격 구분)
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeCurrentX = useRef(0);
  const swipeCurrentY = useRef(0);
  const swipeIsHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.targetTouches[0].clientX;
    swipeStartY.current = e.targetTouches[0].clientY;
    swipeCurrentX.current = swipeStartX.current;
    swipeCurrentY.current = swipeStartY.current;
    swipeIsHorizontal.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    swipeCurrentX.current = e.targetTouches[0].clientX;
    swipeCurrentY.current = e.targetTouches[0].clientY;

    // 최초 방향 판정 (한 번만): 가로 이동량이 세로 이동량보다 뚜렷하게 클 때만 "가로 스와이프"로 간주
    if (swipeIsHorizontal.current === null) {
      const dx = Math.abs(swipeCurrentX.current - swipeStartX.current);
      const dy = Math.abs(swipeCurrentY.current - swipeStartY.current);
      if (dx > 10 || dy > 10) {
        swipeIsHorizontal.current = dx > dy * 1.5;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = swipeStartX.current - swipeCurrentX.current;
    const dy = Math.abs(swipeCurrentY.current - swipeStartY.current);

    // 가로 스와이프로 판정되었고, 왼쪽으로 80px 이상, 세로 이동은 60px 미만일 때만 닫기
    if (swipeIsHorizontal.current === true && dx > 80 && dy < 60) {
      e.stopPropagation();
      onClose();
    }

    swipeStartX.current = 0;
    swipeStartY.current = 0;
    swipeCurrentX.current = 0;
    swipeCurrentY.current = 0;
    swipeIsHorizontal.current = null;
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
          <div 
            ref={scrollContainerRef}
            className="flex-1 p-2 space-y-3 overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
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
              <h3 className="text-sm font-medium text-muted-foreground mb-2">💼 지천명 PRO (PRO 회원 전용)</h3>
              <div className="space-y-1">
                {(can('reservation') || can('customer') || can('stats')) ? (
                  <>
                    <Button variant="ghost" className="w-full justify-start px-2"
                      onClick={() => { setLocation('/reservation'); onClose(); }}
>
                      🗓️ 예약 관리
                    </Button>
                    <Button variant="ghost" className="w-full justify-start px-2"
                      onClick={() => { setLocation('/stats'); onClose(); }}
>
                      📊 매출 집계
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" className="w-full justify-start px-2 text-muted-foreground"
                    onClick={() => { setLocation('/pro'); onClose(); }}
>
                    🔒 유료 회원 로그인
                  </Button>
                )}
              </div>
            </Card>

            
            <Card className="p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">데이터 관리</h3>
                {isAuthenticated ? (
                  <button
                    className="text-sm font-medium text-red-500"
                    onClick={() => { logout(); onClose(); }}
                    data-testid="button-logout"
                  >
                    드라이브 로그아웃
                  </button>
                ) : (
                  <button
                    className="text-sm font-medium text-blue-500"
                    onClick={() => { setLocation("/login"); onClose(); }}
                    data-testid="button-login"
                  >
                    드라이브 로그인
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70 mb-2 -mt-1">
                ※ DB백업/가져오기는 개인 구글 드라이브 전용 로그인이며, PRO 로그인과는 별개입니다.
              </p>

              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleDriveBackup}
                  data-testid="button-db-backup"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  DB백업하기
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={handleDriveRestore}
                  data-testid="button-db-restore"
                >
                  <Download className="w-4 h-4 mr-1" />
                  DB가져오기
                </Button>
                {can('reservation') && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2"
                    onClick={() => { doMemberSync(); }}
                    data-testid="button-member-sync"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    🔄 데이터 동기화 (PC↔폰)
                  </Button>
                )}
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
              <h3 className="text-sm font-medium text-muted-foreground mb-2">약관</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2"
                  onClick={() => {
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
              {`V.${new Date().getFullYear().toString().slice(2)}.${String(new Date().getMonth()+1).padStart(2,'0')}.${String(new Date().getDate()).padStart(2,'0')}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
