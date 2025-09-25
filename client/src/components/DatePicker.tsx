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
  const [year, setYear] = useState(initialDate?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initialDate?.month ?? now.getMonth() + 1);
  const [day, setDay] = useState(initialDate?.day ?? now.getDate());
  const [hour, setHour] = useState(initialDate?.hour ?? now.getHours());
  const [isLunar, setIsLunar] = useState(initialDate?.isLunar ?? false);

  const handleSubmit = () => {
    console.log('Date selected:', { year, month, day, hour, isLunar });
    onDateSelect(year, month, day, hour, isLunar);
  };

  const handleQuickSelect = (type: 'today' | 'birth') => {
    const now = new Date();
    if (type === 'today') {
      setYear(now.getFullYear());
      setMonth(now.getMonth() + 1);
      setDay(now.getDate());
      setHour(now.getHours());
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
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || 0)}
              placeholder="1990"
              data-testid="input-year"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">월</Label>
            <Input
              id="month"
              type="number"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
              placeholder="12"
              data-testid="input-month"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day">일</Label>
            <Input
              id="day"
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value) || 1)}
              placeholder="25"
              data-testid="input-day"
            />
          </div>
        </div>

        {/* 시간 입력 */}
        <div className="space-y-2">
          <Label htmlFor="hour">시간 (24시간)</Label>
          <Input
            id="hour"
            type="number"
            min="0"
            max="23"
            value={hour}
            onChange={(e) => setHour(parseInt(e.target.value) || 0)}
            placeholder="14"
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