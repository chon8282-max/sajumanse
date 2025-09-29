import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TRADITIONAL_TIME_PERIODS } from "@shared/schema";

interface BirthTimeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (timeCode: string) => void;
  currentTime?: string;
}

export default function BirthTimeSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentTime 
}: BirthTimeSelectorProps) {
  const [selectedTime, setSelectedTime] = useState<string>(currentTime || "");

  const handleTimeClick = (timeCode: string) => {
    setSelectedTime(timeCode);
  };

  const handleConfirm = () => {
    if (selectedTime) {
      onSelect(selectedTime);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedTime(currentTime || "");
    onClose();
  };

  // 한글 시간 이름 매핑
  const koreanTimeNames: { [key: string]: string } = {
    "子時": "자시",
    "丑時": "축시", 
    "寅時": "인시",
    "卯時": "묘시",
    "辰時": "진시", 
    "巳時": "사시",
    "午時": "오시",
    "未時": "미시", 
    "申時": "신시",
    "酉時": "유시",
    "戌時": "술시", 
    "亥時": "해시"
  };

  // TRADITIONAL_TIME_PERIODS에서 데이터 가져오기
  const timeOptions = TRADITIONAL_TIME_PERIODS.map(period => ({
    code: period.code,
    name: koreanTimeNames[period.code] || period.name,
    time: period.range,
    jiji: period.code.replace("時", "") // "子時" -> "子"
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            생시 선택
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-2 py-4">
          {timeOptions.map((option) => (
            <Button
              key={option.code}
              variant={selectedTime === option.code ? "default" : "outline"}
              className={`h-auto p-3 flex flex-col items-center gap-1 ${
                selectedTime === option.code 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'hover:bg-blue-50 dark:hover:bg-blue-950'
              }`}
              onClick={() => handleTimeClick(option.code)}
              data-testid={`button-time-${option.jiji}`}
            >
              <div className="text-lg font-bold">
                {option.jiji}
              </div>
              <div className="text-xs">
                {option.name}
              </div>
              <div className="text-xs opacity-75">
                {option.time}
              </div>
            </Button>
          ))}
        </div>
        
        <div className="flex justify-center gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            data-testid="button-cancel"
          >
            취소
          </Button>
          <Button 
            variant="default" 
            onClick={handleConfirm}
            disabled={!selectedTime}
            data-testid="button-confirm"
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}