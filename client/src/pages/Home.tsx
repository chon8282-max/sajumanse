import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SajuTable from "@/components/SajuTable";
import CurrentTimeTable from "@/components/CurrentTimeTable";
import DatePicker from "@/components/DatePicker";
import MenuGrid from "@/components/MenuGrid";
import { calculateSaju } from "@/lib/saju-calculator";
import { getSolarTermsForCalculation } from "@/lib/solar-terms-data";
import { Solar } from "lunar-javascript";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type SajuInfo, type Announcement } from "@shared/schema";
import { RefreshCw, Save, Play } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocation } from "wouter";

export default function Home() {
  const [currentSaju, setCurrentSaju] = useState<SajuInfo | null>(null);
  const [customSaju, setCustomSaju] = useState<SajuInfo | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [lastInputData, setLastInputData] = useState<{
    year: number;
    month: number;
    day: number;
    hour: number;
    isLunar: boolean;
  } | null>(null);
  const [, setLocation] = useLocation();

  const { data: solarTermsData } = useQuery({
    queryKey: ["local-solar-terms", lastUpdated.getFullYear()],
    queryFn: async () => await getSolarTermsForCalculation(lastUpdated.getFullYear()),
    staleTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  });

  const { data: announcementsData } = useQuery<{ success: boolean; data: Announcement[] }>({
    queryKey: ["/api/announcements"],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const announcements = announcementsData?.data || [];

  const { data: lunarData } = useQuery({
    queryKey: ["local-lunar-convert", lastUpdated.getFullYear(), lastUpdated.getMonth() + 1, lastUpdated.getDate()],
    queryFn: async () => {
      try {
        const solar = Solar.fromYmd(lastUpdated.getFullYear(), lastUpdated.getMonth() + 1, lastUpdated.getDate());
        const lunar = solar.getLunar();
        return {
          success: true,
          lunYear: lunar.getYear(),
          lunMonth: lunar.getMonth(),
          lunDay: lunar.getDay(),
          lunLeapMonth: (lunar as any).isLeap ? (lunar as any).isLeap() : false
        };
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false
  });

  const getCurrentDateInfo = () => {
    const now = lastUpdated;
    const dayOfWeek = format(now, 'eeee', { locale: ko });
    let lunarStr = '';
    if (lunarData && lunarData.success) {
      const leapStr = lunarData.lunLeapMonth ? '윤' : '';
      lunarStr = `(음력 ${leapStr}${lunarData.lunMonth}월 ${lunarData.lunDay}일)`;
    }
    return { solarDate: `양력 ${format(now, 'yyyy년 M월 d일', { locale: ko })}${lunarStr}${dayOfWeek}` };
  };

  useEffect(() => {
    if (solarTermsData && solarTermsData.length > 0) {
      const updateCurrentSaju = () => {
        const now = new Date();
        setLastUpdated(now);
        try {
          const dbSolarTerms = solarTermsData.map((term: any) => ({
            name: term.name,
            date: new Date(term.date),
            month: term.month
          }));
          const saju = calculateSaju(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), false, undefined, null, undefined, dbSolarTerms);
          setCurrentSaju(saju);
        } catch (error) {
          console.error('현재 사주 계산 오류:', error);
        }
      };
      updateCurrentSaju();
      const interval = setInterval(updateCurrentSaju, 1000);
      return () => clearInterval(interval);
    }
  }, [solarTermsData]);

  const { toast } = useToast();

  const calculateMutation = useMutation({
    mutationFn: async (data: { year: number; month: number; day: number; hour: number; isLunar: boolean }) => {
      const solarTerms = await getSolarTermsForCalculation(data.year);
      const saju = calculateSaju(data.year, data.month, data.day, data.hour, 0, data.isLunar, undefined, null, undefined, solarTerms);
      if (!saju) throw new Error("사주 계산에 실패했습니다.");
      return saju;
    },
    onSuccess: (data) => {
      setCustomSaju(data);
      setShowDatePicker(false);
      toast({ title: "사주팔자 계산 완료", description: "개인 사주팔자가 성공적으로 계산되었습니다." });
    },
    onError: () => {
      toast({ title: "계산 오류", description: "사주팔자 계산 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  const handleSaveClick = () => {
    if (lastInputData) {
      setLocation(`/saju-input?year=${lastInputData.year}&month=${lastInputData.month}&day=${lastInputData.day}&hour=${lastInputData.hour}&calendarType=${lastInputData.isLunar ? '음력' : '양력'}`);
    }
  };

  const handleDateSelect = (year: number, month: number, day: number, hour: number, isLunar: boolean) => {
    setLastInputData({ year, month, day, hour, isLunar });
    calculateMutation.mutate({ year, month, day, hour, isLunar });
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 pt-2 pb-6 max-w-md space-y-4">c

        <div>
          {currentSaju ? (
            <CurrentTimeTable
              saju={currentSaju}
              title="현재 만세력"
              solarDate={getCurrentDateInfo().solarDate}
              isOffline={navigator.onLine === false}
              announcements={announcements}
            />
          ) : (
            <Card className="p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">만세력 로딩 중...</p>
              </div>
            </Card>
          )}
        </div>

        {showDatePicker && (
          <div className="space-y-3">
            <DatePicker onDateSelect={handleDateSelect} />
          </div>
        )}

        {customSaju && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">내 사주팔자</h3>
              <Button variant="outline" size="sm" onClick={handleSaveClick}>
                <Save className="w-4 h-4 mr-1" />저장
              </Button>
            </div>
            <SajuTable
              saju={customSaju}
              title="개인 사주팔자"
              birthYear={lastInputData?.year}
              birthMonth={lastInputData?.month}
              birthDay={lastInputData?.day}
              daySky={customSaju.day.sky}
              dayEarth={customSaju.day.earth}
              gender="기타"
            />
            <Button variant="outline" size="sm" onClick={() => setCustomSaju(null)} className="w-full">
              현재 시각 만세력으로 돌아가기
            </Button>
          </div>
        )}

        <MenuGrid />

              </div>
    </div>
  );
}

