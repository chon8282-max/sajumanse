import FortuneCard from '../FortuneCard';
import { getCurrentSaju } from '@/lib/saju-calculator';

export default function FortuneCardExample() {
  // todo: remove mock functionality
  const mockSaju = getCurrentSaju();
  
  return (
    <div className="p-4">
      <FortuneCard saju={mockSaju} />
    </div>
  );
}