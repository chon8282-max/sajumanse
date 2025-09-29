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

  // 12개 시간대 정의
  const timeOptions = [
    { code: "子時", name: "자시", time: "23:00~01:00", jiji: "子" },
    { code: "丑時", name: "축시", time: "01:00~03:00", jiji: "丑" },
    { code: "寅時", name: "인시", time: "03:00~05:00", jiji: "寅" },
    { code: "卯時", name: "묘시", time: "05:00~07:00", jiji: "卯" },
    { code: "辰時", name: "진시", time: "07:00~09:00", jiji: "辰" },
    { code: "巳時", name: "사시", time: "09:00~11:00", jiji: "巳" },
    { code: "午時", name: "오시", time: "11:00~13:00", jiji: "午" },
    { code: "未時", name: "미시", time: "13:00~15:00", jiji: "未" },
    { code: "申時", name: "신시", time: "15:00~17:00", jiji: "申" },
    { code: "酉時", name: "유시", time: "17:00~19:00", jiji: "酉" },
    { code: "戌時", name: "술시", time: "19:00~21:00", jiji: "戌" },
    { code: "亥時", name: "해시", time: "21:00~23:00", jiji: "亥" }
  ];

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