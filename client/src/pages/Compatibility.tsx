import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  
  const [leftSajuId, setLeftSajuId] = useState<string | null>(() => {
    // 초기값: localStorage에서 복원
    if (typeof window !== 'undefined') {
      return localStorage.getItem('compatibility_left_id');
    }
    return null;
  });
  const [rightSajuId, setRightSajuId] = useState<string | null>(() => {
    // 초기값: localStorage에서 복원
    if (typeof window !== 'undefined') {
      return localStorage.getItem('compatibility_right_id');
    }
    return null;
  });
  const [showLeftDialog, setShowLeftDialog] = useState(false);
  const [showRightDialog, setShowRightDialog] = useState(false);
  const [leftMemo, setLeftMemo] = useState<string>("");
  const [rightMemo, setRightMemo] = useState<string>("");
  
  console.log('[Compatibility] State:', { leftSajuId, rightSajuId });
  
  // leftSajuId 변경 시 localStorage에 저장
  useEffect(() => {
    if (leftSajuId) {
      localStorage.setItem('compatibility_left_id', leftSajuId);
    } else {
      localStorage.removeItem('compatibility_left_id');
    }
  }, [leftSajuId]);
  
  // rightSajuId 변경 시 localStorage에 저장
  useEffect(() => {
    if (rightSajuId) {
      localStorage.setItem('compatibility_right_id', rightSajuId);
    } else {
      localStorage.removeItem('compatibility_right_id');
    }
  }, [rightSajuId]);
  
  // 쿼리 파라미터에서 ID 자동 로드 (localStorage보다 우선)
  useEffect(() => {
    console.log('[Compatibility] useEffect - 쿼리 파라미터 로드');
    const params = new URLSearchParams(searchParams);
    const leftId = params.get('left');
    const rightId = params.get('right');
    console.log('[Compatibility] 쿼리 파라미터:', { leftId, rightId });
    
    if (leftId) {
      console.log('[Compatibility] 왼쪽 사주 ID 설정:', leftId);
      setLeftSajuId(leftId);
    }
    if (rightId) {
      console.log('[Compatibility] 오른쪽 사주 ID 설정:', rightId);
      setRightSajuId(rightId);
    }
  }, [searchParams]);
  
  // 컴포넌트 언마운트 시 localStorage 정리
  useEffect(() => {
    return () => {
      console.log('[Compatibility] 컴포넌트 언마운트');
    };
  }, []);

  // 왼쪽 사주 데이터
  const { data: leftSajuResponse } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ['/api/saju-records', leftSajuId],
    enabled: !!leftSajuId,
  });

  const leftSaju = leftSajuResponse?.data;

  useEffect(() => {
    if (leftSaju?.memo) {
      setLeftMemo(leftSaju.memo);
    }
  }, [leftSaju]);

  // 오른쪽 사주 데이터
  const { data: rightSajuResponse } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ['/api/saju-records', rightSajuId],
    enabled: !!rightSajuId,
  });

  const rightSaju = rightSajuResponse?.data;

  useEffect(() => {
    if (rightSaju?.memo) {
      setRightMemo(rightSaju.memo);
    }
  }, [rightSaju]);

  console.log('[Compatibility] 사주 데이터:', { leftSaju, rightSaju });

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
    // localStorage 정리 후 홈으로 이동
    localStorage.removeItem('compatibility_left_id');
    localStorage.removeItem('compatibility_right_id');
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <table style={{ 
                borderCollapse: 'collapse', 
                borderSpacing: '0',
                fontSize: '11px',
                transform: 'scale(0.6)',
                transformOrigin: 'right center'
              }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0', margin: '0', border: 'none', width: '1px', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLeftSajuId(null)}
                        data-testid="button-left-change"
                        className="h-8 text-xs px-2 rounded-r-none border-r-0"
                        style={{ margin: '0' }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        수정
                      </Button>
                    </td>
                    <td style={{ padding: '0', margin: '0', border: 'none', width: '1px', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => leftSaveMutation.mutate(leftMemo)}
                        disabled={leftSaveMutation.isPending}
                        data-testid="button-left-save"
                        className="h-8 text-xs px-2 rounded-l-none"
                        style={{ margin: '0' }}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {leftSaveMutation.isPending ? '저장 중...' : '저장'}
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
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
                hour: { sky: leftSaju.hourSky || '', earth: leftSaju.hourEarth || '' },
                wuxing: {
                  yearSky: '목' as const,
                  yearEarth: '목' as const,
                  monthSky: '목' as const,
                  monthEarth: '목' as const,
                  daySky: '목' as const,
                  dayEarth: '목' as const,
                  hourSky: '',
                  hourEarth: ''
                }
              }}
              name={leftSaju.name}
              birthYear={leftSaju.birthYear}
              birthMonth={leftSaju.birthMonth}
              birthDay={leftSaju.birthDay}
              birthHour={leftSaju.birthTime || undefined}
              gender={leftSaju.gender}
              memo={leftMemo}
              onMemoChange={(newMemo) => setLeftMemo(newMemo)}
              yearText="년"
              monthText="월"
              dayText="일"
              hourText="시"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
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
      <div className="bg-white dark:bg-gray-900" style={{ 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>사주 2</h3>
            {rightSajuId && (
              <table style={{ 
                borderCollapse: 'collapse', 
                borderSpacing: '0',
                fontSize: '11px',
                transform: 'scale(0.6)',
                transformOrigin: 'right center'
              }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0', margin: '0', border: 'none', width: '1px', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRightSajuId(null)}
                        data-testid="button-right-change"
                        className="h-8 text-xs px-2 rounded-r-none border-r-0"
                        style={{ margin: '0' }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        수정
                      </Button>
                    </td>
                    <td style={{ padding: '0', margin: '0', border: 'none', width: '1px', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => rightSaveMutation.mutate(rightMemo)}
                        disabled={rightSaveMutation.isPending}
                        data-testid="button-right-save"
                        className="h-8 text-xs px-2 rounded-l-none"
                        style={{ margin: '0' }}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {rightSaveMutation.isPending ? '저장 중...' : '저장'}
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
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
                hour: { sky: rightSaju.hourSky || '', earth: rightSaju.hourEarth || '' },
                wuxing: {
                  yearSky: '목' as const,
                  yearEarth: '목' as const,
                  monthSky: '목' as const,
                  monthEarth: '목' as const,
                  daySky: '목' as const,
                  dayEarth: '목' as const,
                  hourSky: '',
                  hourEarth: ''
                }
              }}
              name={rightSaju.name}
              birthYear={rightSaju.birthYear}
              birthMonth={rightSaju.birthMonth}
              birthDay={rightSaju.birthDay}
              birthHour={rightSaju.birthTime || undefined}
              gender={rightSaju.gender}
              memo={rightMemo}
              onMemoChange={(newMemo) => setRightMemo(newMemo)}
              yearText="년"
              monthText="월"
              dayText="일"
              hourText="시"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
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

      {/* 왼쪽 사주 선택 다이얼로그 - React Portal로 body에 직접 렌더링 */}
      {showLeftDialog && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
          onClick={() => setShowLeftDialog(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            className="dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #e5e7eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexShrink: 0 
            }} className="dark:border-gray-700">
              <h2 style={{ fontSize: '16px', fontWeight: '600' }} className="dark:text-white">사주 1 선택</h2>
              <button
                onClick={() => setShowLeftDialog(false)}
                style={{ padding: '4px', borderRadius: '4px' }}
                className="opacity-70 hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* 리스트 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sajuList.map((saju) => (
                  <Card
                    key={saju.id}
                    className="p-3 cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => {
                      setLeftSajuId(saju.id);
                      setShowLeftDialog(false);
                    }}
                    data-testid={`saju-item-${saju.id}`}
                  >
                    <div>
                      <h3 className="font-semibold text-sm">{saju.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 오른쪽 사주 선택 다이얼로그 - React Portal로 body에 직접 렌더링 */}
      {showRightDialog && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
          onClick={() => setShowRightDialog(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            className="dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #e5e7eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexShrink: 0 
            }} className="dark:border-gray-700">
              <h2 style={{ fontSize: '16px', fontWeight: '600' }} className="dark:text-white">사주 2 선택</h2>
              <button
                onClick={() => setShowRightDialog(false)}
                style={{ padding: '4px', borderRadius: '4px' }}
                className="opacity-70 hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* 리스트 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sajuList.map((saju) => (
                  <Card
                    key={saju.id}
                    className="p-3 cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => {
                      setRightSajuId(saju.id);
                      setShowRightDialog(false);
                    }}
                    data-testid={`saju-item-${saju.id}`}
                  >
                    <div>
                      <h3 className="font-semibold text-sm">{saju.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
