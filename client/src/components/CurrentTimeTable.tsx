import { Card } from "@/components/ui/card";
import { type SajuInfo } from "@shared/schema";

interface CurrentTimeTableProps {
  saju: SajuInfo;
  title?: string;
  solarDate?: string;
  lunarInfo?: string;
}

export default function CurrentTimeTable({ 
  saju, 
  title = "현재 만세력",
  solarDate,
  lunarInfo
}: CurrentTimeTableProps) {

  // 사주 데이터 구성 (우측부터 년월일시 순)
  const sajuColumns = [
    { label: "시주", sky: saju.hour.sky, earth: saju.hour.earth },
    { label: "일주", sky: saju.day.sky, earth: saju.day.earth },
    { label: "월주", sky: saju.month.sky, earth: saju.month.earth },
    { label: "년주", sky: saju.year.sky, earth: saju.year.earth }
  ];

  // 간지별 CSS 변수 매핑 (다크모드 자동 호환)
  function getGanjiCSSVariable(character: string): string {
    const ganjiVariableMap: Record<string, string> = {
      // 갑을인묘 = 목
      '갑': '--ganji-wood', '을': '--ganji-wood', 
      '인': '--ganji-wood', '묘': '--ganji-wood',
      // 병정사오 = 화
      '병': '--ganji-fire', '정': '--ganji-fire', 
      '사': '--ganji-fire', '오': '--ganji-fire',
      // 무기진미술축 = 토
      '무': '--ganji-earth', '기': '--ganji-earth', 
      '진': '--ganji-earth', '미': '--ganji-earth', 
      '술': '--ganji-earth', '축': '--ganji-earth',
      // 경신신유 = 금
      '경': '--ganji-metal', '신': '--ganji-metal', '유': '--ganji-metal',
      // 임계해자 = 수
      '임': '--ganji-water', '계': '--ganji-water', 
      '해': '--ganji-water', '자': '--ganji-water'
    };
    
    return ganjiVariableMap[character] || '--muted';
  }

  return (
    <Card 
      className="p-6 shadow-md" 
      style={{ backgroundColor: 'hsl(var(--clock-bg))' }}
      data-testid="card-current-time-table"
    >
      {/* 제목 */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-primary mb-2">{title}</h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{solarDate || '양력 정보 없음'}</p>
          <p>{lunarInfo || '음력 정보 없음'}</p>
        </div>
      </div>

      {/* 현재 만세력 간단 테이블 (1-2행만) */}
      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
        {/* 1행: 천간 */}
        <div className="grid grid-cols-4 border-b border-border">
          {sajuColumns.map((col, index) => (
            <div 
              key={`sky-${index}`} 
              className="p-4 text-center text-2xl font-bold border-r border-border last:border-r-0 min-h-[3rem] flex items-center justify-center text-gray-800 dark:text-gray-100"
              style={{ 
                backgroundColor: `hsl(var(${getGanjiCSSVariable(col.sky)}))`,
                fontFamily: "'ChosunCentennial', sans-serif"
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
              className="p-4 text-center text-2xl font-bold border-r border-border last:border-r-0 min-h-[3rem] flex items-center justify-center text-gray-800 dark:text-gray-100"
              style={{ 
                backgroundColor: `hsl(var(${getGanjiCSSVariable(col.earth)}))`,
                fontFamily: "'ChosunCentennial', sans-serif"
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