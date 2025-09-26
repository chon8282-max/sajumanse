import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Trash2, 
  User, 
  Calendar, 
  Clock,
  RefreshCw 
} from "lucide-react";
import type { ManseRyeok } from "@shared/schema";

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export default function SajuList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // 저장된 사주 목록 조회 (기본 queryFn 사용)
  const { data: sajuList, isLoading, error } = useQuery<ApiResponse<ManseRyeok[]>, Error, ManseRyeok[]>({
    queryKey: ["/api/manse"],
    select: (response: ApiResponse<ManseRyeok[]>) => response?.data || [], // API 응답에서 data 배열 추출
  });

  // 사주 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/manse/${id}`);
      const response = await res.json();
      if (!response.success) {
        throw new Error(response.error || "사주 삭제에 실패했습니다.");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manse"] });
      toast({
        title: "삭제 완료",
        description: "사주가 성공적으로 삭제되었습니다."
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "삭제 오류",
        description: "사주 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    setLocation("/");
  };

  const handleViewSaju = (id: string) => {
    setLocation(`/saju-result/${id}`);
  };

  const handleDeleteSaju = (id: string, name: string) => {
    if (confirm(`"${name}" 사주를 정말 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getTimeDisplay = (hour: number, minute: number = 0) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // 전통 시간 구간 계산
    const timeInMinutes = hour * 60 + minute;
    let timePeriod = "자시";
    
    if ((timeInMinutes >= 1380) || (timeInMinutes >= 0 && timeInMinutes <= 59)) {
      timePeriod = "자시";
    } else if (timeInMinutes >= 60 && timeInMinutes <= 179) {
      timePeriod = "축시";
    } else if (timeInMinutes >= 180 && timeInMinutes <= 299) {
      timePeriod = "인시";
    } else if (timeInMinutes >= 300 && timeInMinutes <= 419) {
      timePeriod = "묘시";
    } else if (timeInMinutes >= 420 && timeInMinutes <= 539) {
      timePeriod = "진시";
    } else if (timeInMinutes >= 540 && timeInMinutes <= 659) {
      timePeriod = "사시";
    } else if (timeInMinutes >= 660 && timeInMinutes <= 779) {
      timePeriod = "오시";
    } else if (timeInMinutes >= 780 && timeInMinutes <= 899) {
      timePeriod = "미시";
    } else if (timeInMinutes >= 900 && timeInMinutes <= 1019) {
      timePeriod = "신시";
    } else if (timeInMinutes >= 1020 && timeInMinutes <= 1139) {
      timePeriod = "유시";
    } else if (timeInMinutes >= 1140 && timeInMinutes <= 1259) {
      timePeriod = "술시";
    } else if (timeInMinutes >= 1260 && timeInMinutes <= 1379) {
      timePeriod = "해시";
    }
    
    return `${timeString} (${timePeriod})`;
  };

  // 조건부 렌더링을 JSX에서 처리하여 hook 규칙 준수

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">저장된 사주</h1>
          <div className="w-16"></div>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <Card>
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4" data-testid="text-error-message">
                사주 목록을 불러오는데 실패했습니다.
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/manse"] })}
                data-testid="button-retry"
              >
                다시 시도
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 데이터 상태 */}
        {!isLoading && !error && (
          <>
            {!sajuList || sajuList.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">저장된 사주가 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4" data-testid="text-empty-description">
                    만세력에서 사주를 계산하고 저장해보세요.
                  </p>
                  <Button 
                    onClick={() => setLocation("/manseryeok")}
                    data-testid="button-create-saju"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    사주 만들기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sajuList.map((saju) => (
              <Card 
                key={saju.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => handleViewSaju(saju.id)}
                data-testid={`saju-item-${saju.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-base mb-1" data-testid={`text-name-${saju.id}`}>
                        사주 #{saju.id.slice(-8)}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span data-testid={`text-birth-${saju.id}`}>
                          {saju.isLunar === "true" ? "음력" : "양력"} {saju.birthYear}년 {saju.birthMonth}월 {saju.birthDay}일
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        <span data-testid={`text-time-${saju.id}`}>
                          {getTimeDisplay(saju.birthHour, 0)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSaju(saju.id, `사주 #${saju.id.slice(-8)}`);
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${saju.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* 사주팔자 미리보기 */}
                  <div className="grid grid-cols-4 gap-2 text-xs bg-muted/30 rounded-lg p-2">
                    <div className="text-center">
                      <div className="text-muted-foreground">년주</div>
                      <div className="font-medium" data-testid={`text-year-pillar-${saju.id}`}>
                        {saju.yearSky}{saju.yearEarth}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">월주</div>
                      <div className="font-medium" data-testid={`text-month-pillar-${saju.id}`}>
                        {saju.monthSky}{saju.monthEarth}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">일주</div>
                      <div className="font-medium" data-testid={`text-day-pillar-${saju.id}`}>
                        {saju.daySky}{saju.dayEarth}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">시주</div>
                      <div className="font-medium" data-testid={`text-hour-pillar-${saju.id}`}>
                        {saju.hourSky}{saju.hourEarth}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>
                      {saju.gender}
                    </span>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 하단 여백 (네비게이션 공간) */}
        <div className="h-20" />
      </div>
    </div>
  );
}