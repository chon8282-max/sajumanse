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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
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
            <h1 className="text-xl font-bold text-foreground">팔자로 생일 입력</h1>
            <div className="w-[60px]"></div>
          </div>
        </div>

        {/* 현재 단계 */}
        <Card>
          <CardHeader>
            <CardTitle>{renderStepTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === "year" && (
              <div className="grid grid-cols-6 gap-2">
                {ganjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleYearSelect(ganji.sky, ganji.earth)}
                    className="h-7"
                    data-testid={`button-year-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "month" && (
              <div className="grid grid-cols-6 gap-2">
                {monthGanjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleMonthSelect(ganji.sky, ganji.earth)}
                    className="h-7"
                    data-testid={`button-month-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "day" && (
              <div className="grid grid-cols-6 gap-2">
                {ganjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleDaySelect(ganji.sky, ganji.earth)}
                    className="h-7"
                    data-testid={`button-day-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "hour" && (
              <div className="grid grid-cols-6 gap-2">
                {hourGanjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleHourSelect(ganji.sky, ganji.earth)}
                    className="h-7"
                    data-testid={`button-hour-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
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
