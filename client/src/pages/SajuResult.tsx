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

  // 저장 mutation (기존 레코드 덮어쓰기)
  const saveMutation = useMutation({
    mutationFn: async (recordData: SajuResultData) => {
      const response = await apiRequest("PUT", `/api/saju-records/${recordData.id}`, recordData);
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
      saveMutation.mutate(sajuData.data);
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
          <h1 className="text-xl font-bold text-foreground">사주명식</h1>
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
              <div className="text-sm text-muted-foreground">
                생년월일 {record.birthYear}년 {record.birthMonth}월 {record.birthDay}일
                {record.lunarYear && record.lunarMonth && record.lunarDay && (
                  <span>
                    (음력 {record.lunarYear}년 {record.lunarMonth}월 {record.lunarDay}일{record.isLeapMonth ? " 윤달" : ""})
                  </span>
                )} {timePeriod ? timePeriod.name : (record.birthTime || "미입력")}생
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 사주팔자 표 */}
        <Card>
          <CardContent className="py-3">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-3 text-sm font-semibold">구분</th>
                    <th className="border border-border p-3 text-sm font-semibold">년주</th>
                    <th className="border border-border p-3 text-sm font-semibold">월주</th>
                    <th className="border border-border p-3 text-sm font-semibold">일주</th>
                    <th className="border border-border p-3 text-sm font-semibold">시주</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3 text-sm font-semibold bg-muted/30">천간</td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.yearSky || "?"}
                    </td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.monthSky || "?"}
                    </td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.daySky || "?"}
                    </td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.hourSky || "?"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 text-sm font-semibold bg-muted/30">지지</td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.yearEarth || "?"}
                    </td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.monthEarth || "?"}
                    </td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.dayEarth || "?"}
                    </td>
                    <td className="border border-border p-4 text-center text-lg font-bold">
                      {record.hourEarth || "?"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 대운표 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">대운표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground mb-4">
                지간간 및 심십 출력차기
              </div>
              
              {/* 대운 나이 */}
              <div className="border border-border rounded-lg p-4">
                <div className="text-sm font-semibold text-center mb-3">나이</div>
                <div className="grid grid-cols-10 gap-2">
                  {Array.from({length: 10}, (_, i) => (
                    <div key={i} className="text-center border border-border p-2">
                      <div className="text-xs">{91 - i * 10}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-10 gap-2 mt-2">
                  {Array.from({length: 10}, (_, i) => (
                    <div key={i} className="text-center border border-border p-2">
                      <div className="text-xs">{i === 9 ? 1 : ""}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 세운 */}
              <div className="border border-border rounded-lg p-4">
                <div className="text-sm font-semibold text-center mb-3">세운</div>
                <div className="grid grid-cols-10 gap-2">
                  {Array.from({length: 10}, (_, i) => (
                    <div key={i} className="text-center border border-border p-2">
                      <div className="text-xs">{49 - i}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-10 gap-2 mt-2">
                  {Array.from({length: 10}, (_, i) => (
                    <div key={i} className="text-center border border-border p-2">
                      <div className="text-xs">{i < 8 ? "" : (i === 8 ? "2" : "1")}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 월운 */}
              <div className="border border-border rounded-lg p-4">
                <div className="text-sm font-semibold text-center mb-3">월운</div>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({length: 12}, (_, i) => (
                    <div key={i} className="text-center border border-border p-2">
                      <div className="text-xs">{12 - i}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-1 mt-2">
                  {Array.from({length: 12}, (_, i) => (
                    <div key={i} className="text-center border border-border p-2">
                      <div className="text-xs"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              {record.memo && (
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <div className="text-sm font-semibold mb-2">메모</div>
                  <div className="text-sm whitespace-pre-wrap">{record.memo}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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