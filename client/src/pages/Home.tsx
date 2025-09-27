import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SajuTable from "@/components/SajuTable";
import DatePicker from "@/components/DatePicker";
import MenuGrid from "@/components/MenuGrid";
import { calculateSaju, getCurrentSaju } from "@/lib/saju-calculator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type SajuInfo } from "@shared/schema";
import { RefreshCw, Sparkles, Save } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
// lunar converter는 서버에서만 사용 가능

export default function Home() {
  const [currentSaju, setCurrentSaju] = useState<SajuInfo>(getCurrentSaju());
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

  // 현재 날짜의 양력/음력 정보 생성
  const getCurrentDateInfo = () => {
    const now = lastUpdated;
    const solarDate = format(now, 'yyyy년 M월 d일 EEEE', { locale: ko });
    
    // 음력 정보 - 클라이언트에서는 간단히 표시
    const lunarInfo = '음력 날짜';

    return { solarDate, lunarInfo };
  };

  // 현재 시각 자동 업데이트 (1초마다 실시간)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSaju(getCurrentSaju());
      setLastUpdated(new Date());
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const { toast } = useToast();

  // 사주팔자 계산 뮤테이션
  const calculateMutation = useMutation({
    mutationFn: async (data: { year: number; month: number; day: number; hour: number; isLunar: boolean }) => {
      const response = await apiRequest("POST", "/api/saju/calculate", data) as any;
      if (!response.success) {
        throw new Error(response.error || "사주 계산에 실패했습니다.");
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
    onError: (error) => {
      console.error('Saju calculation error:', error);
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
        description: "만세력 정보가 성공적으로 저장되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manse"] });
    },
    onError: (error) => {
      console.error('Save error:', error);
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
      <div className="container mx-auto px-4 py-6 max-w-md space-y-6">

        {/* 현재 시각의 만세력 */}
        <div className="space-y-3">
          {/* 날짜 제목 (양력/음력 정렬) */}
          <div className="text-center space-y-1 font-serif">
            <div className="text-base font-medium">
              현재 만세력 (양) {getCurrentDateInfo().solarDate}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="flex-shrink-0">.................. (음)</span>
              <span>{getCurrentDateInfo().lunarInfo}</span>
            </div>
          </div>
          
          <SajuTable 
            saju={currentSaju}
            title=""
            showWuxing={true}
          />
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
              showWuxing={true}
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

        {/* 메뉴 그리드 */}
        <MenuGrid />

        {/* 하단 여백 (네비게이션 공간) */}
        <div className="h-20" />
      </div>
    </div>
  );
}