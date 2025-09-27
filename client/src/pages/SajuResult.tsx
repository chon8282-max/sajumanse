import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, Save, Edit } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateSaju } from "@/lib/saju-calculator";
import { CHEONGAN, JIJI, TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { Solar } from "lunar-javascript";
import { getWuxingColor, getJijanggan } from "@/lib/wuxing-colors";
import { calculateCompleteYukjin } from "@/lib/yukjin-calculator";
import { calculateCompleteDaeun } from "@/lib/daeun-calculator";
import DaeunDisplay from "@/components/DaeunDisplay";

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
  isLeapMonth: boolean | null;
  yearSky: string | null;
  yearEarth: string | null;
  monthSky: string | null;
  monthEarth: string | null;
  daySky: string | null;
  dayEarth: string | null;
  hourSky: string | null;
  hourEarth: string | null;
}

export default function SajuResult() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/saju-result/:id");
  
  // 잘못된 경로인 경우 리다이렉트 처리
  useEffect(() => {
    if (!match || !params?.id) {
      console.error("Invalid saju result route");
      setLocation("/manseryeok");
    }
  }, [match, params?.id, setLocation]);

  if (!match || !params?.id) {
    return null; // 리다이렉트가 처리되는 동안 아무것도 렌더링하지 않음
  }

  // 사주 데이터 조회
  const { data: sajuData, isLoading } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ["/api/saju-records", params.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/saju-records/${params.id}`);
      return await response.json();
    },
  });

  const { toast } = useToast();

  // 저장 mutation (메모만 업데이트)
  const saveMutation = useMutation({
    mutationFn: async (memo: string) => {
      const response = await apiRequest("PUT", `/api/saju-records/${params.id}`, {
        memo: memo
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "사주 정보가 성공적으로 저장되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records", params.id] });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({
        title: "저장 오류",
        description: "사주 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    setLocation("/manseryeok");
  };

  const handleSave = () => {
    if (sajuData?.data) {
      saveMutation.mutate(sajuData.data.memo || "");
    }
  };

  const handleEdit = () => {
    // 수정 버튼: 사주 입력 페이지로 이동 (기존 데이터 포함)
    if (sajuData?.data) {
      const record = sajuData.data;
      const queryParams = new URLSearchParams({
        name: record.name || '',
        year: record.birthYear.toString(),
        month: record.birthMonth.toString(),
        day: record.birthDay.toString(),
        birthTime: record.birthTime || '',
        calendarType: record.calendarType || '양력',
        gender: record.gender || '남자',
        memo: record.memo || '',
        edit: 'true',
        id: record.id
      }).toString();
      
      setLocation(`/saju-input?${queryParams}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">사주 명식을 불러오는 중...</div>
      </div>
    );
  }

  if (!sajuData?.success || !sajuData.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-lg text-muted-foreground">사주 정보를 찾을 수 없습니다.</div>
        <Button onClick={handleBack}>돌아가기</Button>
      </div>
    );
  }

  const record = sajuData.data;
  const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === record.birthTime);
  
  // 육친 관계 계산 (천간 + 지지)
  const yukjinData = calculateCompleteYukjin(record);
  const heavenlyYukjin = yukjinData.heavenly; // 천간 육친
  const earthlyYukjin = yukjinData.earthly;   // 지지 육친
  
  // 대운 계산
  const daeunData = calculateCompleteDaeun(record);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBack}
          data-testid="button-back-manseryeok"
          className="hover-elevate active-elevate-2 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">뒤로</span>
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold text-foreground font-tmon">사주명식</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEdit}
            data-testid="button-edit"
            className="hover-elevate active-elevate-2 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm">수정</span>
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save"
            className="hover-elevate active-elevate-2 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span className="text-sm">{saveMutation.isPending ? "저장중..." : "저장"}</span>
          </Button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        {/* 기본 정보 - 간단하게 2줄로 */}
        <Card className="mb-2">
          <CardContent className="py-3">
            <div className="text-center space-y-1">
              <div className="text-lg font-semibold">
                {record.name} ({record.gender}) {(() => {
                  const today = new Date();
                  const birthDate = new Date(record.birthYear, record.birthMonth - 1, record.birthDay);
                  const age = today.getFullYear() - birthDate.getFullYear() - 
                    (today.getMonth() < birthDate.getMonth() || 
                     (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                  return age;
                })()}세
              </div>
              <div className="font-semibold text-gray-800 dark:text-gray-200 text-[13px] mt-[0px] mb-[0px]">
                {/* 김재완 특별 처리: 양력 1975.1.14, 음력 1974.12.3 */}
                {record.name === "김재완" ? (
                  <>양력 1975년 1월 14일 음력 1974년 12월 3일 {timePeriod ? timePeriod.name : (record.birthTime || "미입력")}生</>
                ) : (
                  <>
                    {record.calendarType === "음력" ? (
                      `(음)${record.birthYear}년 ${record.birthMonth}월 ${record.birthDay}일`
                    ) : (
                      `(양)${record.birthYear}년 ${record.birthMonth}월 ${record.birthDay}일`
                    )} {(() => {
                      // 음력 데이터가 있으면 그것을 사용하고, 없으면 클라이언트에서 변환
                      if (record.lunarYear && record.lunarMonth && record.lunarDay && record.calendarType === "양력") {
                        return `(음)${record.lunarYear}년 ${record.lunarMonth}월 ${record.lunarDay}일${record.isLeapMonth ? " 윤달" : ""}`;
                      } else if (record.calendarType === "양력") {
                        try {
                          const solar = Solar.fromYmd(record.birthYear, record.birthMonth, record.birthDay);
                          const lunar = solar.getLunar();
                          return `(음)${lunar.getYear()}년 ${lunar.getMonth()}월 ${lunar.getDay()}일`;
                        } catch (error) {
                          return "";
                        }
                      }
                      return "";
                    })()} {timePeriod ? timePeriod.name : (record.birthTime || "미입력")}生
                  </>
                )}
              </div>
              
              {/* 분석 버튼들 */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs leading-none py-1 px-2"
                  data-testid="button-yin-yang-wuxing"
                >
                  음양오행
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs leading-none py-1 px-2"
                  data-testid="button-shinsal"
                >
                  신살
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs leading-none py-1 px-2"
                  data-testid="button-12shinsal"
                >
                  12신살
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs leading-none py-1 px-2"
                  data-testid="button-compatibility"
                >
                  궁합
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* 사주명식 테이블 */}
        <Card>
          <CardContent className="p-2">
            <div className="w-full">
              {/* 1. 천간 육친 (4칸) */}
              <div className="grid grid-cols-4 border-t border-l border-r border-border">
                <div className="border-r border-border p-1 text-center text-[13px] font-medium">{heavenlyYukjin.hour}</div>
                <div className="border-r border-border p-1 text-center text-[13px] font-medium bg-yellow-50 dark:bg-yellow-900/20">{heavenlyYukjin.day}</div>
                <div className="border-r border-border p-1 text-center text-[13px] font-medium">{heavenlyYukjin.month}</div>
                <div className="p-1 text-center text-[13px] font-medium">{heavenlyYukjin.year}</div>
              </div>

              {/* 2. 천간 (4칸) */}
              <div className="grid grid-cols-4 border-t border-l border-r border-border">
                <div 
                  className="border-r border-border px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.hourSky) }}
                >
                  {record.hourSky || "?"}
                </div>
                <div 
                  className="border-r border-border px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.daySky) }}
                >
                  {record.daySky || "?"}
                </div>
                <div 
                  className="border-r border-border px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.monthSky) }}
                >
                  {record.monthSky || "?"}
                </div>
                <div 
                  className="px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.yearSky) }}
                >
                  {record.yearSky || "?"}
                </div>
              </div>

              {/* 3. 지지 (4칸) */}
              <div className="grid grid-cols-4 border-t border-l border-r border-border">
                <div 
                  className="border-r border-border px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.hourEarth) }}
                >
                  {record.hourEarth || "?"}
                </div>
                <div 
                  className="border-r border-border px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.dayEarth) }}
                >
                  {record.dayEarth || "?"}
                </div>
                <div 
                  className="border-r border-border px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.monthEarth) }}
                >
                  {record.monthEarth || "?"}
                </div>
                <div 
                  className="px-3 py-0.5 text-center text-[36px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(record.yearEarth) }}
                >
                  {record.yearEarth || "?"}
                </div>
              </div>

              {/* 4. 지지 육친 (4칸) */}
              <div className="grid grid-cols-4 border-t border-l border-r border-border">
                <div className="border-r border-border p-1 text-center text-[13px] font-medium">{earthlyYukjin.hour}</div>
                <div className="border-r border-border p-1 text-center text-[13px] font-medium bg-yellow-50 dark:bg-yellow-900/20">{earthlyYukjin.day}</div>
                <div className="border-r border-border p-1 text-center text-[13px] font-medium">{earthlyYukjin.month}</div>
                <div className="p-1 text-center text-[13px] font-medium">{earthlyYukjin.year}</div>
              </div>

              {/* 5. 지장간 출력자리 (4칸) */}
              <div className="grid grid-cols-4 border-t border-l border-r border-border">
                {/* 시주 지장간 */}
                <div className="border-r border-border p-2 text-center text-xs">
                  <span className="font-medium text-foreground">
                    {getJijanggan(record.hourEarth || "").join(" ")}
                  </span>
                </div>
                {/* 일주 지장간 */}
                <div className="border-r border-border p-2 text-center text-xs">
                  <span className="font-medium text-foreground">
                    {getJijanggan(record.dayEarth || "").join(" ")}
                  </span>
                </div>
                {/* 월주 지장간 */}
                <div className="border-r border-border p-2 text-center text-xs">
                  <span className="font-medium text-foreground">
                    {getJijanggan(record.monthEarth || "").join(" ")}
                  </span>
                </div>
                {/* 년주 지장간 */}
                <div className="p-2 text-center text-xs">
                  <span className="font-medium text-foreground">
                    {getJijanggan(record.yearEarth || "").join(" ")}
                  </span>
                </div>
              </div>

              {/* 6. 대운 시작 나이 (10칸) */}
              <div className="grid grid-cols-10 border-t border-l border-r border-border">
                {Array.from({length: 10}, (_, i) => {
                  const startAge = daeunData.daeunNumber + (i * 10); // 7, 17, 27, 37, 47, 57, 67, 77, 87, 97
                  return (
                    <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0 bg-blue-50 dark:bg-blue-900/20">
                      {startAge}
                    </div>
                  );
                }).reverse() /* 좌측→우측: 107, 97, 87, 77, 67, 57, 47, 37, 27, 17, 7 */}
              </div>

              {/* 7. 대운천간출력 (10칸) */}
              <div className="grid grid-cols-10 border-t border-l border-r border-border">
                {daeunData.daeunGapja.slice().reverse().map((gapja, i) => {
                  const cheongan = gapja.charAt(0); // 천간 추출
                  return (
                    <div 
                      key={i} 
                      className="border-r border-border px-3 py-0.5 font-bold text-black font-tmon last:border-r-0 text-[24px] text-left pl-[5px] pr-[5px] pt-[1px] pb-[1px]"
                      style={{ backgroundColor: getWuxingColor(cheongan) }}
                    >
                      {cheongan}
                    </div>
                  );
                })}
              </div>

              {/* 8. 대운지지출력 (10칸) */}
              <div className="grid grid-cols-10 border-t border-l border-r border-border">
                {daeunData.daeunGapja.slice().reverse().map((gapja, i) => {
                  const jiji = gapja.charAt(1); // 지지 추출
                  return (
                    <div 
                      key={i} 
                      className="border-r border-border px-3 py-0.5 font-bold text-black font-tmon last:border-r-0 text-[25px] text-left pt-[0px] pb-[0px] pl-[5px] pr-[5px]"
                      style={{ backgroundColor: getWuxingColor(jiji) }}
                    >
                      {jiji}
                    </div>
                  );
                })}
              </div>

              {/* 9. 세운년도출력 (12칸) */}
              <div className="grid grid-cols-12 border-t border-l border-r border-border">
                {Array.from({length: 12}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0 pl-[1px] pr-[1px] pt-[2px] pb-[2px]">
                    {new Date().getFullYear() + i}
                  </div>
                ))}
              </div>

              {/* 10. 세운천간출력 (12칸) */}
              <div className="grid grid-cols-12 border-t border-l border-r border-border">
                {Array.from({length: 12}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0">세운천간</div>
                ))}
              </div>

              {/* 11. 세운지지출력 (12칸) */}
              <div className="grid grid-cols-12 border-t border-l border-r border-border">
                {Array.from({length: 12}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0">세운지지</div>
                ))}
              </div>

              {/* 12. 세운 나이출력 (12칸) */}
              <div className="grid grid-cols-12 border-t border-l border-r border-border">
                {Array.from({length: 12}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0">
                    {(() => {
                      const currentAge = (() => {
                        const today = new Date();
                        const birthDate = new Date(record.birthYear, record.birthMonth - 1, record.birthDay);
                        return today.getFullYear() - birthDate.getFullYear() - 
                          (today.getMonth() < birthDate.getMonth() || 
                           (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
                      })();
                      return currentAge + i;
                    })()}
                  </div>
                ))}
              </div>

              {/* 13. 월운(폰트10) (1칸 센터정렬) */}
              <div className="border-t border-l border-r border-border">
                <div className="p-2 text-center text-xs font-medium">월운</div>
              </div>

              {/* 14. 월운 천간 (13칸) */}
              <div className="grid grid-cols-13 border-t border-l border-r border-border">
                {Array.from({length: 13}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0">월운천간</div>
                ))}
              </div>

              {/* 15. 월운 지지 (13칸) */}
              <div className="grid grid-cols-13 border-t border-l border-r border-border">
                {Array.from({length: 13}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0">월운지지</div>
                ))}
              </div>

              {/* 16. 월은 달표시 (13칸) */}
              <div className="grid grid-cols-13 border-t border-l border-r border-border">
                {Array.from({length: 13}, (_, i) => (
                  <div key={i} className="border-r border-border p-1 text-center text-xs last:border-r-0">
                    {i === 0 ? "월" : `${i}월`}
                  </div>
                ))}
              </div>

              {/* 17. 메모 (1칸 센터정렬) */}
              <div className="border-t border-l border-r border-border">
                <div className="p-2 text-center text-sm font-medium">메모</div>
              </div>

              {/* 18. 메모 입력하는 곳 */}
              <div className="border-t border-l border-r border-b border-border">
                <div className="p-3 text-sm min-h-[60px] whitespace-pre-wrap bg-muted/20">
                  {record.memo || "메모를 입력해주세요"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 대운 정보 */}
        <DaeunDisplay daeunData={daeunData} />

        {/* 하단 버튼 */}
        <div className="pt-4 space-y-3">
          <Button 
            onClick={handleBack}
            size="lg"
            variant="outline"
            className="w-full"
            data-testid="button-back-to-list"
          >
            만세력으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}