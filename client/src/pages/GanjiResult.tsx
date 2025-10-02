import { useLocation as useWouterLocation, useSearch } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import SajuTable from "@/components/SajuTable";
import { findGanjiIndex } from "@/lib/ganji-calculator";
import { calculateCompleteDaeun, calculateCurrentAge } from "@/lib/daeun-calculator";

export default function GanjiResult() {
  const [, setLocation] = useWouterLocation();
  const searchParams = new URLSearchParams(useSearch());
  
  const yearSky = searchParams.get('yearSky') || '';
  const yearEarth = searchParams.get('yearEarth') || '';
  const monthSky = searchParams.get('monthSky') || '';
  const monthEarth = searchParams.get('monthEarth') || '';
  const daySky = searchParams.get('daySky') || '';
  const dayEarth = searchParams.get('dayEarth') || '';
  const hourSky = searchParams.get('hourSky') || '';
  const hourEarth = searchParams.get('hourEarth') || '';
  const gender = searchParams.get('gender') || '남자';
  
  // 선택된 연도 상태
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/ganji-input")}
              data-testid="button-back"
              className="hover-elevate active-elevate-2 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">뒤로</span>
            </Button>
            <h1 className="text-xl font-bold text-foreground">간지 사주 결과</h1>
            <div className="w-[60px]"></div>
          </div>
        </div>

        {/* 가능한 연도 선택 */}
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
                  variant={selectedYear === year ? "default" : "outline"}
                  onClick={() => setSelectedYear(year)}
                  className="h-auto px-4 py-2"
                  data-testid={`button-year-${year}`}
                >
                  {year}년
                </Button>
              ))}
            </div>
            {!selectedYear && (
              <p className="text-xs text-muted-foreground mt-3">
                * 연도를 선택하시면 나이, 대운 등의 상세 정보를 확인할 수 있습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 사주 테이블 */}
        <SajuTable
          saju={saju}
          title="간지로 입력한 사주"
          name="미상"
          birthYear={selectedYear || undefined}
          birthMonth={selectedYear ? 1 : undefined}
          birthDay={selectedYear ? 1 : undefined}
          gender={gender}
          daeunPeriods={daeunData?.daeunPeriods || []}
          currentAge={currentAge}
        />

        {/* 안내 메시지 */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              간지로 입력한 사주입니다. 정확한 생년월일시를 아신다면 
              <br />
              <button 
                className="text-primary underline hover:text-primary/80"
                onClick={() => setLocation("/saju-input")}
              >
                생년월일로 입력하기
              </button>
              를 이용해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
