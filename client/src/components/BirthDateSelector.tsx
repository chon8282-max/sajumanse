import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface BirthDateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (year: number, month: number, day: number) => void;
  currentYear?: number;
  currentMonth?: number;
  currentDay?: number;
  calendarType?: string; // "양력" | "음력" | "윤달" | "ganji"
}

export default function BirthDateSelector({ 
  isOpen, 
  onClose, 
  onSelect,
  currentYear,
  currentMonth,
  currentDay,
  calendarType = "양력"
}: BirthDateSelectorProps) {
  const today = new Date();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear || today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth || (today.getMonth() + 1));
  const [selectedDay, setSelectedDay] = useState<number>(currentDay || today.getDate());

  // 년도 목록 생성 (1900년 ~ 현재년도 + 10년)
  const years = Array.from({ length: today.getFullYear() - 1900 + 11 }, (_, i) => 1900 + i);
  
  // 월 목록 (1~12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // 해당 년월의 일수 계산
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 월이 변경되면 일자를 조정
  useEffect(() => {
    const maxDays = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  // props가 변경되면 상태 업데이트
  useEffect(() => {
    if (isOpen) {
      setSelectedYear(currentYear || today.getFullYear());
      setSelectedMonth(currentMonth || (today.getMonth() + 1));
      setSelectedDay(currentDay || today.getDate());
    }
  }, [isOpen, currentYear, currentMonth, currentDay]);

  const handleConfirm = () => {
    onSelect(selectedYear, selectedMonth, selectedDay);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-left text-base font-semibold">
            생년월일 변경 ({calendarType === 'ganji' ? '양력' : calendarType})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 년도 선택 */}
          <div>
            <label className="text-sm font-medium mb-2 block">년도</label>
            <Select 
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="text-sm h-10 w-full" data-testid="select-birth-year">
                <SelectValue placeholder="년도 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {years.reverse().map((year) => (
                  <SelectItem 
                    key={year} 
                    value={year.toString()}
                    data-testid={`select-year-${year}`}
                    className="text-sm py-2.5"
                  >
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 월 선택 */}
          <div>
            <label className="text-sm font-medium mb-2 block">월</label>
            <Select 
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="text-sm h-10 w-full" data-testid="select-birth-month">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {months.map((month) => (
                  <SelectItem 
                    key={month} 
                    value={month.toString()}
                    data-testid={`select-month-${month}`}
                    className="text-sm py-2.5"
                  >
                    {month}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 일 선택 */}
          <div>
            <label className="text-sm font-medium mb-2 block">일</label>
            <Select 
              value={selectedDay.toString()}
              onValueChange={(value) => setSelectedDay(parseInt(value))}
            >
              <SelectTrigger className="text-sm h-10 w-full" data-testid="select-birth-day">
                <SelectValue placeholder="일 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {days.map((day) => (
                  <SelectItem 
                    key={day} 
                    value={day.toString()}
                    data-testid={`select-day-${day}`}
                    className="text-sm py-2.5"
                  >
                    {day}일
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 확인 버튼 */}
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button 
              onClick={handleConfirm}
              data-testid="button-confirm"
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
