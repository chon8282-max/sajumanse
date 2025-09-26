import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  
  if (!match || !params?.id) {
    setLocation("/manseryeok");
    return null;
  }

  // 사주 데이터 조회
  const { data: sajuData, isLoading } = useQuery<{success: boolean, data: SajuResultData}>({
    queryKey: ["/api/saju-records", params.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/saju-records/${params.id}`);
      return await response.json();
    },
  });

  const handleBack = () => {
    setLocation("/manseryeok");
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
          <p className="text-sm text-muted-foreground mt-1">{record.name}님의 사주팔자</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">성명:</span>
                <span className="font-semibold">{record.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">성별:</span>
                <span className="font-semibold">{record.gender}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">생년월일:</span>
                <span className="font-semibold">
                  {record.calendarType} {record.birthYear}년 {record.birthMonth}월 {record.birthDay}일
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">생시:</span>
                <span className="font-semibold">
                  {timePeriod ? `${timePeriod.name} (${timePeriod.range})` : record.birthTime || "미입력"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 사주팔자 표 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">사주팔자</CardTitle>
          </CardHeader>
          <CardContent>
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