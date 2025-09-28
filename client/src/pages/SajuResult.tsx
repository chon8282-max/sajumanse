import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, Save, Edit } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateSaju } from "@/lib/saju-calculator";
import { CHEONGAN, JIJI, TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { Solar } from "lunar-javascript";
import { getWuxingColor, getJijanggan } from "@/lib/wuxing-colors";
import { calculateCompleteYukjin } from "@/lib/yukjin-calculator";
import { calculateCompleteDaeun, calculateCurrentAge, findCurrentDaeun, DaeunPeriod } from "@/lib/daeun-calculator";
import SajuTable from "@/components/SajuTable";

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
  lunarYear: number | null;
  lunarMonth: number | null;
  lunarDay: number | null;
  isLeapMonth: boolean | null;
  yearSky: string | null;
  yearEarth: string | null;
  monthSky: string | null;
  monthEarth: string | null;
  daySky: string | null;
  dayEarth: string | null;
  hourSky: string | null;
  hourEarth: string | null;
}

export default function SajuResult() {
  // 모든 hooks를 최상단에 선언
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/saju-result/:id");
  const [focusedDaeun, setFocusedDaeun] = useState<DaeunPeriod | null>(null);
  const [saeunOffset, setSaeunOffset] = useState(0);
  const { toast } = useToast();
  
  // 사주 데이터 조회 (항상 호출)
  const { data: sajuData, isLoading } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ["/api/saju-records", params?.id || "null"],
    queryFn: async () => {
      if (!params?.id) {
        throw new Error("No ID provided");
      }
      const response = await apiRequest("GET", `/api/saju-records/${params.id}`);
      return await response.json();
    },
    enabled: !!params?.id,
  });

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async (memo: string) => {
      if (!params?.id) {
        throw new Error("No ID provided");
      }
      const response = await apiRequest("PUT", `/api/saju-records/${params.id}`, {
        memo: memo
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "사주 정보가 성공적으로 저장되었습니다.",
        duration: 700
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records", params?.id] });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({
        title: "저장 오류",
        description: "사주 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 모든 계산을 useMemo로 감싸기
  const calculatedData = useMemo(() => {
    if (!sajuData?.success || !sajuData.data) {
      return null;
    }

    const record = sajuData.data;
    const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === record.birthTime);
    
    // 육친 관계 계산
    const yukjinData = calculateCompleteYukjin(record);
    const heavenlyYukjin = yukjinData.heavenly;
    const earthlyYukjin = yukjinData.earthly;
    
    // 대운 계산
    const daeunData = calculateCompleteDaeun(record);
    
    // 현재 나이 계산 및 현재 대운 찾기
    const currentAge = calculateCurrentAge(record.birthYear, record.birthMonth, record.birthDay);
    const currentDaeun = findCurrentDaeun(currentAge, daeunData.daeunPeriods);
    
    return {
      record,
      timePeriod,
      yukjinData,
      heavenlyYukjin,
      earthlyYukjin,
      daeunData,
      currentAge,
      currentDaeun
    };
  }, [sajuData]);

  // 歲運 계산
  const saeunData = useMemo(() => {
    if (!calculatedData?.record.daySky || !calculatedData?.record.dayEarth || !focusedDaeun) {
      return null;
    }
    
    return calculateSaeun(
      calculatedData.record.birthYear, 
      calculatedData.record.daySky, 
      calculatedData.record.dayEarth, 
      12,
      focusedDaeun.startAge - 1 + saeunOffset
    );
  }, [calculatedData, focusedDaeun, saeunOffset]);

  // focusedDaeun 초기 설정 및 스크롤 맨 위로 이동
  useEffect(() => {
    if (calculatedData?.currentDaeun) {
      setFocusedDaeun(calculatedData.currentDaeun);
      setSaeunOffset(0); // 歲運 오프셋도 초기화
      // 페이지 로드 시 스크롤을 맨 위로 이동
      window.scrollTo(0, 0);
    }
  }, [calculatedData?.currentDaeun]); // focusedDaeun 의존성 제거하여 항상 설정되도록

  // 대운 클릭 핸들러
  const handleDaeunClick = useCallback((daeunPeriod: DaeunPeriod) => {
    setFocusedDaeun(daeunPeriod);
    setSaeunOffset(0); // 歲運 오프셋 초기화
  }, []);

  // 歲運 클릭 핸들러 
  const handleSaeunClick = useCallback((age: number) => {
    if (!calculatedData?.daeunData.daeunPeriods) return;
    
    // 해당 나이에 맞는 대운 찾기
    const targetDaeun = calculatedData.daeunData.daeunPeriods.find(
      period => age >= period.startAge && age <= period.endAge
    );
    
    if (targetDaeun) {
      setFocusedDaeun(targetDaeun);
      // 오프셋 변경하지 않음 - 클릭한 자리에서 선택되도록 유지
    }
  }, [calculatedData]);

  // 歲運 드래그/스크롤 핸들러
  const handleSaeunScroll = useCallback((direction: 'left' | 'right') => {
    setSaeunOffset(prev => {
      const step = 5; // 5년씩 이동
      // 대운 범위 제한
      const minOffset = -5; // 대운 시작 5년 전까지
      const maxOffset = 10; // 대운 시작 10년 후까지
      
      if (direction === 'left') {
        return Math.max(minOffset, prev - step);
      } else {
        return Math.min(maxOffset, prev + step);
      }
    });
  }, []);

  // 잘못된 경로인 경우 리다이렉트
  useEffect(() => {
    if (!match || !params?.id) {
      console.error("Invalid saju result route");
      setLocation("/manseryeok");
    }
  }, [match, params?.id, setLocation]);

  // 핸들러 함수들
  const handleBack = () => {
    setLocation("/manseryeok");
  };

  const handleSave = () => {
    if (sajuData?.data) {
      saveMutation.mutate(sajuData.data.memo || "");
    }
  };

  const handleEdit = () => {
    if (sajuData?.data) {
      const record = sajuData.data;
      const queryParams = new URLSearchParams({
        name: record.name || '',
        year: record.birthYear.toString(),
        month: record.birthMonth.toString(),
        day: record.birthDay.toString(),
        birthTime: record.birthTime || '',
        calendarType: record.calendarType || '양력',
        gender: record.gender || '남자',
        memo: record.memo || '',
        edit: 'true',
        id: record.id
      }).toString();
      
      setLocation(`/saju-input?${queryParams}`);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">사주 명식을 불러오는 중...</div>
      </div>
    );
  }

  // 데이터 없음
  if (!calculatedData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-lg text-muted-foreground">사주 정보를 찾을 수 없습니다.</div>
        <Button onClick={handleBack}>돌아가기</Button>
      </div>
    );
  }

  const { record, timePeriod, heavenlyYukjin, earthlyYukjin, daeunData } = calculatedData;

  // 메인 테이블 그리드 컬럼 수 계산 (사주 4주 + 대운 개수)
  const mainTableCols = 4 + daeunData.daeunPeriods.length;
  const getMainGridCols = (cols: number) => {
    if (cols <= 12) return "grid-cols-12";
    if (cols <= 13) return "grid-cols-13";
    return "grid-cols-14"; // 최대 14컬럼
  };
  const mainGridCols = getMainGridCols(mainTableCols);
  
  // 歲運 행 그리드 컬럼 수 (사주 4주 라벨 + 실제 歲運 윈도우)
  const saeunTableCols = saeunData ? 4 + saeunData.years.length : 16;
  const getSaeunGridCols = (cols: number) => {
    if (cols <= 14) return "grid-cols-14";
    if (cols <= 15) return "grid-cols-15";
    if (cols <= 16) return "grid-cols-16";
    return "grid-cols-17"; // 최대값
  };
  const saeunGridCols = getSaeunGridCols(saeunTableCols);

  return (
    <div className="min-h-screen bg-background p-2">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBack}
          data-testid="button-back-manseryeok"
          className="hover-elevate active-elevate-2 flex items-center gap-2 ml-0 pl-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">뒤로</span>
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold text-foreground font-tmon">사주명식</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEdit}
            data-testid="button-edit"
            className="hover-elevate active-elevate-2 flex items-center gap-1 min-h-6 px-2 py-0.5 text-xs"
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm">수정</span>
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save"
            className="hover-elevate active-elevate-2 flex items-center gap-1 min-h-6 px-2 py-0.5 text-xs"
          >
            <Save className="h-4 w-4" />
            <span className="text-sm">{saveMutation.isPending ? "저장중..." : "저장"}</span>
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* 사주명식 테이블 */}
        <SajuTable 
          saju={(() => {
            try {
              return calculateSaju(
                record.birthYear, 
                record.birthMonth, 
                record.birthDay, 
                timePeriod?.hour || 0
              );
            } catch (error) {
              console.warn('Failed to calculate saju:', error);
              return {
                hour: { sky: record.hourSky || '甲', earth: record.hourEarth || '子' },
                day: { sky: record.daySky || '甲', earth: record.dayEarth || '子' },
                month: { sky: record.monthSky || '甲', earth: record.monthEarth || '子' },
                year: { sky: record.yearSky || '甲', earth: record.yearEarth || '子' },
                wuxing: {
                  hourSky: '목', hourEarth: '수', 
                  daySky: '목', dayEarth: '수',
                  monthSky: '목', monthEarth: '수',
                  yearSky: '목', yearEarth: '수'
                }
              };
            }
          })()}
          title="사주 명식표"
          name={record.name}
          birthYear={record.birthYear}
          birthMonth={record.birthMonth}
          birthDay={record.birthDay}
          lunarYear={record.lunarYear || undefined}
          lunarMonth={record.lunarMonth || undefined}
          lunarDay={record.lunarDay || undefined}
          birthHour={record.birthTime || ''}
          daySky={record.daySky || ''}
          dayEarth={record.dayEarth || ''}
          gender={record.gender || '남자'}
          memo={record.memo || ''}
          daeunPeriods={calculatedData?.daeunData.daeunPeriods || []}
          focusedDaeun={focusedDaeun}
          currentAge={calculatedData?.currentAge || null}
          saeunOffset={saeunOffset}
          saeunData={saeunData}
          onDaeunClick={handleDaeunClick}
          onSaeunClick={handleSaeunClick}
          onSaeunScroll={handleSaeunScroll}
        />


      </div>
    </div>
  );
}