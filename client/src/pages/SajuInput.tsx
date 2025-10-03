import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Group {
  id: string;
  name: string;
  isDefault: boolean;
}

// 한국 서머타임 적용 기간 데이터
const KOREA_DST_PERIODS = [
  { year: 1948, startMonth: 6, startDay: 1, endMonth: 9, endDay: 13 },
  { year: 1949, startMonth: 4, startDay: 3, endMonth: 9, endDay: 11 },
  { year: 1950, startMonth: 4, startDay: 1, endMonth: 9, endDay: 10 },
  { year: 1951, startMonth: 5, startDay: 6, endMonth: 9, endDay: 9 },
  { year: 1955, startMonth: 5, startDay: 5, endMonth: 9, endDay: 9 },
  { year: 1956, startMonth: 5, startDay: 20, endMonth: 9, endDay: 30 },
  { year: 1957, startMonth: 5, startDay: 5, endMonth: 9, endDay: 22 },
  { year: 1958, startMonth: 5, startDay: 4, endMonth: 9, endDay: 21 },
  { year: 1959, startMonth: 5, startDay: 3, endMonth: 9, endDay: 20 },
  { year: 1960, startMonth: 5, startDay: 1, endMonth: 9, endDay: 18 },
  { year: 1987, startMonth: 5, startDay: 10, endMonth: 10, endDay: 11 },
  { year: 1988, startMonth: 5, startDay: 8, endMonth: 10, endDay: 9 },
];

// 서머타임 기간 체크 함수
function checkDSTPeriod(year: number, month: number, day: number): { isDST: boolean; period?: typeof KOREA_DST_PERIODS[0] } {
  const dstPeriod = KOREA_DST_PERIODS.find(p => p.year === year);
  
  if (!dstPeriod) {
    return { isDST: false };
  }
  
  // 시작일과 종료일 사이인지 확인
  const inputDate = new Date(year, month - 1, day);
  const startDate = new Date(year, dstPeriod.startMonth - 1, dstPeriod.startDay);
  const endDate = new Date(year, dstPeriod.endMonth - 1, dstPeriod.endDay);
  
  if (inputDate >= startDate && inputDate < endDate) {
    return { isDST: true, period: dstPeriod };
  }
  
  return { isDST: false };
}

// 12절기 데이터 (2024년 기준)
const TWELVE_SOLAR_TERMS_2024 = [
  { term: "입춘", month: 2, day: 4, hour: 16, minute: 27 },
  { term: "경칩", month: 3, day: 5, hour: 10, minute: 23 },
  { term: "청명", month: 4, day: 4, hour: 15, minute: 2 },
  { term: "입하", month: 5, day: 5, hour: 8, minute: 10 },
  { term: "망종", month: 6, day: 5, hour: 12, minute: 10 },
  { term: "소서", month: 7, day: 6, hour: 22, minute: 20 },
  { term: "입추", month: 8, day: 7, hour: 9, minute: 11 },
  { term: "백로", month: 9, day: 7, hour: 11, minute: 11 },
  { term: "한로", month: 10, day: 8, hour: 3, minute: 56 },
  { term: "입동", month: 11, day: 7, hour: 12, minute: 20 },
  { term: "대설", month: 12, day: 7, hour: 0, minute: 17 },
  { term: "소한", month: 1, day: 5, hour: 23, minute: 49 },
];

// 절입일 체크 함수
function checkSolarTermDay(year: number, month: number, day: number): { isSolarTerm: boolean; termInfo?: { name: string; hour: number; minute: number } } {
  const yearDiff = year - 2024;
  const dayOffset = Math.round(yearDiff / 4);
  
  for (const term of TWELVE_SOLAR_TERMS_2024) {
    const adjustedDay = term.day + dayOffset;
    const termDate = new Date(year, term.month - 1, adjustedDay);
    const inputDate = new Date(year, month - 1, day);
    
    if (termDate.getFullYear() === inputDate.getFullYear() &&
        termDate.getMonth() === inputDate.getMonth() &&
        termDate.getDate() === inputDate.getDate()) {
      return {
        isSolarTerm: true,
        termInfo: {
          name: term.term,
          hour: term.hour,
          minute: term.minute
        }
      };
    }
  }
  
  return { isSolarTerm: false };
}

export default function SajuInput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showSolarTermDialog, setShowSolarTermDialog] = useState(false);
  const [solarTermInfo, setSolarTermInfo] = useState<{ name: string; hour: number; minute: number } | null>(null);
  
  // 편집 모드 확인 (URL 파라미터로 edit=true와 id 존재 여부)
  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('edit') === 'true' && urlParams.has('id');
  
  const [formData, setFormData] = useState({
    name: "",
    calendarType: "양력",
    year: "",
    month: "",
    day: "",
    birthTime: "",
    selectedTimeCode: "",
    birthTimeUnknown: false,
    gender: "남자",
    groupId: "",
    memo: "",
  });

  // 엔터키로 다음 입력창 이동 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextFieldId?: string) => {
    if (e.key === 'Enter' && nextFieldId) {
      e.preventDefault();
      const nextField = document.getElementById(nextFieldId) as HTMLInputElement;
      if (nextField) {
        nextField.focus();
      }
    }
  };

  // 쿼리 파라미터에서 초기 데이터 로드 (수정 모드)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // edit=true이고 id가 있을 때만 편집 모드로 데이터 로드
    if (urlParams.get('edit') === 'true' && urlParams.has('id')) {
      const queryData = {
        name: urlParams.get('name') || "",
        calendarType: urlParams.get('calendarType') || "양력",
        year: urlParams.get('year') || "",
        month: urlParams.get('month') || "",
        day: urlParams.get('day') || "",
        birthTime: urlParams.get('birthTime') || "",
        selectedTimeCode: "",
        birthTimeUnknown: !urlParams.get('birthTime'),
        gender: urlParams.get('gender') || "남자",
        groupId: urlParams.get('groupId') || "",
        memo: urlParams.get('memo') || "",
      };
      
      console.log('Loading data from query params:', queryData);
      setFormData(queryData);
    }
  }, []);

  // 그룹 목록 조회
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    select: (response: any) => response.data || [],
  });

  // 새 그룹 생성 뮤테이션
  const createGroupMutation = useMutation({
    mutationFn: async (groupName: string) => {
      const response = await apiRequest("POST", "/api/groups", { name: groupName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setNewGroupName("");
      setIsGroupDialogOpen(false);
      toast({
        title: "그룹 생성 완료",
        description: "새 그룹이 성공적으로 생성되었습니다.",
        duration: 700
      });
    },
    onError: (error: Error) => {
      toast({
        title: "그룹 생성 실패",
        description: error.message,
        variant: "destructive",
        duration: 700
      });
    },
  });

  const handleBackToManseryeok = () => {
    setLocation("/manseryeok");
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 서머타임 체크
  const dstCheck = checkDSTPeriod(
    parseInt(formData.year) || 0,
    parseInt(formData.month) || 0,
    parseInt(formData.day) || 0
  );

  const handleSubmit = async (usePreviousMonthPillar?: boolean) => {
    // 생년월일 필수 검증
    const yearNum = parseInt(formData.year);
    const monthNum = parseInt(formData.month);
    const dayNum = parseInt(formData.day);
    
    if (!formData.year || !formData.month || !formData.day || 
        isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) ||
        yearNum < 1900 || yearNum > 2100 ||
        monthNum < 1 || monthNum > 12 ||
        dayNum < 1 || dayNum > 31) {
      toast({
        title: "입력 오류", 
        description: "올바른 생년월일을 입력해주세요. (년: 1900-2100, 월: 1-12, 일: 1-31)",
        variant: "destructive",
        duration: 700
      });
      return;
    }

    // 양력인 경우 절입일 체크 (대화상자가 아직 표시되지 않았을 때만)
    if (formData.calendarType === "양력" && usePreviousMonthPillar === undefined) {
      const solarTermCheck = checkSolarTermDay(yearNum, monthNum, dayNum);
      if (solarTermCheck.isSolarTerm && solarTermCheck.termInfo) {
        setSolarTermInfo(solarTermCheck.termInfo);
        setShowSolarTermDialog(true);
        return; // 대화상자 표시 후 여기서 멈춤
      }
    }

    setIsSubmitting(true);

    try {
      // 편집 모드 확인
      const urlParams = new URLSearchParams(window.location.search);
      const submitIsEditMode = urlParams.get('edit') === 'true' && urlParams.has('id');
      const editId = urlParams.get('id');

      // API 요청 데이터 준비 (이름이 비어있으면 "이름없음" 사용)
      const requestData: any = {
        name: formData.name.trim() || "이름없음",
        birthYear: yearNum,
        birthMonth: monthNum,
        birthDay: dayNum,
        birthTime: formData.selectedTimeCode || formData.birthTime.trim() || null,
        calendarType: formData.calendarType,
        gender: formData.gender,
        groupId: formData.groupId === "none" ? null : formData.groupId || null,
        memo: formData.memo.trim() || null,
      };

      // 절입일 전월 간지 적용 여부 추가
      if (usePreviousMonthPillar !== undefined) {
        requestData.usePreviousMonthPillar = usePreviousMonthPillar;
      }

      console.log("사주 정보 저장 요청:", requestData);

      // API 호출 - 편집 모드면 PUT, 아니면 POST
      let response;
      if (submitIsEditMode && editId) {
        response = await apiRequest("PUT", `/api/saju-records/${editId}`, requestData);
      } else {
        response = await apiRequest("POST", "/api/saju-records", requestData);
      }
      const result = await response.json();

      if (result.success) {
        // 사주 목록 캐시 새로고침 (저장된 사주가 리스트에 나타나도록)
        queryClient.invalidateQueries({ queryKey: ["/api/saju-records"] });
        
        // 성공시 사주 결과 페이지로 이동
        if (submitIsEditMode && editId) {
          // 편집 모드에서는 편집한 사주의 결과 페이지로 이동
          setLocation(`/saju-result/${editId}`);
        } else if (result.data?.record?.id) {
          // 새로 생성한 경우 새 사주의 결과 페이지로 이동
          setLocation(`/saju-result/${result.data.record.id}`);
        } else {
          // ID가 없으면 만세력 페이지로 이동
          setLocation("/manseryeok");
        }
      } else {
        throw new Error(result.error || "저장 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("사주 저장 오류:", error);
      
      // 네트워크 오류인지 확인
      const isNetworkError = error instanceof Error && 
        (error.message.includes("fetch") || error.message.includes("Failed to fetch") || 
         error.message.includes("네트워크") || error.message.includes("network"));
      
      toast({
        title: isNetworkError ? "네트워크 연결 오류" : "저장 실패",
        description: isNetworkError 
          ? "인터넷 연결을 확인하고 다시 시도해주세요."
          : (error instanceof Error ? error.message : "사주 정보 저장 중 오류가 발생했습니다."),
        variant: "destructive",
        duration: 700
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-3 py-1">
      {/* 헤더 */}
      <div className="relative flex items-center mb-1.5">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBackToManseryeok}
          data-testid="button-back-manseryeok"
          className="absolute left-0 hover-elevate active-elevate-2 flex items-center gap-1 px-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">뒤로</span>
        </Button>
        <div className="w-full text-center">
          <h1 className="text-lg font-bold text-foreground">사주입력</h1>
          <p className="text-xs text-muted-foreground">정확한 생년월일을 입력하주세요</p>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="max-w-md mx-auto space-y-2">
        {/* 성명 */}
        <div className="space-y-0.5">
          <Label htmlFor="name" className="text-xs font-medium">성명</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "year")}
            placeholder="이름을 입력하세요"
            data-testid="input-name"
            className="text-sm h-8"
          />
        </div>

        {/* 음양 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">음양</Label>
          <RadioGroup 
            value={formData.calendarType} 
            onValueChange={(value) => handleInputChange("calendarType", value)}
            className="flex gap-4"
            data-testid="radio-calendar-type"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="양력" id="yang" data-testid="radio-calendar-yang" />
              <Label htmlFor="yang" className="text-xs">양력</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="음력" id="eum" data-testid="radio-calendar-eum" />
              <Label htmlFor="eum" className="text-xs">음력</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="윤달" id="yoon" data-testid="radio-calendar-yoon" />
              <Label htmlFor="yoon" className="text-xs">윤달</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 년월일 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">생년월일</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="year"
              type="number"
              inputMode="numeric"
              value={formData.year}
              onChange={(e) => handleInputChange("year", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "month")}
              placeholder=""
              maxLength={4}
              data-testid="input-year"
              className="w-20 text-center h-8"
            />
            <span className="text-xs">년</span>
            <Input
              id="month"
              type="number"
              inputMode="numeric"
              value={formData.month}
              onChange={(e) => handleInputChange("month", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "day")}
              placeholder=""
              maxLength={2}
              data-testid="input-month"
              className="w-16 text-center h-8"
            />
            <span className="text-xs">월</span>
            <Input
              id="day"
              type="number"
              inputMode="numeric"
              value={formData.day}
              onChange={(e) => handleInputChange("day", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // 생시 Select 컴포넌트 열기
                  const selectTrigger = document.querySelector('[data-testid="select-birth-time"]') as HTMLButtonElement;
                  if (selectTrigger) {
                    selectTrigger.click();
                  }
                }
              }}
              placeholder=""
              maxLength={2}
              data-testid="input-day"
              className="w-16 text-center h-8"
            />
            <span className="text-xs">일</span>
          </div>
        </div>

        {/* 서머타임 안내 문구 */}
        {dstCheck.isDST && dstCheck.period && formData.calendarType === "양력" && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold">⚠️ 서머타임 적용 기간 안내</div>
              <div>
                양력 {dstCheck.period.year}년 {dstCheck.period.startMonth}월 {dstCheck.period.startDay}일부터<br />
                양력 {dstCheck.period.year}년 {dstCheck.period.endMonth}월 {dstCheck.period.endDay}일까지 서머타임을 실시하였습니다.
              </div>
              <div className="pt-1">
                이 시간은 서머타임 적용기간입니다. 알고 계신 시간에서 <span className="font-bold text-amber-700 dark:text-amber-300">1시간을 빼고</span> 계산하여야 맞습니다.
              </div>
              <div className="text-amber-800 dark:text-amber-300 pt-0.5">
                (예: 출생시간 5시 10분 → 실제적용시간 4시 10분)
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 생시 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">생시 (전통 십이시)</Label>
          <div className="flex gap-2 items-center">
            <Select 
              value={formData.selectedTimeCode}
              onValueChange={(value) => {
                handleInputChange("selectedTimeCode", value);
                handleInputChange("birthTime", value);
              }}
              disabled={formData.birthTimeUnknown}
            >
              <SelectTrigger data-testid="select-birth-time" className="text-sm h-8 flex-1">
                <SelectValue placeholder="생시를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {TRADITIONAL_TIME_PERIODS.map((period) => (
                  <SelectItem 
                    key={period.code} 
                    value={period.code}
                    data-testid={`select-time-${period.code}`}
                  >
                    {period.name} ({period.range})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <Checkbox 
                id="birthTimeUnknown"
                checked={formData.birthTimeUnknown}
                onCheckedChange={(checked) => {
                  handleInputChange("birthTimeUnknown", !!checked);
                  if (checked) {
                    handleInputChange("selectedTimeCode", "");
                    handleInputChange("birthTime", "");
                  }
                }}
                data-testid="checkbox-birth-time-unknown"
              />
              <Label htmlFor="birthTimeUnknown" className="text-xs cursor-pointer">생시모름</Label>
            </div>
          </div>
        </div>

        {/* 성별 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">성별</Label>
          <RadioGroup 
            value={formData.gender} 
            onValueChange={(value) => handleInputChange("gender", value)}
            className="flex gap-4"
            data-testid="radio-gender"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="남자" id="male" data-testid="radio-gender-male" />
              <Label htmlFor="male" className="text-xs">남자</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="여자" id="female" data-testid="radio-gender-female" />
              <Label htmlFor="female" className="text-xs">여자</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 그룹 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">그룹</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.groupId} 
              onValueChange={(value) => handleInputChange("groupId", value)}
            >
              <SelectTrigger data-testid="select-group" className="text-sm flex-1 h-8">
                <SelectValue placeholder="그룹 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" data-testid="select-group-none">그룹 없음</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id} data-testid={`select-group-${group.id}`}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="whitespace-nowrap h-8"
                  data-testid="button-create-group"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span className="text-xs">그룹생성</span>
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-group">
                <DialogHeader>
                  <DialogTitle>새 그룹 만들기</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newGroupName">그룹 이름</Label>
                    <Input
                      id="newGroupName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="새 그룹 이름을 입력하세요"
                      data-testid="input-new-group-name"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setIsGroupDialogOpen(false)}
                      data-testid="button-cancel-group"
                    >
                      취소
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => {
                        if (newGroupName.trim()) {
                          createGroupMutation.mutate(newGroupName.trim());
                        }
                      }}
                      disabled={!newGroupName.trim() || createGroupMutation.isPending}
                      data-testid="button-save-group"
                    >
                      {createGroupMutation.isPending ? "생성 중..." : "생성"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 메모 */}
        <div className="space-y-1">
          <Label htmlFor="memo" className="text-xs font-medium">메모</Label>
          <Card>
            <CardContent className="p-2">
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e) => handleInputChange("memo", e.target.value)}
                placeholder="메모 입력하는 곳"
                data-testid="textarea-memo"
                className="min-h-14 resize-none border-0 focus-visible:ring-0 text-xs"
              />
            </CardContent>
          </Card>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-1">
          <Button 
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="w-full text-sm"
            data-testid="button-submit-saju"
          >
            {isSubmitting ? "저장 중..." : "사주 뽑기"}
          </Button>
        </div>
      </div>

      {/* 절입일 확인 대화상자 */}
      <Dialog open={showSolarTermDialog} onOpenChange={setShowSolarTermDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">절입일 안내</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <p className="text-base font-semibold">
                {solarTermInfo?.name} 절입시간 ({solarTermInfo?.hour}:{String(solarTermInfo?.minute).padStart(2, '0')})입니다.
              </p>
              <p className="text-sm text-muted-foreground">
                전월간지를 적용하시겠습니까?
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground px-2">
              <p><strong>예:</strong> 전월의 간지적용</p>
              <p><strong>아니오:</strong> 절입후 간지적용</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowSolarTermDialog(false);
                handleSubmit(false); // 아니오: 절입 후 간지 적용
              }}
              data-testid="button-solar-term-no"
            >
              아니오
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowSolarTermDialog(false);
                handleSubmit(true); // 예: 전월 간지 적용
              }}
              data-testid="button-solar-term-yes"
            >
              예
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}