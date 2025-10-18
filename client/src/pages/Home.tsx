import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SajuTable from "@/components/SajuTable";
import CurrentTimeTable from "@/components/CurrentTimeTable";
import DatePicker from "@/components/DatePicker";
import MenuGrid from "@/components/MenuGrid";
import { calculateSaju } from "@/lib/saju-calculator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type SajuInfo, type Announcement } from "@shared/schema";
import { RefreshCw, Sparkles, Save, ChevronRight } from "lucide-react";
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
  
  // 절기 데이터 가져오기
  const { data: solarTermsData } = useQuery({
    queryKey: ["/api/solar-terms", lastUpdated.getFullYear()],
    queryFn: async () => {
      const response = await fetch(`/api/solar-terms/${lastUpdated.getFullYear()}`);
      const result = await response.json();
      return result.success ? result.data : [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24시간 캐시
    refetchOnWindowFocus: false,
  });

  // 최신 공지사항 조회
  const { data: announcementsData } = useQuery<{ success: boolean; data: Announcement[] }>({
    queryKey: ["/api/announcements"],
    staleTime: 1000 * 60 * 5, // 5분 캐시
    refetchOnWindowFocus: false,
  });

  const announcements = announcementsData?.data || [];

  // 음력 날짜 API 호출 (오프라인 환경에서는 비활성화)
  const { data: lunarData, error: lunarError } = useQuery({
    queryKey: ["/api/lunar-solar/convert/lunar", lastUpdated.getFullYear(), lastUpdated.getMonth() + 1, lastUpdated.getDate()],
    queryFn: async () => {
      try {
        const response = await apiRequest("POST", "/api/lunar-solar/convert/lunar", {
          solYear: lastUpdated.getFullYear(),
          solMonth: lastUpdated.getMonth() + 1,
          solDay: lastUpdated.getDate()
        }) as any;
        return response;
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 60, // 1시간 동안 캐시
    refetchOnWindowFocus: false,
    retry: false, // API 실패 시 재시도 안함
    enabled: navigator.onLine !== false // 오프라인 감지 시 API 호출 비활성화
  });

  // 현재 날짜의 양력 정보 생성
  const getCurrentDateInfo = () => {
    const now = lastUpdated;
    const dayOfWeek = format(now, 'eeee', { locale: ko });
    const solarDate = `양력 ${format(now, 'yyyy년 M월 d일', { locale: ko })} ${dayOfWeek}`;

    return { solarDate };
  };

  // 현재 시각 자동 업데이트 (1초마다 실시간, DB 절기 데이터 사용)
  useEffect(() => {
    // 절기 데이터가 있을 때만 사주 계산
    if (solarTermsData && solarTermsData.length > 0) {
      const updateCurrentSaju = () => {
        const now = new Date();
        setLastUpdated(now);
        
        try {
          // DB 절기 데이터 변환 (ISO string -> Date)
          const dbSolarTerms = solarTermsData.map((term: any) => ({
            name: term.name,
            date: new Date(term.date),
            month: term.month
          }));
          
          const saju = calculateSaju(
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            false,
            undefined,
            dbSolarTerms
          );
          setCurrentSaju(saju);
        } catch (error) {
          console.error('현재 사주 계산 오류:', error);
        }
      };
      
      // 즉시 실행
      updateCurrentSaju();
      
      // 1초마다 업데이트
      const interval = setInterval(updateCurrentSaju, 1000);
      return () => clearInterval(interval);
    }
  }, [solarTermsData]);

  const { toast } = useToast();

  // 사주팔자 계산 뮤테이션 (서버 API 사용 - DB 절기 데이터 필수)
  const calculateMutation = useMutation({
    mutationFn: async (data: { year: number; month: number; day: number; hour: number; isLunar: boolean }) => {
      // 서버 API 사용 (정확한 음력-양력 변환 + DB 절기 데이터 포함)
      const response = await apiRequest("POST", "/api/saju/calculate", data) as any;
      if (!response.success) {
        throw new Error(response.error || "서버 사주 계산에 실패했습니다.");
      }
      return response.data;
    },
    onSuccess: (data) => {
      setCustomSaju(data);
      setShowDatePicker(false);
      toast({
        title: "사주팔자 계산 완료",
        description: "개인 사주팔자가 성공적으로 계산되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "계산 오류",
        description: "사주팔자 계산 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 만세력 저장 뮤테이션
  const saveMutation = useMutation({
    mutationFn: async (data: { 
      birthYear: number; 
      birthMonth: number; 
      birthDay: number; 
      birthHour: number; 
      isLunar: string;
      gender: string;
    }) => {
      const response = await apiRequest("POST", "/api/manse", data) as any;
      if (!response.success) {
        throw new Error(response.error || "저장에 실패했습니다.");
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "만세력 정보가 성공적으로 저장되었습니다.",
        duration: 700
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manse"] });
    },
    onError: () => {
      toast({
        title: "저장 오류",
        description: "만세력 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleDateSelect = (year: number, month: number, day: number, hour: number, isLunar: boolean) => {
    setLastInputData({ year, month, day, hour, isLunar });
    calculateMutation.mutate({ year, month, day, hour, isLunar });
  };

  const handleRefresh = () => {
    // 절기 데이터가 있을 때만 새로고침
    if (solarTermsData && solarTermsData.length > 0) {
      const now = new Date();
      setLastUpdated(now);
      
      try {
        const dbSolarTerms = solarTermsData.map((term: any) => ({
          name: term.name,
          date: new Date(term.date),
          month: term.month
        }));
        
        const saju = calculateSaju(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          false,
          undefined,
          dbSolarTerms
        );
        setCurrentSaju(saju);
      } catch (error) {
        console.error('사주 새로고침 오류:', error);
      }
    }
  };

  const handleNewInput = () => {
    setShowDatePicker(true);
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

  const handleSaveCustomSaju = () => {
    if (!customSaju || !lastInputData) {
      toast({
        title: "저장 오류",
        description: "저장할 사주 정보가 없습니다.",
        variant: "destructive"
      });
      return;
    }
    
    // 실제 사용자가 입력한 데이터와 계산된 사주팔자를 함께 저장
    saveMutation.mutate({
      birthYear: lastInputData.year,
      birthMonth: lastInputData.month,
      birthDay: lastInputData.day,
      birthHour: lastInputData.hour,
      isLunar: lastInputData.isLunar ? "true" : "false",
      gender: "기타" // 기본값 (추후 사용자 입력으로 확장 가능)
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-md space-y-4">

        {/* 현재 시각의 만세력 */}
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

        {/* 생년월일 입력 버튼 */}
        {showDatePicker && (
          <div className="space-y-3">
            <DatePicker 
              onDateSelect={handleDateSelect}
            />
          </div>
        )}

        {/* 입력한 생년월일의 사주 */}
        {customSaju && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">내 사주팔자</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSaveCustomSaju}
                disabled={saveMutation.isPending}
                data-testid="button-save-custom"
              >
                <Save className="w-4 h-4 mr-1" />
                {saveMutation.isPending ? "저장중..." : "저장"}
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
            

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCustomSaju(null)}
              data-testid="button-clear-custom"
              className="w-full"
            >
              현재 시각 만세력으로 돌아가기
            </Button>
          </div>
        )}


        {/* 메뉴 그리드 */}
        <MenuGrid />
      </div>
    </div>
  );
}