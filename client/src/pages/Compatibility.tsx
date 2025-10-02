import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, UserPlus, FolderOpen, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { calculateSaju } from "@/lib/saju-calculator";
import SajuTable from "@/components/SajuTable";

interface SajuResultData {
  id: string;
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthTime: string | null;
  calendarType: string;
  gender: string;
  memo: string | null;
  lunarYear: number | null;
  lunarMonth: number | null;
  lunarDay: number | null;
}

export default function Compatibility() {
  const [, setLocation] = useLocation();
  const [leftSajuId, setLeftSajuId] = useState<number | null>(null);
  const [rightSajuId, setRightSajuId] = useState<number | null>(null);

  // 가로 모드 강제 전환
  useEffect(() => {
    // Screen Orientation API 지원 확인
    if (screen.orientation && 'lock' in screen.orientation) {
      (screen.orientation as any).lock('landscape').catch((err: Error) => {
        console.log('Orientation lock failed:', err);
      });
    }

    // 컴포넌트 언마운트 시 잠금 해제
    return () => {
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
    };
  }, []);

  // 왼쪽 사주 데이터 가져오기
  const { data: leftSajuResponse } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ['/api/saju-records', leftSajuId],
    enabled: !!leftSajuId,
  });

  // 오른쪽 사주 데이터 가져오기
  const { data: rightSajuResponse } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ['/api/saju-records', rightSajuId],
    enabled: !!rightSajuId,
  });
  
  const leftSaju = leftSajuResponse?.data;
  const rightSaju = rightSajuResponse?.data;

  const handleHomeClick = () => {
    setLocation('/');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* 홈 버튼 */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleHomeClick}
          className="gap-2"
          data-testid="button-home"
        >
          <Home className="w-4 h-4" />
          홈
        </Button>
      </div>

      {/* 2분할 레이아웃 */}
      <div className="h-full flex flex-col landscape:flex-row gap-2 p-2 pt-16">
        {/* 왼쪽 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 overflow-auto">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">사주 1</CardTitle>
                <div className="flex gap-2">
                  {leftSajuId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLeftSajuId(null)}
                      data-testid="button-left-change"
                      className="text-xs h-7"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      변경
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {leftSajuId && leftSaju ? (
                <div className="scale-[0.7] origin-top-left w-[142.86%]">
                  <SajuTable 
                    saju={(() => {
                      const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === leftSaju.birthTime);
                      return calculateSaju(
                        leftSaju.birthYear,
                        leftSaju.birthMonth,
                        leftSaju.birthDay,
                        timePeriod?.hour || 0
                      );
                    })()}
                    name={leftSaju.name}
                    birthYear={leftSaju.birthYear}
                    birthMonth={leftSaju.birthMonth}
                    birthDay={leftSaju.birthDay}
                    birthHour={leftSaju.birthTime || undefined}
                    gender={leftSaju.gender}
                    memo={leftSaju.memo || undefined}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-muted-foreground text-center">
                    사주를 선택해주세요
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="default"
                      onClick={() => setLocation('/saju-input')}
                      data-testid="button-left-new"
                      className="text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      새로 입력
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation('/saju-list')}
                      data-testid="button-left-load"
                      className="text-sm"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      불러오기
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 overflow-auto">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">사주 2</CardTitle>
                <div className="flex gap-2">
                  {rightSajuId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRightSajuId(null)}
                      data-testid="button-right-change"
                      className="text-xs h-7"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      변경
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {rightSajuId && rightSaju ? (
                <div className="scale-[0.7] origin-top-left w-[142.86%]">
                  <SajuTable 
                    saju={(() => {
                      const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === rightSaju.birthTime);
                      return calculateSaju(
                        rightSaju.birthYear,
                        rightSaju.birthMonth,
                        rightSaju.birthDay,
                        timePeriod?.hour || 0
                      );
                    })()}
                    name={rightSaju.name}
                    birthYear={rightSaju.birthYear}
                    birthMonth={rightSaju.birthMonth}
                    birthDay={rightSaju.birthDay}
                    birthHour={rightSaju.birthTime || undefined}
                    gender={rightSaju.gender}
                    memo={rightSaju.memo || undefined}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-muted-foreground text-center">
                    사주를 선택해주세요
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="default"
                      onClick={() => setLocation('/saju-input')}
                      data-testid="button-right-new"
                      className="text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      새로 입력
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation('/saju-list')}
                      data-testid="button-right-load"
                      className="text-sm"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      불러오기
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
