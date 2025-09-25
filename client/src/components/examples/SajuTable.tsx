import SajuTable from '../SajuTable';
import { getCurrentSaju } from '@/lib/saju-calculator';

export default function SajuTableExample() {
  // todo: remove mock functionality
  const mockSaju = getCurrentSaju();
  
  return (
    <div className="p-4 space-y-4">
      <SajuTable 
        saju={mockSaju} 
        title="현재 시각의 만세력"
        showWuxing={true}
      />
    </div>
  );
}