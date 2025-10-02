import { useLocation as useWouterLocation, useSearch } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Edit, Moon, Sun, Heart } from "lucide-react";
import SajuTable from "@/components/SajuTable";
import { findGanjiIndex } from "@/lib/ganji-calculator";
import { calculateCompleteDaeun, calculateCurrentAge } from "@/lib/daeun-calculator";
import { useTheme } from "@/components/ThemeProvider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedYear) {
        throw new Error('연도를 선택해주세요');
      }

      const response = await apiRequest('POST', '/api/saju-records', {
        name: name.trim() || '이름없음',
        birthYear: selectedYear,
        birthMonth: null,
        birthDay: null,
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

      const response = await apiRequest('PUT', `/api/saju-records/${recordId}`, {
        birthYear: selectedYear,
        birthMonth: null,
        birthDay: null,
        yearSky,
        yearEarth,
        monthSky,
        monthEarth,
        daySky,
        dayEarth,
        hourSky,
        hourEarth,
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/compatibility')}
            data-testid="button-compatibility"
            className="hover-elevate active-elevate-2 flex items-center gap-0.5 min-h-6 px-2 py-0.5 text-xs"
          >
            <Heart className="h-3 w-3" />
            <span className="text-xs">궁합</span>
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
          currentAge={currentAge}
        />
      </div>
    </div>
  );
}
