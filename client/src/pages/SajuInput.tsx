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
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Group {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function SajuInput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    calendarType: "양력",
    year: "",
    month: "",
    day: "",
    birthTime: "",
    selectedTimeCode: "",
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
    if (urlParams.has('edit')) {
      const queryData = {
        name: urlParams.get('name') || "",
        calendarType: urlParams.get('calendarType') || "양력",
        year: urlParams.get('year') || "",
        month: urlParams.get('month') || "",
        day: urlParams.get('day') || "",
        birthTime: urlParams.get('birthTime') || "",
        selectedTimeCode: "",
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
      });
    },
    onError: (error: Error) => {
      toast({
        title: "그룹 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBackToManseryeok = () => {
    setLocation("/manseryeok");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // 생년월일 필수 검증
    if (!formData.year || !formData.month || !formData.day) {
      toast({
        title: "입력 오류", 
        description: "생년월일을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // API 요청 데이터 준비 (이름이 비어있으면 "이름없음" 사용)
      const requestData = {
        name: formData.name.trim() || "이름없음",
        birthYear: parseInt(formData.year),
        birthMonth: parseInt(formData.month),
        birthDay: parseInt(formData.day),
        birthTime: formData.selectedTimeCode || formData.birthTime.trim() || null,
        calendarType: formData.calendarType,
        gender: formData.gender,
        groupId: formData.groupId === "none" ? null : formData.groupId || null,
        memo: formData.memo.trim() || null,
      };

      console.log("사주 정보 저장 요청:", requestData);

      // API 호출
      const response = await apiRequest("POST", "/api/saju-records", requestData);
      const result = await response.json();

      if (result.success) {
        // 내부적으로 저장만 되고 메시지는 표시하지 않음
        
        // 성공시 사주 결과 페이지로 이동
        if (result.data?.record?.id) {
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
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "사주 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleBackToManseryeok}
          data-testid="button-back-manseryeok"
          className="hover-elevate active-elevate-2 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">뒤로</span>
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold text-foreground">사주입력</h1>
          <p className="text-sm text-muted-foreground mt-1">정확한 생년월일을 입력하주세요</p>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="max-w-md mx-auto space-y-6">
        {/* 성명 */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base font-medium">성명</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "year")}
            placeholder="이름을 입력하세요"
            data-testid="input-name"
            className="text-base"
          />
        </div>

        {/* 음양 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">음양</Label>
          <RadioGroup 
            value={formData.calendarType} 
            onValueChange={(value) => handleInputChange("calendarType", value)}
            className="flex gap-6"
            data-testid="radio-calendar-type"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="양력" id="yang" data-testid="radio-calendar-yang" />
              <Label htmlFor="yang">양력</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="음력" id="eum" data-testid="radio-calendar-eum" />
              <Label htmlFor="eum">음력</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="윤달" id="yoon" data-testid="radio-calendar-yoon" />
              <Label htmlFor="yoon">윤달</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 년월일 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">생년월일</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="year"
              value={formData.year}
              onChange={(e) => handleInputChange("year", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "month")}
              placeholder="____"
              maxLength={4}
              data-testid="input-year"
              className="w-20 text-center"
            />
            <span className="text-sm">년</span>
            <Input
              id="month"
              value={formData.month}
              onChange={(e) => handleInputChange("month", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "day")}
              placeholder="__"
              maxLength={2}
              data-testid="input-month"
              className="w-16 text-center"
            />
            <span className="text-sm">월</span>
            <Input
              id="day"
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
              placeholder="__"
              maxLength={2}
              data-testid="input-day"
              className="w-16 text-center"
            />
            <span className="text-sm">일</span>
          </div>
        </div>

        {/* 생시 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">생시 (전통 십이시)</Label>
          <Select 
            value={formData.selectedTimeCode}
            onValueChange={(value) => {
              handleInputChange("selectedTimeCode", value);
              handleInputChange("birthTime", value);
            }}
          >
            <SelectTrigger data-testid="select-birth-time" className="text-base">
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
        </div>

        {/* 성별 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">성별</Label>
          <RadioGroup 
            value={formData.gender} 
            onValueChange={(value) => handleInputChange("gender", value)}
            className="flex gap-6"
            data-testid="radio-gender"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="남자" id="male" data-testid="radio-gender-male" />
              <Label htmlFor="male">남자</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="여자" id="female" data-testid="radio-gender-female" />
              <Label htmlFor="female">여자</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 그룹 */}
        <div className="space-y-2">
          <Label className="text-base font-medium">그룹</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.groupId} 
              onValueChange={(value) => handleInputChange("groupId", value)}
            >
              <SelectTrigger data-testid="select-group" className="text-base flex-1">
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
                  className="whitespace-nowrap"
                  data-testid="button-create-group"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  그룹생성
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
        <div className="space-y-2">
          <Label htmlFor="memo" className="text-base font-medium">메모</Label>
          <Card>
            <CardContent className="p-4">
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e) => handleInputChange("memo", e.target.value)}
                placeholder="메모 입력하는 곳"
                data-testid="textarea-memo"
                className="min-h-24 resize-none border-0 focus-visible:ring-0"
              />
            </CardContent>
          </Card>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="w-full text-base"
            data-testid="button-submit-saju"
          >
            {isSubmitting ? "저장 중..." : "사주 뽑기"}
          </Button>
        </div>
      </div>
    </div>
  );
}