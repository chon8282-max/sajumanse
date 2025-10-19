import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, FolderOpen, RefreshCw, Save } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import SajuTable from "@/components/SajuTable";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      height: '100dvh',
      gap: '1px',
      overflow: 'hidden'
    }}>
      {/* 왼쪽 사주 1 */}
      <div className="bg-white dark:bg-gray-900" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
          {/* 디버그 표시 - 렌더링 확인용 */}
          <div style={{ fontSize: '10px', color: 'red', marginBottom: '4px' }}>
            DEBUG: 궁합페이지 렌더링됨 (v1.25.10.47)
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHomeClick}
                className="gap-1 h-6 text-xs px-2"
                data-testid="button-home"
              >
                <Home className="w-3 h-3" />
                홈
              </Button>
              <h3 style={{ fontSize: '14px', fontWeight: '600' }}>사주 1</h3>
            </div>
            {leftSajuId && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeftSajuId(null)}
                  data-testid="button-left-change"
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  수정
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => leftSaveMutation.mutate(leftMemo)}
                  disabled={leftSaveMutation.isPending}
                  data-testid="button-left-save"
                  className="h-7 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px' }}>
              <p style={{ color: '#6b7280' }}>사주를 선택해주세요</p>
              <Button
                variant="outline"
                onClick={() => setShowLeftDialog(true)}
                data-testid="button-left-load"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                불러오기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 사주 2 */}
      <div className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>사주 2</h3>
            {rightSajuId && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRightSajuId(null)}
                  data-testid="button-right-change"
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  수정
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => rightSaveMutation.mutate(rightMemo)}
                  disabled={rightSaveMutation.isPending}
                  data-testid="button-right-save"
                  className="h-7 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px' }}>
              <p style={{ color: '#6b7280' }}>사주를 선택해주세요</p>
              <Button
                variant="outline"
                onClick={() => setShowRightDialog(true)}
                data-testid="button-right-load"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                불러오기
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 왼쪽 사주 선택 다이얼로그 */}
      <Dialog open={showLeftDialog} onOpenChange={setShowLeftDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] flex flex-col bg-white dark:bg-gray-900">
          <DialogHeader className="flex-shrink-0 bg-white dark:bg-gray-900">
            <DialogTitle className="text-black dark:text-white">사주 1 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 p-2 bg-gray-50 dark:bg-gray-800">
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
                    <h3 className="font-semibold text-lg text-black dark:text-white">{saju.name}</h3>
                    <p className="text-base text-muted-foreground mt-1">
                      {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 오른쪽 사주 선택 다이얼로그 */}
      <Dialog open={showRightDialog} onOpenChange={setShowRightDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] flex flex-col bg-white dark:bg-gray-900">
          <DialogHeader className="flex-shrink-0 bg-white dark:bg-gray-900">
            <DialogTitle className="text-black dark:text-white">사주 2 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 p-2 bg-gray-50 dark:bg-gray-800">
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
                    <h3 className="font-semibold text-lg text-black dark:text-white">{saju.name}</h3>
                    <p className="text-base text-muted-foreground mt-1">
                      {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
