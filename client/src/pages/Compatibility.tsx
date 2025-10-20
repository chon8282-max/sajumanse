import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Home, FolderOpen, RefreshCw, Save, X } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import SajuTable from "@/components/SajuTable";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SajuResultData {
  id: string;
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthTime: string | null;
  calendarType: string;
  gender: string;
  memo: string | null;
  yearSky?: string;
  yearEarth?: string;
  monthSky?: string;
  monthEarth?: string;
  daySky?: string;
  dayEarth?: string;
  hourSky?: string;
  hourEarth?: string;
}

export default function Compatibility() {
  console.log('[Compatibility] 컴포넌트 렌더링 시작');
  
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  
  const [leftSajuId, setLeftSajuId] = useState<string | null>(null);
  const [rightSajuId, setRightSajuId] = useState<string | null>(null);
  const [showLeftDialog, setShowLeftDialog] = useState(false);
  const [showRightDialog, setShowRightDialog] = useState(false);
  const [leftMemo, setLeftMemo] = useState<string>("");
  const [rightMemo, setRightMemo] = useState<string>("");
  
  console.log('[Compatibility] State:', { leftSajuId, rightSajuId });
  
  // 다이얼로그 열릴 때 페이지 스크롤 완전히 막기
  useEffect(() => {
    if (showLeftDialog || showRightDialog) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showLeftDialog, showRightDialog]);
  
  // 쿼리 파라미터에서 ID 자동 로드
  useEffect(() => {
    console.log('[Compatibility] useEffect - 쿼리 파라미터 로드');
    const params = new URLSearchParams(searchParams);
    const leftId = params.get('left');
    const rightId = params.get('right');
    
    console.log('[Compatibility] URL params:', { leftId, rightId });
    
    if (leftId && leftId !== leftSajuId) {
      setLeftSajuId(leftId);
    }
    if (rightId && rightId !== rightSajuId) {
      setRightSajuId(rightId);
    }
  }, [searchParams]);

  // 왼쪽 사주 데이터 가져오기
  const { data: leftSajuResponse } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ['/api/saju-records', leftSajuId],
    enabled: !!leftSajuId,
  });

  // 오른쪽 사주 데이터 가져오기
  const { data: rightSajuResponse } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ['/api/saju-records', rightSajuId],
    enabled: !!rightSajuId,
  });
  
  const leftSaju = leftSajuResponse?.data;
  const rightSaju = rightSajuResponse?.data;
  
  // 사주 데이터 로드 시 메모 동기화
  useEffect(() => {
    if (leftSaju && leftSaju.id === leftSajuId) {
      setLeftMemo(leftSaju.memo ?? "");
    }
  }, [leftSaju?.id, leftSajuId]);
  
  useEffect(() => {
    if (rightSaju && rightSaju.id === rightSajuId) {
      setRightMemo(rightSaju.memo ?? "");
    }
  }, [rightSaju?.id, rightSajuId]);
  
  // 왼쪽 저장 mutation
  const leftSaveMutation = useMutation({
    mutationFn: async (memo: string) => {
      if (!leftSajuId) return;
      return apiRequest("PUT", `/api/saju-records/${leftSajuId}`, { memo });
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "사주 1 메모가 저장되었습니다.",
        duration: 500
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', leftSajuId] });
    }
  });
  
  // 오른쪽 저장 mutation
  const rightSaveMutation = useMutation({
    mutationFn: async (memo: string) => {
      if (!rightSajuId) return;
      return apiRequest("PUT", `/api/saju-records/${rightSajuId}`, { memo });
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "사주 2 메모가 저장되었습니다.",
        duration: 500
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', rightSajuId] });
    }
  });

  const handleHomeClick = () => {
    setLocation('/');
  };

  // 사주 목록 조회
  const { data: sajuListResponse } = useQuery<{success: boolean, data: SajuResultData[]}>({
    queryKey: ['/api/saju-records'],
  });
  
  const sajuList = sajuListResponse?.data || [];

  console.log('[Compatibility] 렌더링 직전:', { leftSaju, rightSaju, sajuListLength: sajuList.length });

  // 간단한 디버그 UI (최소 렌더링 확인용)
  if (typeof window !== 'undefined') {
    console.log('[Compatibility] window 존재, 브라우저 환경 확인');
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      width: '100%', 
      minHeight: '100vh',
      gap: '1px'
    }}>
      {/* 왼쪽 사주 1 */}
      <div className="bg-white dark:bg-gray-900" style={{ 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHomeClick}
                className="gap-1 h-8 text-sm px-3"
                data-testid="button-home"
              >
                <Home className="w-4 h-4" />
                홈
              </Button>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>사주 1</h3>
            </div>
            {leftSajuId && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeftSajuId(null)}
                  data-testid="button-left-change"
                  className="h-9 text-sm px-3"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  수정
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => leftSaveMutation.mutate(leftMemo)}
                  disabled={leftSaveMutation.isPending}
                  data-testid="button-left-save"
                  className="h-9 text-sm px-3"
                >
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {leftSajuId && leftSaju ? (
            <SajuTable 
              saju={{
                year: { sky: leftSaju.yearSky || '', earth: leftSaju.yearEarth || '' },
                month: { sky: leftSaju.monthSky || '', earth: leftSaju.monthEarth || '' },
                day: { sky: leftSaju.daySky || '', earth: leftSaju.dayEarth || '' },
                hour: { sky: leftSaju.hourSky || '', earth: leftSaju.hourEarth || '' }
              }}
              name={leftSaju.name}
              birthYear={leftSaju.birthYear}
              birthMonth={leftSaju.birthMonth}
              birthDay={leftSaju.birthDay}
              birthHour={leftSaju.birthTime || undefined}
              gender={leftSaju.gender}
              memo={leftMemo}
              onMemoChange={(memo) => setLeftMemo(memo)}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px' }}>
              <p style={{ color: '#6b7280', fontSize: '15px' }}>사주를 선택해주세요</p>
              <Button
                variant="outline"
                onClick={() => setShowLeftDialog(true)}
                data-testid="button-left-load"
                size="lg"
                className="h-12 px-6 text-base"
              >
                <FolderOpen className="w-5 h-5 mr-2" />
                불러오기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 사주 2 */}
      <div className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700" style={{ 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>사주 2</h3>
            {rightSajuId && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRightSajuId(null)}
                  data-testid="button-right-change"
                  className="h-9 text-sm px-3"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  수정
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => rightSaveMutation.mutate(rightMemo)}
                  disabled={rightSaveMutation.isPending}
                  data-testid="button-right-save"
                  className="h-9 text-sm px-3"
                >
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {rightSajuId && rightSaju ? (
            <SajuTable 
              saju={{
                year: { sky: rightSaju.yearSky || '', earth: rightSaju.yearEarth || '' },
                month: { sky: rightSaju.monthSky || '', earth: rightSaju.monthEarth || '' },
                day: { sky: rightSaju.daySky || '', earth: rightSaju.dayEarth || '' },
                hour: { sky: rightSaju.hourSky || '', earth: rightSaju.hourEarth || '' }
              }}
              name={rightSaju.name}
              birthYear={rightSaju.birthYear}
              birthMonth={rightSaju.birthMonth}
              birthDay={rightSaju.birthDay}
              birthHour={rightSaju.birthTime || undefined}
              gender={rightSaju.gender}
              memo={rightMemo}
              onMemoChange={(memo) => setRightMemo(memo)}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px' }}>
              <p style={{ color: '#6b7280', fontSize: '15px' }}>사주를 선택해주세요</p>
              <Button
                variant="outline"
                onClick={() => setShowRightDialog(true)}
                data-testid="button-right-load"
                size="lg"
                className="h-12 px-6 text-base"
              >
                <FolderOpen className="w-5 h-5 mr-2" />
                불러오기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 왼쪽 사주 선택 다이얼로그 */}
      <Dialog open={showLeftDialog} onOpenChange={setShowLeftDialog}>
        <DialogPortal container={typeof document !== 'undefined' ? document.body : undefined}>
          <div className="fixed inset-0 z-[9998] bg-black/30" onClick={() => setShowLeftDialog(false)} />
          <div
            className="fixed left-[50%] top-[5vh] z-[9999] w-full max-w-[95vw] sm:max-w-2xl translate-x-[-50%] bg-white dark:bg-gray-900 p-6 shadow-2xl sm:rounded-lg h-[90vh] flex flex-col border-2 border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">사주 1 선택</h2>
              <button
                onClick={() => setShowLeftDialog(false)}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              {sajuList.map((saju) => (
                <Card
                  key={saju.id}
                  className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-white dark:bg-gray-900"
                  onClick={() => {
                    setLeftSajuId(saju.id);
                    setShowLeftDialog(false);
                  }}
                  data-testid={`saju-item-${saju.id}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-xl text-black dark:text-white">{saju.name}</h3>
                      <p className="text-base text-muted-foreground mt-1">
                        {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DialogPortal>
      </Dialog>

      {/* 오른쪽 사주 선택 다이얼로그 */}
      <Dialog open={showRightDialog} onOpenChange={setShowRightDialog}>
        <DialogPortal container={typeof document !== 'undefined' ? document.body : undefined}>
          <div className="fixed inset-0 z-[9998] bg-black/30" onClick={() => setShowRightDialog(false)} />
          <div
            className="fixed left-[50%] top-[5vh] z-[9999] w-full max-w-[95vw] sm:max-w-2xl translate-x-[-50%] bg-white dark:bg-gray-900 p-6 shadow-2xl sm:rounded-lg h-[90vh] flex flex-col border-2 border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">사주 2 선택</h2>
              <button
                onClick={() => setShowRightDialog(false)}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              {sajuList.map((saju) => (
                <Card
                  key={saju.id}
                  className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-white dark:bg-gray-900"
                  onClick={() => {
                    setRightSajuId(saju.id);
                    setShowRightDialog(false);
                  }}
                  data-testid={`saju-item-${saju.id}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-xl text-black dark:text-white">{saju.name}</h3>
                      <p className="text-base text-muted-foreground mt-1">
                        {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
