import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SajuTable from "@/components/SajuTable";
import DatePicker from "@/components/DatePicker";
import FortuneCard from "@/components/FortuneCard";
import { calculateSaju, getCurrentSaju } from "@/lib/saju-calculator";
import { type SajuInfo } from "@shared/schema";
import { RefreshCw, Sparkles } from "lucide-react";

export default function Home() {
  const [currentSaju, setCurrentSaju] = useState<SajuInfo>(getCurrentSaju());
  const [customSaju, setCustomSaju] = useState<SajuInfo | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // 현재 시각 자동 업데이트 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSaju(getCurrentSaju());
      setLastUpdated(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const handleDateSelect = (year: number, month: number, day: number, hour: number, isLunar: boolean) => {
    const newSaju = calculateSaju(year, month, day, hour, isLunar);
    setCustomSaju(newSaju);
    setShowDatePicker(false);
    console.log('Custom saju calculated:', newSaju);
  };

  const handleRefresh = () => {
    setCurrentSaju(getCurrentSaju());
    setLastUpdated(new Date());
    console.log('Current saju refreshed');
  };

  const handleNewInput = () => {
    setShowDatePicker(true);
    console.log('Date picker opened');
  };

  const getDominantElement = (saju: SajuInfo) => {
    // 간단한 오행 계산 - 가장 많이 나타나는 오행 반환
    const elements = [
      saju.wuxing.yearSky,
      saju.wuxing.yearEarth,
      saju.wuxing.monthSky,
      saju.wuxing.monthEarth,
      saju.wuxing.daySky,
      saju.wuxing.dayEarth,
      saju.wuxing.hourSky,
      saju.wuxing.hourEarth
    ];

    const count: Record<string, number> = {};
    elements.forEach(element => {
      count[element] = (count[element] || 0) + 1;
    });

    return Object.entries(count).reduce((a, b) => 
      count[a[0]] > count[b[0]] ? a : b
    )[0] as any;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-md space-y-6">
        {/* 환영 메시지 */}
        <Card className="p-4 text-center bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-serif">전통 만세력</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            사주명리학 기반 운세와 만세력 정보를 제공합니다
          </p>
        </Card>

        {/* 현재 시각의 만세력 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">현재 시각의 만세력</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              data-testid="button-refresh-current"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              갱신
            </Button>
          </div>
          
          <SajuTable 
            saju={currentSaju}
            title={`현재 만세력 (${lastUpdated.toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })})`}
            showWuxing={true}
          />

          <FortuneCard 
            dominantElement={getDominantElement(currentSaju)}
            className="mt-4"
          />
        </div>

        {/* 생년월일 입력 버튼 */}
        <div className="space-y-3">
          <Button 
            onClick={handleNewInput}
            className="w-full"
            variant={customSaju ? "secondary" : "default"}
            data-testid="button-new-input"
          >
            {customSaju ? "다른 생년월일 보기" : "내 생년월일로 사주 보기"}
          </Button>

          {showDatePicker && (
            <DatePicker 
              onDateSelect={handleDateSelect}
            />
          )}
        </div>

        {/* 입력한 생년월일의 사주 */}
        {customSaju && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">내 사주팔자</h3>
            <SajuTable 
              saju={customSaju}
              title="개인 사주팔자"
              showWuxing={true}
            />
            
            <FortuneCard 
              dominantElement={getDominantElement(customSaju)}
              className="mt-4"
            />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCustomSaju(null);
                console.log('Custom saju cleared');
              }}
              data-testid="button-clear-custom"
              className="w-full"
            >
              현재 시각 만세력으로 돌아가기
            </Button>
          </div>
        )}

        {/* 하단 여백 (네비게이션 공간) */}
        <div className="h-20" />
      </div>
    </div>
  );
}