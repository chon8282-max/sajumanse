import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, UserPlus, FolderOpen, RefreshCw, Save } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { calculateSaju } from "@/lib/saju-calculator";
import SajuTable from "@/components/SajuTable";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const searchParams = useSearch();
  const { toast } = useToast();
  
  const [leftSajuId, setLeftSajuId] = useState<string | null>(null);
  const [rightSajuId, setRightSajuId] = useState<string | null>(null);
  const [showLeftDialog, setShowLeftDialog] = useState(false);
  const [showRightDialog, setShowRightDialog] = useState(false);
  const [leftMemo, setLeftMemo] = useState<string>("");
  const [rightMemo, setRightMemo] = useState<string>("");
  
  // 쿼리 파라미터에서 ID 자동 로드
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const leftId = params.get('left');
    const rightId = params.get('right');
    
    // 현재 상태와 다를 때만 업데이트 (화면 회전 시 중복 업데이트 방지)
    if (leftId && leftId !== leftSajuId) {
      setLeftSajuId(leftId);
    }
    if (rightId && rightId !== rightSajuId) {
      setRightSajuId(rightId);
    }
  }, [searchParams]); // searchParams 변경 시에만 실행

  // 가로 모드 권장 (강제하지 않음)
  useEffect(() => {
    // 가로 모드 권장 메시지만 표시 (강제 전환 제거)
    console.log('궁합 화면은 가로 모드에서 더 잘 보입니다.');
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
  
  // 사주 데이터 로드 시 메모 동기화 (ID 변경 시에만)
  useEffect(() => {
    if (leftSaju && leftSaju.id === leftSajuId) {
      setLeftMemo(leftSaju.memo ?? "");
    }
  }, [leftSaju?.id, leftSajuId]);
  
  useEffect(() => {
    if (rightSaju && rightSaju.id === rightSajuId) {
      setRightMemo(rightSaju.memo ?? "");
    }
  }, [rightSaju?.id, rightSajuId]);
  
  // 왼쪽 저장 mutation
  const leftSaveMutation = useMutation({
    mutationFn: async (memo: string) => {
      if (!leftSajuId) return;
      return apiRequest("PUT", `/api/saju-records/${leftSajuId}`, { memo });
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "사주 1 메모가 저장되었습니다.",
        duration: 500
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', leftSajuId] });
    }
  });
  
  // 오른쪽 저장 mutation
  const rightSaveMutation = useMutation({
    mutationFn: async (memo: string) => {
      if (!rightSajuId) return;
      return apiRequest("PUT", `/api/saju-records/${rightSajuId}`, { memo });
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "사주 2 메모가 저장되었습니다.",
        duration: 500
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saju-records', rightSajuId] });
    }
  });

  const handleHomeClick = () => {
    setLocation('/');
  };

  // 사주 목록 조회
  const { data: sajuListResponse } = useQuery<{success: boolean, data: SajuResultData[]}>({
    queryKey: ['/api/saju-records'],
  });
  
  const sajuList = sajuListResponse?.data || [];

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full h-full flex flex-row gap-1 p-0">
      {/* 왼쪽 영역 */}
      <div className="flex-1 flex flex-col min-w-[50%]">
        <Card className="h-full overflow-y-auto rounded-none border-0">
            <CardHeader className="pb-1 px-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHomeClick}
                    className="gap-1 h-6 text-xs px-2"
                    data-testid="button-home"
                  >
                    <Home className="w-3 h-3" />
                    홈
                  </Button>
                  <CardTitle className="text-sm">사주 1</CardTitle>
                </div>
                <div className="flex items-start gap-0.5">
                  {leftSajuId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLeftSajuId(null)}
                        data-testid="button-left-change"
                        className="scale-[0.6] origin-center -mr-[17.5px] pl-[14px] pr-[14px]"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        변경
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => leftSaveMutation.mutate(leftMemo)}
                        disabled={leftSaveMutation.isPending}
                        data-testid="button-left-save"
                        className="scale-[0.6] origin-center ml-[-14.75px] mr-[-14.75px]"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {leftSaveMutation.isPending ? "저장중..." : "저장"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-1">
              {leftSajuId && leftSaju ? (
                <div className="w-full">
                  <SajuTable 
                    saju={{
                      year: { sky: leftSaju.yearSky || '', earth: leftSaju.yearEarth || '' },
                      month: { sky: leftSaju.monthSky || '', earth: leftSaju.monthEarth || '' },
                      day: { sky: leftSaju.daySky || '', earth: leftSaju.dayEarth || '' },
                      hour: { sky: leftSaju.hourSky || '', earth: leftSaju.hourEarth || '' }
                    }}
                    name={leftSaju.name}
                    birthYear={leftSaju.birthYear}
                    birthMonth={leftSaju.birthMonth}
                    birthDay={leftSaju.birthDay}
                    birthHour={leftSaju.birthTime || undefined}
                    gender={leftSaju.gender}
                    memo={leftMemo}
                    onMemoChange={(memo) => setLeftMemo(memo)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-muted-foreground text-center">
                    사주를 선택해주세요
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowLeftDialog(true)}
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
      <div className="flex-1 flex flex-col min-w-[50%]">
        <Card className="h-full overflow-y-auto rounded-none border-0">
            <CardHeader className="pb-1 px-2 pt-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">사주 2</CardTitle>
                <div className="flex items-start gap-0.5">
                  {rightSajuId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRightSajuId(null)}
                        data-testid="button-right-change"
                        className="scale-[0.6] origin-center -mr-[17.5px] pl-[14px] pr-[14px]"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        변경
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => rightSaveMutation.mutate(rightMemo)}
                        disabled={rightSaveMutation.isPending}
                        data-testid="button-right-save"
                        className="scale-[0.6] origin-center ml-[-14.75px] mr-[-14.75px]"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {rightSaveMutation.isPending ? "저장중..." : "저장"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-1">
              {rightSajuId && rightSaju ? (
                <div className="w-full">
                  <SajuTable 
                    saju={{
                      year: { sky: rightSaju.yearSky || '', earth: rightSaju.yearEarth || '' },
                      month: { sky: rightSaju.monthSky || '', earth: rightSaju.monthEarth || '' },
                      day: { sky: rightSaju.daySky || '', earth: rightSaju.dayEarth || '' },
                      hour: { sky: rightSaju.hourSky || '', earth: rightSaju.hourEarth || '' }
                    }}
                    name={rightSaju.name}
                    birthYear={rightSaju.birthYear}
                    birthMonth={rightSaju.birthMonth}
                    birthDay={rightSaju.birthDay}
                    birthHour={rightSaju.birthTime || undefined}
                    gender={rightSaju.gender}
                    memo={rightMemo}
                    onMemoChange={(memo) => setRightMemo(memo)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <p className="text-muted-foreground text-center">
                    사주를 선택해주세요
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowRightDialog(true)}
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

      {/* 왼쪽 사주 선택 다이얼로그 */}
      <Dialog open={showLeftDialog} onOpenChange={setShowLeftDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] flex flex-col bg-white dark:bg-gray-900">
          <DialogHeader className="flex-shrink-0 bg-white dark:bg-gray-900">
            <DialogTitle className="text-black dark:text-white">사주 1 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 p-2 bg-gray-50 dark:bg-gray-800">
            {sajuList.map((saju) => (
              <Card
                key={saju.id}
                className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-white dark:bg-gray-900"
                onClick={() => {
                  setLeftSajuId(saju.id);
                  setShowLeftDialog(false);
                }}
                data-testid={`saju-item-${saju.id}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-black dark:text-white">{saju.name}</h3>
                    <p className="text-base text-muted-foreground mt-1">
                      {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 오른쪽 사주 선택 다이얼로그 */}
      <Dialog open={showRightDialog} onOpenChange={setShowRightDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] flex flex-col bg-white dark:bg-gray-900">
          <DialogHeader className="flex-shrink-0 bg-white dark:bg-gray-900">
            <DialogTitle className="text-black dark:text-white">사주 2 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto flex-1 p-2 bg-gray-50 dark:bg-gray-800">
            {sajuList.map((saju) => (
              <Card
                key={saju.id}
                className="p-6 cursor-pointer hover-elevate active-elevate-2 bg-white dark:bg-gray-900"
                onClick={() => {
                  setRightSajuId(saju.id);
                  setShowRightDialog(false);
                }}
                data-testid={`saju-item-${saju.id}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-black dark:text-white">{saju.name}</h3>
                    <p className="text-base text-muted-foreground mt-1">
                      {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} ({saju.gender})
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
