import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { generate60Ganji, calculateMonthGanji, calculateHourGanji } from "@/lib/ganji-calculator";

type Step = "year" | "month" | "day" | "hour" | "gender" | "name" | "result";

interface GanjiSelection {
  year?: { sky: string; earth: string };
  month?: { sky: string; earth: string };
  day?: { sky: string; earth: string };
  hour?: { sky: string; earth: string };
  gender?: string;
  name?: string;
}

export default function GanjiInput() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("year");
  const [selection, setSelection] = useState<GanjiSelection>({});

  const ganjiList = useMemo(() => generate60Ganji(), []);
  
  // 월주 목록 (년주에 따라)
  const monthGanjiList = useMemo(() => {
    if (!selection.year) return [];
    return calculateMonthGanji(selection.year.sky);
  }, [selection.year]);
  
  // 시주 목록 (일주에 따라)
  const hourGanjiList = useMemo(() => {
    if (!selection.day) return [];
    return calculateHourGanji(selection.day.sky);
  }, [selection.day]);

  const handleYearSelect = (sky: string, earth: string) => {
    setSelection({ ...selection, year: { sky, earth } });
    setCurrentStep("month");
  };

  const handleMonthSelect = (sky: string, earth: string) => {
    setSelection({ ...selection, month: { sky, earth } });
    setCurrentStep("day");
  };

  const handleDaySelect = (sky: string, earth: string) => {
    setSelection({ ...selection, day: { sky, earth } });
    setCurrentStep("hour");
  };

  const handleHourSelect = (sky: string, earth: string) => {
    setSelection({ ...selection, hour: { sky, earth } });
    setCurrentStep("gender");
  };

  const handleGenderSelect = (gender: string) => {
    setSelection({ ...selection, gender });
    setCurrentStep("name");
  };

  const handleNameSubmit = () => {
    // 간지가 모두 선택되었으면 사주 결과로 이동
    if (selection.year && selection.month && selection.day && selection.hour && selection.gender) {
      const nameValue = selection.name?.trim() || "이름없음";
      
      // 사주 결과 페이지로 이동 (간지 정보를 URL 파라미터로 전달)
      const params = new URLSearchParams({
        yearSky: selection.year.sky,
        yearEarth: selection.year.earth,
        monthSky: selection.month.sky,
        monthEarth: selection.month.earth,
        daySky: selection.day.sky,
        dayEarth: selection.day.earth,
        hourSky: selection.hour.sky,
        hourEarth: selection.hour.earth,
        gender: selection.gender,
        name: nameValue,
        fromGanji: 'true'
      });
      setLocation(`/ganji-result?${params.toString()}`);
    }
  };

  const handleBack = () => {
    if (currentStep === "year") {
      setLocation("/manseryeok");
    } else if (currentStep === "month") {
      setCurrentStep("year");
    } else if (currentStep === "day") {
      setCurrentStep("month");
    } else if (currentStep === "hour") {
      setCurrentStep("day");
    } else if (currentStep === "gender") {
      setCurrentStep("hour");
    } else if (currentStep === "name") {
      setCurrentStep("gender");
    }
  };

  const renderStepTitle = () => {
    switch (currentStep) {
      case "year":
        return "년주(年柱) 선택";
      case "month":
        return "월주(月柱) 선택";
      case "day":
        return "일주(日柱) 선택";
      case "hour":
        return "시주(時柱) 선택";
      case "gender":
        return "성별 선택";
      case "name":
        return "이름 입력";
      case "result":
        return "가능한 날짜";
      default:
        return "";
    }
  };

  // 10개 단위로 색상 구분 (0-9, 10-19, 20-29, 30-39, 40-49, 50-59)
  const getGanjiColorClass = (index: number) => {
    const group = Math.floor(index / 10);
    switch (group) {
      case 0: // 0-9: 그린톤
        return "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100";
      case 1: // 10-19: 블루톤
        return "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100";
      case 2: // 20-29: 옐로우톤
        return "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-800/40 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100";
      case 3: // 30-39: 퍼플톤
        return "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100";
      case 4: // 40-49: 핑크톤
        return "bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-800/40 border-pink-300 dark:border-pink-700 text-pink-900 dark:text-pink-100";
      case 5: // 50-59: 오렌지톤
        return "bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-800/40 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
              className="hover-elevate active-elevate-2 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">뒤로</span>
            </Button>
            <h1 className="text-lg font-bold text-foreground">팔자로 생일 입력</h1>
            <div className="w-[60px]"></div>
          </div>
        </div>

        {/* 선택된 사주 미리보기 */}
        <Card className="mb-2">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">선택된 사주</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="border border-border rounded-lg overflow-hidden">
              {/* 천간 행 */}
              <div className="grid grid-cols-4 border-b border-border">
                <div className="text-center text-base font-bold border-r border-border last:border-r-0 min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.hour?.sky || '-'}</span>
                </div>
                <div className="text-center text-base font-bold border-r border-border last:border-r-0 min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.day?.sky || '-'}</span>
                </div>
                <div className="text-center text-base font-bold border-r border-border last:border-r-0 min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.month?.sky || '-'}</span>
                </div>
                <div className="text-center text-base font-bold min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.year?.sky || '-'}</span>
                </div>
              </div>
              {/* 지지 행 */}
              <div className="grid grid-cols-4">
                <div className="text-center text-base font-bold border-r border-border last:border-r-0 min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.hour?.earth || '-'}</span>
                </div>
                <div className="text-center text-base font-bold border-r border-border last:border-r-0 min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.day?.earth || '-'}</span>
                </div>
                <div className="text-center text-base font-bold border-r border-border last:border-r-0 min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.month?.earth || '-'}</span>
                </div>
                <div className="text-center text-base font-bold min-h-[2rem] flex items-center justify-center bg-white dark:bg-gray-800">
                  <span className="text-gray-800 dark:text-gray-200">{selection.year?.earth || '-'}</span>
                </div>
              </div>
              {/* 라벨 행 */}
              <div className="grid grid-cols-4 border-t border-border bg-muted/30">
                <div className="text-center text-xs py-1 border-r border-border last:border-r-0 text-muted-foreground">시주</div>
                <div className="text-center text-xs py-1 border-r border-border last:border-r-0 text-muted-foreground">일주</div>
                <div className="text-center text-xs py-1 border-r border-border last:border-r-0 text-muted-foreground">월주</div>
                <div className="text-center text-xs py-1 text-muted-foreground">년주</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 현재 단계 */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base">{renderStepTitle()}</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {currentStep === "year" && (
              <div className="grid grid-cols-5 gap-1">
                {ganjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleYearSelect(ganji.sky, ganji.earth)}
                    className={`h-7 px-2 text-sm ${getGanjiColorClass(index)}`}
                    data-testid={`button-year-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "month" && (
              <div className="grid grid-cols-5 gap-1">
                {monthGanjiList.map((ganji, index) => {
                  // 월주는 12개이므로, 전체 60간지에서의 인덱스를 찾아서 색상 적용
                  const fullGanjiIndex = ganjiList.findIndex(g => g.sky === ganji.sky && g.earth === ganji.earth);
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleMonthSelect(ganji.sky, ganji.earth)}
                      className={`h-7 px-2 text-sm ${getGanjiColorClass(fullGanjiIndex)}`}
                      data-testid={`button-month-${ganji.label}`}
                    >
                      {ganji.label}
                    </Button>
                  );
                })}
              </div>
            )}

            {currentStep === "day" && (
              <div className="grid grid-cols-5 gap-1">
                {ganjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleDaySelect(ganji.sky, ganji.earth)}
                    className={`h-7 px-2 text-sm ${getGanjiColorClass(index)}`}
                    data-testid={`button-day-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "hour" && (
              <div className="grid grid-cols-5 gap-1">
                {hourGanjiList.map((ganji, index) => {
                  // 시주는 12개이므로, 전체 60간지에서의 인덱스를 찾아서 색상 적용
                  const fullGanjiIndex = ganjiList.findIndex(g => g.sky === ganji.sky && g.earth === ganji.earth);
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleHourSelect(ganji.sky, ganji.earth)}
                      className={`h-7 px-2 text-sm ${getGanjiColorClass(fullGanjiIndex)}`}
                      data-testid={`button-hour-${ganji.label}`}
                    >
                      {ganji.label}
                    </Button>
                  );
                })}
              </div>
            )}

            {currentStep === "gender" && (
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => handleGenderSelect("남자")}
                  className="w-32 h-16 text-lg"
                  data-testid="button-gender-male"
                >
                  남자
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenderSelect("여자")}
                  className="w-32 h-16 text-lg"
                  data-testid="button-gender-female"
                >
                  여자
                </Button>
              </div>
            )}

            {currentStep === "name" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    성명
                  </Label>
                  <Input
                    id="name"
                    value={selection.name || ""}
                    onChange={(e) => setSelection({ ...selection, name: e.target.value })}
                    placeholder="이름을 입력하세요 (선택사항)"
                    data-testid="input-name"
                    className="text-base h-12"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    이름을 입력하지 않으면 "이름없음"으로 저장됩니다
                  </p>
                </div>
                <Button
                  onClick={handleNameSubmit}
                  className="w-full h-12 text-base"
                  data-testid="button-submit-name"
                >
                  사주 결과 보기
                </Button>
              </div>
            )}

            {currentStep === "result" && (
              <div className="text-center p-8">
                <p className="text-muted-foreground">가능한 날짜 계산 로직 구현 예정</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
