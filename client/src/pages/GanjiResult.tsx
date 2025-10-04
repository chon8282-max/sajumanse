import { useLocation as useWouterLocation, useSearch } from "wouter";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Edit, Moon, Sun } from "lucide-react";
import SajuTable from "@/components/SajuTable";
import { findGanjiIndex } from "@/lib/ganji-calculator";
import { calculateCompleteDaeun, calculateCurrentAge, DaeunPeriod, findCurrentDaeun } from "@/lib/daeun-calculator";
import { useTheme } from "@/components/ThemeProvider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { reverseCalculateSolarDate } from "@/lib/reverse-ganji-calculator";
import { calculateHourGanji } from "@/lib/ganji-calculator";
import { CHEONGAN, JIJI } from "@shared/schema";

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

// 세운 계산 함수
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

type DisplayMode = 'base' | 'daeun' | 'saeun';

interface SaeunInfo {
  age: number;
  sky: string;
  earth: string;
}

export default function GanjiResult() {
  const [, setLocation] = useWouterLocation();
  const searchParams = new URLSearchParams(useSearch());
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const yearSky = searchParams.get('yearSky') || '';
  const yearEarth = searchParams.get('yearEarth') || '';
  const monthSky = searchParams.get('monthSky') || '';
  const monthEarth = searchParams.get('monthEarth') || '';
  const daySky = searchParams.get('daySky') || '';
  const dayEarth = searchParams.get('dayEarth') || '';
  const hourSky = searchParams.get('hourSky') || '';
  const hourEarth = searchParams.get('hourEarth') || '';
  const gender = searchParams.get('gender') || '남자';
  const nameFromUrl = searchParams.get('name') || '';
  const fromEdit = searchParams.get('fromEdit') === 'true';
  const recordId = searchParams.get('id') || '';
  
  // 선택된 연도 상태
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  // 이름 상태
  const name = nameFromUrl || '이름없음';
  const isEditMode = fromEdit && recordId;

  // 대운/세운 모드 상태
  const [displayMode, setDisplayMode] = useState<DisplayMode>('base');
  const [focusedDaeun, setFocusedDaeun] = useState<DaeunPeriod | null>(null);
  const [focusedSaeun, setFocusedSaeun] = useState<SaeunInfo | null>(null);
  const [saeunOffset, setSaeunOffset] = useState(0);

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedYear) {
        throw new Error('연도를 선택해주세요');
      }

      // 간지로부터 양력 날짜 역산
      const reversedDate = reverseCalculateSolarDate({
        yearSky,
        yearEarth,
        monthSky,
        monthEarth,
        daySky,
        dayEarth,
        hourSky,
        hourEarth
      }, selectedYear);

      if (!reversedDate) {
        throw new Error('날짜 역산에 실패했습니다');
      }

      // 양력을 음력으로 변환
      let lunarData = null;
      try {
        const lunarResponse = await apiRequest('POST', '/api/lunar-solar/convert/lunar', {
          solYear: reversedDate.year,
          solMonth: reversedDate.month,
          solDay: reversedDate.day
        });
        const lunarResult = await lunarResponse.json();
        if (lunarResult.success && lunarResult.data) {
          lunarData = {
            lunarYear: lunarResult.data.lunYear,
            lunarMonth: lunarResult.data.lunMonth,
            lunarDay: lunarResult.data.lunDay
          };
        } else {
          console.warn('음력 변환 결과 없음:', lunarResult);
        }
      } catch (error) {
        console.error('음력 변환 실패:', error);
        toast({
          title: "음력 변환 실패",
          description: "음력 정보를 가져올 수 없습니다. 양력 정보만 저장됩니다.",
          variant: "destructive",
        });
      }

      const response = await apiRequest('POST', '/api/saju-records', {
        name: name.trim() || '이름없음',
        birthYear: reversedDate.year,
        birthMonth: reversedDate.month,
        birthDay: reversedDate.day,
        birthTime: null,
        calendarType: 'ganji',
        gender: gender,
        memo: `간지 입력: ${yearSky}${yearEarth}년 ${monthSky}${monthEarth}월 ${daySky}${dayEarth}일 ${hourSky}${hourEarth}시`,
        yearSky,
        yearEarth,
        monthSky,
        monthEarth,
        daySky,
        dayEarth,
        hourSky,
        hourEarth,
        lunarYear: lunarData?.lunarYear || null,
        lunarMonth: lunarData?.lunarMonth || null,
        lunarDay: lunarData?.lunarDay || null,
      });
      
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records'] });
      
      if (data.data?.id) {
        setLocation(`/saju-result/${data.data.id}`);
      } else {
        toast({
          title: "저장 완료",
          description: "사주 정보가 성공적으로 저장되었습니다.",
          duration: 700
        });
      }
    },
    onError: (error) => {
      toast({
        title: "저장 오류",
        description: error instanceof Error ? error.message : "사주 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 업데이트 mutation (수정 모드)
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedYear) {
        throw new Error('연도를 선택해주세요');
      }
      if (!recordId) {
        throw new Error('레코드 ID가 없습니다');
      }

      // 간지로부터 양력 날짜 역산
      const reversedDate = reverseCalculateSolarDate({
        yearSky,
        yearEarth,
        monthSky,
        monthEarth,
        daySky,
        dayEarth,
        hourSky,
        hourEarth
      }, selectedYear);

      if (!reversedDate) {
        throw new Error('날짜 역산에 실패했습니다');
      }

      // 양력을 음력으로 변환
      let lunarData = null;
      try {
        const lunarResponse = await apiRequest('POST', '/api/lunar-solar/convert/lunar', {
          solYear: reversedDate.year,
          solMonth: reversedDate.month,
          solDay: reversedDate.day
        });
        const lunarResult = await lunarResponse.json();
        if (lunarResult.success && lunarResult.data) {
          lunarData = {
            lunarYear: lunarResult.data.lunYear,
            lunarMonth: lunarResult.data.lunMonth,
            lunarDay: lunarResult.data.lunDay
          };
        } else {
          console.warn('음력 변환 결과 없음:', lunarResult);
        }
      } catch (error) {
        console.error('음력 변환 실패:', error);
        toast({
          title: "음력 변환 실패",
          description: "음력 정보를 가져올 수 없습니다. 양력 정보만 저장됩니다.",
          variant: "destructive",
        });
      }

      const response = await apiRequest('PUT', `/api/saju-records/${recordId}`, {
        birthYear: reversedDate.year,
        birthMonth: reversedDate.month,
        birthDay: reversedDate.day,
        yearSky,
        yearEarth,
        monthSky,
        monthEarth,
        daySky,
        dayEarth,
        hourSky,
        hourEarth,
        lunarYear: lunarData?.lunarYear || null,
        lunarMonth: lunarData?.lunarMonth || null,
        lunarDay: lunarData?.lunarDay || null,
      });
      
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', recordId] });
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records'] });
      
      setLocation(`/saju-result/${recordId}`);
    },
    onError: (error) => {
      toast({
        title: "업데이트 오류",
        description: error instanceof Error ? error.message : "사주 정보 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!selectedYear) {
      toast({
        title: "연도 선택 필요",
        description: "출생 연도를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  const handleEdit = () => {
    if (isEditMode && recordId) {
      setLocation(`/saju-result/${recordId}`);
    } else {
      setLocation('/ganji-input');
    }
  };

  const handleBack = () => {
    setLocation('/manseryeok');
  };

  // 생시 변경 핸들러
  const handleBirthTimeChange = (timeCode: string) => {
    // timeCode: "寅時" 형식
    // 지지 추출: "寅時" → "寅"
    const hourEarth = timeCode.replace('時', '');
    
    // 일간으로부터 가능한 시주 계산
    const possibleHours = calculateHourGanji(daySky);
    
    // 지지가 일치하는 시주 찾기
    const matchedHour = possibleHours.find(h => h.earth === hourEarth);
    
    if (matchedHour) {
      const params = new URLSearchParams(searchParams);
      params.set('hourSky', matchedHour.sky);
      params.set('hourEarth', matchedHour.earth);
      setLocation(`/ganji-result?${params.toString()}`);
    }
  };

  // 파라미터 검증
  useEffect(() => {
    if (!yearSky || !yearEarth || !monthSky || !monthEarth || !daySky || !dayEarth || !hourSky || !hourEarth) {
      // 필수 파라미터가 없으면 입력 페이지로 리다이렉트
      setLocation('/ganji-input');
    }
  }, [yearSky, yearEarth, monthSky, monthEarth, daySky, dayEarth, hourSky, hourEarth, setLocation]);

  // 간지 인덱스 계산 (60갑자 주기)
  const yearIndex = findGanjiIndex(yearSky, yearEarth);
  const monthIndex = findGanjiIndex(monthSky, monthEarth);
  const dayIndex = findGanjiIndex(daySky, dayEarth);
  const hourIndex = findGanjiIndex(hourSky, hourEarth);

  // 오행 계산 (간단 버전)
  type WuXing = '목' | '화' | '토' | '금' | '수';
  
  const getWuxing = (sky: string): WuXing => {
    const wuxingMap: { [key: string]: WuXing } = {
      '甲': '목', '乙': '목',
      '丙': '화', '丁': '화',
      '戊': '토', '己': '토',
      '庚': '금', '辛': '금',
      '壬': '수', '癸': '수',
    };
    return wuxingMap[sky] || '목';
  };

  const getEarthWuxing = (earth: string): WuXing => {
    const wuxingMap: { [key: string]: WuXing } = {
      '子': '수', '丑': '토', '寅': '목', '卯': '목',
      '辰': '토', '巳': '화', '午': '화', '未': '토',
      '申': '금', '酉': '금', '戌': '토', '亥': '수',
    };
    return wuxingMap[earth] || '수';
  };

  const saju = {
    hour: { sky: hourSky, earth: hourEarth },
    day: { sky: daySky, earth: dayEarth },
    month: { sky: monthSky, earth: monthEarth },
    year: { sky: yearSky, earth: yearEarth },
    wuxing: {
      hourSky: getWuxing(hourSky),
      hourEarth: getEarthWuxing(hourEarth),
      daySky: getWuxing(daySky),
      dayEarth: getEarthWuxing(dayEarth),
      monthSky: getWuxing(monthSky),
      monthEarth: getEarthWuxing(monthEarth),
      yearSky: getWuxing(yearSky),
      yearEarth: getEarthWuxing(yearEarth),
    }
  };

  const calculatePossibleYears = () => {
    // 60갑자 주기 계산
    const currentYear = new Date().getFullYear();
    const baseYear = 1984; // 갑자년
    const yearOffset = (yearIndex - findGanjiIndex('甲', '子') + 60) % 60;
    
    const possibleYears: number[] = [];
    for (let i = -2; i <= 2; i++) {
      const year = baseYear + yearOffset + (i * 60);
      if (year > 1900 && year <= currentYear + 10) {
        possibleYears.push(year);
      }
    }
    
    return possibleYears;
  };

  const possibleYears = calculatePossibleYears();

  // 선택된 연도가 있을 때 나이 계산
  const currentAge = useMemo(() => {
    if (!selectedYear) return undefined;
    return calculateCurrentAge(selectedYear, 1, 1); // 월일은 1월 1일로 가정
  }, [selectedYear]);

  // 선택된 연도가 있을 때 대운 계산
  const daeunData = useMemo(() => {
    if (!selectedYear) return null;
    
    return calculateCompleteDaeun({
      gender: gender,
      yearSky: yearSky,
      monthSky: monthSky,
      monthEarth: monthEarth,
      birthYear: selectedYear,
      birthMonth: 1, // 월일은 가정값
      birthDay: 1
    });
  }, [selectedYear, gender, yearSky, monthSky, monthEarth]);

  // 현재 대운 찾기
  const currentDaeun = useMemo(() => {
    if (!currentAge || !daeunData?.daeunPeriods) return null;
    return findCurrentDaeun(currentAge, daeunData.daeunPeriods);
  }, [currentAge, daeunData?.daeunPeriods]);

  // 세운 데이터 계산
  const saeunData = useMemo(() => {
    if (!yearSky || !yearEarth || !focusedDaeun || !selectedYear) {
      return null;
    }
    
    return calculateSaeun(
      selectedYear, 
      yearSky, 
      yearEarth, 
      12,
      focusedDaeun.startAge - 1 + saeunOffset
    );
  }, [selectedYear, yearSky, yearEarth, focusedDaeun, saeunOffset]);

  // 연도 변경 시 모든 상태 리셋
  useEffect(() => {
    if (selectedYear) {
      console.log('GanjiResult - 연도 변경으로 상태 리셋:', selectedYear);
      setDisplayMode('base');
      setFocusedDaeun(null);
      setFocusedSaeun(null);
      setSaeunOffset(0);
    }
  }, [selectedYear]);

  // focusedDaeun 초기 설정 (displayMode가 'base'일 때만)
  useEffect(() => {
    if (currentDaeun && !focusedDaeun && displayMode === 'base') {
      console.log('GanjiResult - focusedDaeun 초기 설정:', currentDaeun);
      setFocusedDaeun(currentDaeun);
      setSaeunOffset(0);
    }
  }, [currentDaeun, focusedDaeun, displayMode]);

  // 대운 클릭 핸들러
  const handleDaeunClick = useCallback((daeunPeriod: DaeunPeriod) => {
    console.log(`[GanjiResult] handleDaeunClick called - currentMode=${displayMode}, daeunPeriod=`, daeunPeriod);
    if (displayMode === 'base') {
      // A → B: 대운 선택 및 대운 모드로 전환
      console.log('[GanjiResult] A → B: 대운 모드로 전환');
      setFocusedDaeun(daeunPeriod);
      setDisplayMode('daeun');
      setSaeunOffset(0);
    } else if (displayMode === 'daeun') {
      // B → A: 같은 대운 클릭 시 기본 모드로 복귀
      if (focusedDaeun?.startAge === daeunPeriod.startAge) {
        console.log('[GanjiResult] B → A: 기본 모드로 복귀');
        setDisplayMode('base');
        setFocusedDaeun(null);
      } else {
        // 다른 대운 클릭 시 대운만 변경
        console.log('[GanjiResult] B → B: 다른 대운 선택');
        setFocusedDaeun(daeunPeriod);
        setSaeunOffset(0);
      }
    } else if (displayMode === 'saeun') {
      // C → B: 같은 대운 클릭 시 세운 숨김 (대운만 표시)
      if (focusedDaeun?.startAge === daeunPeriod.startAge) {
        console.log('[GanjiResult] C → B: 세운 숨김');
        setDisplayMode('daeun');
        setFocusedSaeun(null);
      } else {
        // C → B: 다른 대운 클릭 시 대운 변경 및 세운 숨김
        console.log('[GanjiResult] C → B: 다른 대운 선택 및 세운 숨김');
        setFocusedDaeun(daeunPeriod);
        setDisplayMode('daeun');
        setFocusedSaeun(null);
        setSaeunOffset(0);
      }
    }
  }, [displayMode, focusedDaeun]);

  // 세운 클릭 핸들러 
  const handleSaeunClick = useCallback((age: number, sky: string, earth: string) => {
    if (!daeunData?.daeunPeriods) return;
    
    if (displayMode === 'daeun') {
      // B → C: 세운 선택 및 세운 모드로 전환
      setFocusedSaeun({ age, sky, earth });
      setDisplayMode('saeun');
    } else if (displayMode === 'saeun') {
      // C → B: 같은 세운 클릭 시 대운만 표시
      if (focusedSaeun?.age === age) {
        setDisplayMode('daeun');
        setFocusedSaeun(null);
      } else {
        // 다른 세운 클릭 시 세운 변경
        setFocusedSaeun({ age, sky, earth });
      }
    }
  }, [daeunData, displayMode, focusedSaeun]);

  // 세운 드래그/스크롤 핸들러
  const handleSaeunScroll = useCallback((direction: 'left' | 'right') => {
    setSaeunOffset(prev => {
      const step = 5; // 5년씩 이동
      if (direction === 'left') {
        return prev - step;
      } else {
        return prev + step;
      }
    });
  }, []);

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
          <h1 className="font-bold text-foreground font-tmon text-[20px]">사주명식</h1>
        </div>
        <div className="flex items-center gap-0.5 mr-0">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            className="hover-elevate active-elevate-2 h-8 w-8"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEdit}
            data-testid="button-edit"
            className="hover-elevate active-elevate-2 flex items-center gap-0.5 min-h-6 px-2 py-0.5 text-xs"
          >
            <Edit className="h-3 w-3" />
            <span className="text-xs">수정</span>
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSave}
            disabled={(isEditMode ? updateMutation.isPending : saveMutation.isPending) || !selectedYear}
            data-testid="button-save"
            className="hover-elevate active-elevate-2 flex items-center gap-0.5 min-h-6 px-2 py-0.5 text-xs"
          >
            <Save className="h-3 w-3" />
            <span className="text-xs">
              {isEditMode 
                ? (updateMutation.isPending ? "업데이트중..." : "업데이트")
                : (saveMutation.isPending ? "저장중..." : "저장")
              }
            </span>
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* 가능한 연도 선택 - 연도가 선택되지 않았을 때만 표시 */}
        {!selectedYear && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">출생 연도 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                선택하신 사주는 60년 주기로 반복됩니다. 해당하는 연도를 선택하세요.
              </p>
              <div className="flex flex-wrap gap-2">
                {possibleYears.map((year) => (
                  <Button
                    key={year}
                    variant="outline"
                    onClick={() => setSelectedYear(year)}
                    className="h-auto px-4 py-2"
                    data-testid={`button-year-${year}`}
                  >
                    {year}년
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 사주 테이블 */}
        <SajuTable
          saju={saju}
          title="사주 명식표"
          name={name.trim() || '이름없음'}
          birthYear={selectedYear || undefined}
          birthMonth={undefined}
          birthDay={undefined}
          gender={gender}
          yearSky={yearSky || undefined}
          yearEarth={yearEarth || undefined}
          monthSky={monthSky || undefined}
          monthEarth={monthEarth || undefined}
          daySky={daySky || undefined}
          dayEarth={dayEarth || undefined}
          hourSky={hourSky || undefined}
          hourEarth={hourEarth || undefined}
          calendarType="ganji"
          daeunPeriods={daeunData?.daeunPeriods || []}
          focusedDaeun={focusedDaeun}
          focusedSaeun={focusedSaeun}
          displayMode={displayMode}
          currentAge={currentAge}
          saeunOffset={saeunOffset}
          saeunData={saeunData}
          onDaeunClick={handleDaeunClick}
          onSaeunClick={handleSaeunClick}
          onSaeunScroll={handleSaeunScroll}
          onBirthTimeChange={handleBirthTimeChange}
        />
      </div>
    </div>
  );
}
