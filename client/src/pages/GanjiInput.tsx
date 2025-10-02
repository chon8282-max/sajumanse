import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { CHEONGAN, JIJI } from "@shared/schema";

type Step = "year" | "month" | "day" | "hour" | "gender" | "result";

interface GanjiSelection {
  year?: { sky: string; earth: string };
  month?: { sky: string; earth: string };
  day?: { sky: string; earth: string };
  hour?: { sky: string; earth: string };
  gender?: string;
}

export default function GanjiInput() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("year");
  const [selection, setSelection] = useState<GanjiSelection>({});

  // 60갑자 생성
  const generate60Ganji = () => {
    const ganji: { sky: string; earth: string; label: string }[] = [];
    for (let i = 0; i < 60; i++) {
      const sky = CHEONGAN[i % 10];
      const earth = JIJI[i % 12];
      ganji.push({ sky, earth, label: `${sky}${earth}` });
    }
    return ganji;
  };

  const ganjiList = generate60Ganji();

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
    setCurrentStep("result");
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

        {/* 선택된 정보 표시 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">선택된 사주</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">년주</p>
                <p className="font-bold text-lg">
                  {selection.year ? `${selection.year.sky}${selection.year.earth}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">월주</p>
                <p className="font-bold text-lg">
                  {selection.month ? `${selection.month.sky}${selection.month.earth}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">일주</p>
                <p className="font-bold text-lg">
                  {selection.day ? `${selection.day.sky}${selection.day.earth}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">시주</p>
                <p className="font-bold text-lg">
                  {selection.hour ? `${selection.hour.sky}${selection.hour.earth}` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    className="h-12"
                    data-testid={`button-year-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "month" && (
              <div className="text-center p-8">
                <p className="text-muted-foreground">월주 계산 로직 구현 예정</p>
              </div>
            )}

            {currentStep === "day" && (
              <div className="grid grid-cols-6 gap-2">
                {ganjiList.map((ganji, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleDaySelect(ganji.sky, ganji.earth)}
                    className="h-12"
                    data-testid={`button-day-${ganji.label}`}
                  >
                    {ganji.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep === "hour" && (
              <div className="text-center p-8">
                <p className="text-muted-foreground">시주 계산 로직 구현 예정</p>
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
