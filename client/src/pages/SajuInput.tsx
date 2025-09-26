import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SajuInput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    calendarType: "양력",
    year: "",
    month: "",
    day: "",
    birthTime: "",
    gender: "남자",
    group: "",
    memo: "",
  });

  const handleBackToManseryeok = () => {
    setLocation("/manseryeok");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // 필수 필드 검증
    if (!formData.name.trim()) {
      toast({
        title: "입력 오류",
        description: "성명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

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
      // API 요청 데이터 준비
      const requestData = {
        name: formData.name.trim(),
        birthYear: parseInt(formData.year),
        birthMonth: parseInt(formData.month),
        birthDay: parseInt(formData.day),
        birthTime: formData.birthTime.trim() || null,
        calendarType: formData.calendarType,
        gender: formData.gender,
        group: formData.group.trim() || null,
        memo: formData.memo.trim() || null,
      };

      console.log("사주 정보 저장 요청:", requestData);

      // API 호출
      const response = await apiRequest("/api/saju-records", {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.success) {
        toast({
          title: "저장 완료",
          description: response.message || "사주 정보가 성공적으로 저장되었습니다.",
        });

        // 성공시 만세력 페이지로 이동
        setLocation("/manseryeok");
      } else {
        throw new Error(response.error || "저장 중 오류가 발생했습니다.");
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
              value={formData.year}
              onChange={(e) => handleInputChange("year", e.target.value)}
              placeholder="____"
              maxLength={4}
              data-testid="input-year"
              className="w-20 text-center"
            />
            <span className="text-sm">년</span>
            <Input
              value={formData.month}
              onChange={(e) => handleInputChange("month", e.target.value)}
              placeholder="__"
              maxLength={2}
              data-testid="input-month"
              className="w-16 text-center"
            />
            <span className="text-sm">월</span>
            <Input
              value={formData.day}
              onChange={(e) => handleInputChange("day", e.target.value)}
              placeholder="__"
              maxLength={2}
              data-testid="input-day"
              className="w-16 text-center"
            />
            <span className="text-sm">일</span>
          </div>
        </div>

        {/* 생시 */}
        <div className="space-y-2">
          <Label htmlFor="birthTime" className="text-base font-medium">생시</Label>
          <Input
            id="birthTime"
            value={formData.birthTime}
            onChange={(e) => handleInputChange("birthTime", e.target.value)}
            placeholder="예: 14:30 또는 오후 2시 30분"
            data-testid="input-birth-time"
            className="text-base"
          />
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
          <Label htmlFor="group" className="text-base font-medium">그룹</Label>
          <div className="flex gap-2">
            <Input
              id="group"
              value={formData.group}
              onChange={(e) => handleInputChange("group", e.target.value)}
              placeholder="소속그룹용으로"
              data-testid="input-group"
              className="text-base flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="whitespace-nowrap"
              data-testid="button-create-group"
            >
              +그룹생성
            </Button>
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