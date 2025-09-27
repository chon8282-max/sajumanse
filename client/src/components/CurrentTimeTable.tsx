import { Card } from "@/components/ui/card";
import { type SajuInfo } from "@shared/schema";

interface CurrentTimeTableProps {
  saju: SajuInfo;
  title?: string;
}

export default function CurrentTimeTable({ 
  saju, 
  title = "현재 만세력"
}: CurrentTimeTableProps) {

  // 사주 데이터 구성 (우측부터 년월일시 순)
  const sajuColumns = [
    { label: "시주", sky: saju.hour.sky, earth: saju.hour.earth },
    { label: "일주", sky: saju.day.sky, earth: saju.day.earth },
    { label: "월주", sky: saju.month.sky, earth: saju.month.earth },
    { label: "년주", sky: saju.year.sky, earth: saju.year.earth }
  ];

  // 간지별 배경색 매핑
  function getGanjiBackgroundColor(character: string): string {
    const ganjiColorMap: Record<string, string> = {
      // 갑을인묘 = dcfce7
      '갑': '#dcfce7', '을': '#dcfce7', '인': '#dcfce7', '묘': '#dcfce7',
      // 병정사오 = fee2e2
      '병': '#fee2e2', '정': '#fee2e2', '사': '#fee2e2', '오': '#fee2e2',
      // 무기진미술축 = fbfce6
      '무': '#fbfce6', '기': '#fbfce6', '진': '#fbfce6', '미': '#fbfce6', '술': '#fbfce6', '축': '#fbfce6',
      // 경신신유 = ffffff
      '경': '#ffffff', '신': '#ffffff', '유': '#ffffff',
      // 임계해자 = e7e7e6
      '임': '#e7e7e6', '계': '#e7e7e6', '해': '#e7e7e6', '자': '#e7e7e6'
    };
    
    return ganjiColorMap[character] || '#ffffff';
  }

  return (
    <Card className="p-4" data-testid="card-current-time-table">
      {/* 제목 */}
      <div className="text-center mb-4">
        <div className="font-tmon text-lg font-bold mb-2">{title}</div>
      </div>

      {/* 현재 만세력 간단 테이블 (1-2행만) */}
      <div className="border border-border">
        {/* 1행: 천간 */}
        <div className="grid grid-cols-4 border-b border-border">
          {sajuColumns.map((col, index) => (
            <div 
              key={`sky-${index}`} 
              className="p-3 text-center text-2xl font-bold border-r border-border last:border-r-0"
              style={{ 
                color: '#000000',
                backgroundColor: getGanjiBackgroundColor(col.sky)
              }}
              data-testid={`text-current-sky-${index}`}
            >
              {col.sky}
            </div>
          ))}
        </div>

        {/* 2행: 지지 */}
        <div className="grid grid-cols-4">
          {sajuColumns.map((col, index) => (
            <div 
              key={`earth-${index}`} 
              className="p-3 text-center text-2xl font-bold border-r border-border last:border-r-0"
              style={{ 
                color: '#000000',
                backgroundColor: getGanjiBackgroundColor(col.earth)
              }}
              data-testid={`text-current-earth-${index}`}
            >
              {col.earth}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}