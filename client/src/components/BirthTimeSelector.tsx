import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const handleValueChange = (value: string) => {
    console.log('BirthTimeSelector - 생시 선택됨:', value);
    onSelect(value);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[320px] p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-left text-base font-semibold">
            생시 (전통 십이시)
          </DialogTitle>
        </DialogHeader>
        
        <div>
          <Select 
            value={currentTime}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="text-sm h-10 w-full" data-testid="select-birth-time">
              <SelectValue placeholder="생시를 선택하세요" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {TRADITIONAL_TIME_PERIODS.map((period) => (
                <SelectItem 
                  key={period.code} 
                  value={period.code}
                  data-testid={`select-time-${period.code}`}
                  className="text-sm py-2.5"
                >
                  {period.name} ({period.range})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  );
}