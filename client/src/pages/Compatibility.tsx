import { useState, useEffect, useMemo } from "react";
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
import { calculateCompleteDaeun, calculateCurrentAge, DaeunPeriod } from "@/lib/daeun-calculator";
import { CHEONGAN, JIJI } from "@/lib/saju-calculator";

// 다음 간지 계산 (60갑자 순환)
function getNextGanji(sky: string, earth: string) {
  const skyIndex = CHEONGAN.indexOf(sky as any);
  const earthIndex = JIJI.indexOf(earth as any);
  
  if (skyIndex === -1 || earthIndex === -1) {
    throw new Error(`Invalid ganji: ${sky}${earth}`);
  }
  
  const nextSkyIndex = (skyIndex + 1) % CHEONGAN.length;
  const nextEarthIndex = (earthIndex + 1) % JIJI.length;
  
  return {
    sky: CHEONGAN[nextSkyIndex],
    earth: JIJI[nextEarthIndex]
  };
}

// 이전 간지 계산 (60갑자 순환 역방향)
function getPrevGanji(sky: string, earth: string) {
  const skyIndex = CHEONGAN.indexOf(sky as any);
  const earthIndex = JIJI.indexOf(earth as any);
  
  if (skyIndex === -1 || earthIndex === -1) {
    throw new Error(`Invalid ganji: ${sky}${earth}`);
  }
  
  const prevSkyIndex = (skyIndex - 1 + CHEONGAN.length) % CHEONGAN.length;
  const prevEarthIndex = (earthIndex - 1 + JIJI.length) % JIJI.length;
  
  return {
    sky: CHEONGAN[prevSkyIndex],
    earth: JIJI[prevEarthIndex]
  };
}

// 개선된 歲運 계산 (offset과 window size 지원)
function calculateSaeun(
  birthYear: number, 
  startSky: string, 
  startEarth: string, 
  windowSize: number = 12,
  offsetAge: number = 0
) {
  const years: number[] = [];
  const ages: number[] = [];
  const skyStems: string[] = [];
  const earthBranches: string[] = [];
  
  let currentSky = startSky;
  let currentEarth = startEarth;
  
  // 태어난 다음날부터 시작하므로 첫 번째부터 다음 간지
  const nextGanji = getNextGanji(currentSky, currentEarth);
  currentSky = nextGanji.sky;
  currentEarth = nextGanji.earth;
  
  // 실제 시작 나이와 년도 계산 (최소 1세)
  const startAge = Math.max(1, offsetAge + 1);
  const startYear = birthYear + startAge;
  
  // 시작 지점까지 간지 진행 (1세부터 계산)
  const adjustedOffset = startAge - 1; // 1세가 0 오프셋
  if (adjustedOffset >= 0) {
    for (let i = 0; i < adjustedOffset; i++) {
      const next = getNextGanji(currentSky, currentEarth);
      currentSky = next.sky;
      currentEarth = next.earth;
    }
  } else {
    for (let i = 0; i < Math.abs(adjustedOffset); i++) {
      const prev = getPrevGanji(currentSky, currentEarth);
      currentSky = prev.sky;
      currentEarth = prev.earth;
    }
  }
  
  // window size만큼 歲運 데이터 생성
  for (let i = 0; i < windowSize; i++) {
    const currentYear = startYear + i;
    const currentAge = startAge + i;
    
    years.push(currentYear);
    ages.push(currentAge);
    skyStems.push(currentSky);
    earthBranches.push(currentEarth);
    
    // 다음 해의 간지 계산
    const next = getNextGanji(currentSky, currentEarth);
    currentSky = next.sky;
    currentEarth = next.earth;
  }
  
  return { years, ages, skyStems, earthBranches };
}

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

type DisplayMode = 'base' | 'daeun' | 'saeun';

interface SaeunInfo {
  age: number;
  sky: string;
  earth: string;
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
  
  // 왼쪽 사주 대운/세운 상태
  const [leftDisplayMode, setLeftDisplayMode] = useState<DisplayMode>('base');
  const [leftFocusedDaeun, setLeftFocusedDaeun] = useState<DaeunPeriod | null>(null);
  const [leftFocusedSaeun, setLeftFocusedSaeun] = useState<SaeunInfo | null>(null);
  const [leftSaeunOffset, setLeftSaeunOffset] = useState(0);
  
  // 오른쪽 사주 대운/세운 상태
  const [rightDisplayMode, setRightDisplayMode] = useState<DisplayMode>('base');
  const [rightFocusedDaeun, setRightFocusedDaeun] = useState<DaeunPeriod | null>(null);
  const [rightFocusedSaeun, setRightFocusedSaeun] = useState<SaeunInfo | null>(null);
  const [rightSaeunOffset, setRightSaeunOffset] = useState(0);
  
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

  // 왼쪽 사주 생시 변경 핸들러
  const handleLeftBirthTimeChange = async (timeCode: string) => {
    if (!leftSajuId || !leftSaju) return;
    
    try {
      await apiRequest("PUT", `/api/saju-records/${leftSajuId}`, { 
        birthTime: timeCode,
        name: leftSaju.name,
        birthYear: leftSaju.birthYear,
        birthMonth: leftSaju.birthMonth,
        birthDay: leftSaju.birthDay,
        calendarType: leftSaju.calendarType,
        gender: leftSaju.gender
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', leftSajuId] });
      toast({
        title: "변경 완료",
        description: "생시가 변경되었습니다.",
        duration: 1000
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "생시 변경에 실패했습니다.",
        variant: "destructive",
        duration: 1000
      });
    }
  };

  // 오른쪽 사주 생시 변경 핸들러
  const handleRightBirthTimeChange = async (timeCode: string) => {
    if (!rightSajuId || !rightSaju) return;
    
    try {
      await apiRequest("PUT", `/api/saju-records/${rightSajuId}`, { 
        birthTime: timeCode,
        name: rightSaju.name,
        birthYear: rightSaju.birthYear,
        birthMonth: rightSaju.birthMonth,
        birthDay: rightSaju.birthDay,
        calendarType: rightSaju.calendarType,
        gender: rightSaju.gender
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', rightSajuId] });
      toast({
        title: "변경 완료",
        description: "생시가 변경되었습니다.",
        duration: 1000
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "생시 변경에 실패했습니다.",
        variant: "destructive",
        duration: 1000
      });
    }
  };

  // 왼쪽 사주 생년월일 변경 핸들러
  const handleLeftBirthDateChange = async (year: number, month: number, day: number) => {
    if (!leftSajuId || !leftSaju) return;
    
    try {
      await apiRequest("PUT", `/api/saju-records/${leftSajuId}`, { 
        birthYear: year,
        birthMonth: month,
        birthDay: day,
        name: leftSaju.name,
        birthTime: leftSaju.birthTime,
        calendarType: leftSaju.calendarType,
        gender: leftSaju.gender
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', leftSajuId] });
      toast({
        title: "변경 완료",
        description: "생년월일이 변경되었습니다.",
        duration: 1000
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "생년월일 변경에 실패했습니다.",
        variant: "destructive",
        duration: 1000
      });
    }
  };

  // 오른쪽 사주 생년월일 변경 핸들러
  const handleRightBirthDateChange = async (year: number, month: number, day: number) => {
    if (!rightSajuId || !rightSaju) return;
    
    try {
      await apiRequest("PUT", `/api/saju-records/${rightSajuId}`, { 
        birthYear: year,
        birthMonth: month,
        birthDay: day,
        name: rightSaju.name,
        birthTime: rightSaju.birthTime,
        calendarType: rightSaju.calendarType,
        gender: rightSaju.gender
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', rightSajuId] });
      toast({
        title: "변경 완료",
        description: "생년월일이 변경되었습니다.",
        duration: 1000
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "생년월일 변경에 실패했습니다.",
        variant: "destructive",
        duration: 1000
      });
    }
  };

  const handleHomeClick = () => {
    // localStorage 정리 후 홈으로 이동
    localStorage.removeItem('compatibility_left_id');
    localStorage.removeItem('compatibility_right_id');
    setLocation('/');
  };

  // 왼쪽 사주 대운 데이터 계산
  const leftDaeunData = useMemo(() => {
    if (!leftSaju?.yearSky || !leftSaju?.yearEarth || !leftSaju?.monthSky || !leftSaju?.monthEarth) {
      return null;
    }
    return calculateCompleteDaeun(leftSaju as any);
  }, [leftSaju]);

  // 왼쪽 사주 현재 나이 계산
  const leftCurrentAge = useMemo(() => {
    if (!leftSaju) return null;
    return calculateCurrentAge(
      leftSaju.birthYear,
      leftSaju.birthMonth,
      leftSaju.birthDay,
      leftSaju.yearSky,
      leftSaju.yearEarth
    );
  }, [leftSaju]);

  // 왼쪽 사주 세운 데이터 계산
  const leftSaeunData = useMemo(() => {
    if (!leftSaju?.yearSky || !leftSaju?.yearEarth || !leftFocusedDaeun) {
      return null;
    }
    return calculateSaeun(
      leftSaju.birthYear,
      leftSaju.yearSky,
      leftSaju.yearEarth,
      12,
      leftFocusedDaeun.startAge - 1 + leftSaeunOffset
    );
  }, [leftSaju, leftFocusedDaeun, leftSaeunOffset]);

  // 오른쪽 사주 대운 데이터 계산
  const rightDaeunData = useMemo(() => {
    if (!rightSaju?.yearSky || !rightSaju?.yearEarth || !rightSaju?.monthSky || !rightSaju?.monthEarth) {
      return null;
    }
    return calculateCompleteDaeun(rightSaju as any);
  }, [rightSaju]);

  // 오른쪽 사주 현재 나이 계산
  const rightCurrentAge = useMemo(() => {
    if (!rightSaju) return null;
    return calculateCurrentAge(
      rightSaju.birthYear,
      rightSaju.birthMonth,
      rightSaju.birthDay,
      rightSaju.yearSky,
      rightSaju.yearEarth
    );
  }, [rightSaju]);

  // 오른쪽 사주 세운 데이터 계산
  const rightSaeunData = useMemo(() => {
    if (!rightSaju?.yearSky || !rightSaju?.yearEarth || !rightFocusedDaeun) {
      return null;
    }
    return calculateSaeun(
      rightSaju.birthYear,
      rightSaju.yearSky,
      rightSaju.yearEarth,
      12,
      rightFocusedDaeun.startAge - 1 + rightSaeunOffset
    );
  }, [rightSaju, rightFocusedDaeun, rightSaeunOffset]);

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
              <div style={{ display: 'flex', gap: '4px', transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeftSajuId(null)}
                  data-testid="button-left-change"
                  className="px-3 py-1 text-xs rounded-r-none border-r-0"
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
                  className="px-3 py-1 text-xs rounded-l-none ml-[-1px]"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {leftSaveMutation.isPending ? '저장 중...' : '저장'}
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
              calendarType={leftSaju.calendarType}
              memo={leftMemo}
              onMemoChange={(newMemo) => setLeftMemo(newMemo)}
              onBirthTimeChange={handleLeftBirthTimeChange}
              onBirthDateChange={handleLeftBirthDateChange}
              daeunPeriods={leftDaeunData?.daeunPeriods || []}
              currentAge={leftCurrentAge || undefined}
              displayMode={leftDisplayMode}
              focusedDaeun={leftFocusedDaeun}
              focusedSaeun={leftFocusedSaeun}
              saeunData={leftSaeunData}
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
              <div style={{ display: 'flex', gap: '4px', transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRightSajuId(null)}
                  data-testid="button-right-change"
                  className="px-3 py-1 text-xs rounded-r-none border-r-0"
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
                  className="px-3 py-1 text-xs rounded-l-none ml-[-1px]"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {rightSaveMutation.isPending ? '저장 중...' : '저장'}
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
              calendarType={rightSaju.calendarType}
              memo={rightMemo}
              onMemoChange={(newMemo) => setRightMemo(newMemo)}
              onBirthTimeChange={handleRightBirthTimeChange}
              onBirthDateChange={handleRightBirthDateChange}
              daeunPeriods={rightDaeunData?.daeunPeriods || []}
              currentAge={rightCurrentAge || undefined}
              displayMode={rightDisplayMode}
              focusedDaeun={rightFocusedDaeun}
              focusedSaeun={rightFocusedSaeun}
              saeunData={rightSaeunData}
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
