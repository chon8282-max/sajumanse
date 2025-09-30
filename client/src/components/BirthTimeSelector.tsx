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
    onSelect(value);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            생시 선택
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Select 
            value={currentTime}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="text-base h-10 w-full" data-testid="select-birth-time">
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
      </DialogContent>
    </Dialog>
  );
}