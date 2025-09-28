import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock } from "lucide-react";

interface DatePickerProps {
  onDateSelect: (year: number, month: number, day: number, hour: number, isLunar: boolean) => void;
  initialDate?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    isLunar: boolean;
  };
}

export default function DatePicker({ onDateSelect, initialDate }: DatePickerProps) {
  const now = new Date();
  const [year, setYear] = useState(initialDate?.year?.toString() ?? now.getFullYear().toString());
  const [month, setMonth] = useState(initialDate?.month?.toString() ?? (now.getMonth() + 1).toString());
  const [day, setDay] = useState(initialDate?.day?.toString() ?? now.getDate().toString());
  const [hour, setHour] = useState(initialDate?.hour?.toString() ?? now.getHours().toString());
  const [isLunar, setIsLunar] = useState(initialDate?.isLunar ?? false);

  const handleSubmit = () => {
    // 숫자 변환 및 검증
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const hourNum = parseInt(hour);
    
    // 유효성 검증
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) ||
        yearNum < 1900 || yearNum > 2100 ||
        monthNum < 1 || monthNum > 12 ||
        dayNum < 1 || dayNum > 31 ||
        hourNum < 0 || hourNum > 23) {
      return; // 유효하지 않으면 제출하지 않음
    }
    
    console.log('Date selected:', { year: yearNum, month: monthNum, day: dayNum, hour: hourNum, isLunar });
    onDateSelect(yearNum, monthNum, dayNum, hourNum, isLunar);
  };

  const handleQuickSelect = (type: 'today' | 'birth') => {
    const now = new Date();
    if (type === 'today') {
      setYear(now.getFullYear().toString());
      setMonth((now.getMonth() + 1).toString());
      setDay(now.getDate().toString());
      setHour(now.getHours().toString());
      console.log('Quick select: today');
    }
    // birth는 사용자가 직접 입력하도록 유지
  };

  return (
    <Card className="p-4" data-testid="card-date-picker">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            생년월일 시간 입력
          </h3>
          <div className="flex items-center space-x-2">
            <Label htmlFor="lunar-toggle" className="text-sm">
              {isLunar ? "음력" : "양력"}
            </Label>
            <Switch
              id="lunar-toggle"
              checked={isLunar}
              onCheckedChange={setIsLunar}
              data-testid="switch-lunar-calendar"
            />
          </div>
        </div>

        {/* 빠른 선택 버튼 */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleQuickSelect('today')}
            data-testid="button-quick-today"
          >
            <Clock className="w-4 h-4 mr-1" />
            현재 시각
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleQuickSelect('birth')}
            data-testid="button-quick-birth"
          >
            생년월일 입력
          </Button>
        </div>

        {/* 날짜 입력 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="year">년도</Label>
            <Input
              id="year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder=""
              data-testid="input-year"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">월</Label>
            <Input
              id="month"
              type="number"
              inputMode="numeric"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder=""
              data-testid="input-month"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day">일</Label>
            <Input
              id="day"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              placeholder=""
              data-testid="input-day"
            />
          </div>
        </div>

        {/* 시간 입력 */}
        <div className="space-y-2">
          <Label htmlFor="hour">時間 (24時間)</Label>
          <Input
            id="hour"
            type="number"
            inputMode="numeric"
            min="0"
            max="23"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            placeholder=""
            data-testid="input-hour"
          />
          <p className="text-xs text-muted-foreground">
            0: 자시(23~01), 2: 축시(01~03), 4: 인시(03~05)...
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full"
          data-testid="button-calculate-saju"
        >
          사주팔자 보기
        </Button>
      </div>
    </Card>
  );
}