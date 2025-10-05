import { Card } from "@/components/ui/card";
import { type SajuInfo } from "@shared/schema";
import { getCheonganImage, getJijiImage, isCheongan, isJiji } from "@/lib/cheongan-images";
import { getWuxingColor, getWuxingTextColor } from "@/lib/wuxing-colors";

interface CurrentTimeTableProps {
  saju: SajuInfo;
  title?: string;
  solarDate?: string;
  isOffline?: boolean;
}

export default function CurrentTimeTable({ 
  saju, 
  title = "현재 만세력",
  solarDate,
  isOffline = false
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
      className="p-1.5 shadow-md" 
      style={{ backgroundColor: 'hsl(var(--clock-bg))' }}
      data-testid="card-current-time-table"
    >
      {/* 제목 */}
      <div className="text-center mb-0.5">
        <h2 className="font-bold text-primary mb-0.5" style={{ letterSpacing: '-0.02em', fontSize: '16px' }}>{title}</h2>
        <div className="text-muted-foreground" style={{ fontSize: '12px' }}>
          <p style={{ letterSpacing: '-0.01em' }}>{solarDate || '양력 정보 없음'}</p>
        </div>
      </div>
      {/* 현재 만세력 간단 테이블 (1-2행만) */}
      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
        {/* 1행: 천간 */}
        <div className="grid grid-cols-4 border-b border-border">
          {sajuColumns.map((col, index) => {
            const cheonganImage = getCheonganImage(col.sky);
            return (
              <div 
                key={`sky-${index}`} 
                className="text-center text-[31px] font-bold border-r border-border last:border-r-0 min-h-[1.3rem] flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(col.sky),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0',
                  letterSpacing: '-0.03em'
                }}
                data-testid={`text-current-sky-${index}`}
              >
                {cheonganImage ? (
                  <img 
                    src={cheonganImage} 
                    alt={col.sky} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontWeight: '900',
                    textShadow: '0 0 1px rgba(0,0,0,0.5)',
                    color: getWuxingTextColor(col.sky)
                  }}>{col.sky}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 2행: 지지 */}
        <div className="grid grid-cols-4">
          {sajuColumns.map((col, index) => {
            const jijiImage = getJijiImage(col.earth);
            return (
              <div 
                key={`earth-${index}`} 
                className="text-center text-[31px] font-bold border-r border-border last:border-r-0 min-h-[1.3rem] flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(col.earth),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0',
                  letterSpacing: '-0.03em'
                }}
                data-testid={`text-current-earth-${index}`}
              >
                {jijiImage ? (
                  <img 
                    src={jijiImage} 
                    alt={col.earth} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontWeight: '900',
                    textShadow: '0 0 1px rgba(0,0,0,0.5)',
                    color: getWuxingTextColor(col.earth)
                  }}>{col.earth}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* 알림 섹션 */}
      <div className="mt-1.5 p-1.5 bg-muted/30 rounded-lg border">
        <h3 className="text-xs font-semibold text-primary flex items-center mt-[0px] mb-[0px]" style={{ letterSpacing: '-0.02em' }}>
          <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5"></span>
          알림
        </h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-start space-x-1.5 min-w-0">
            <span className="text-[10px] text-primary font-medium flex-shrink-0">•</span>
            <span className="flex-1 min-w-0 truncate pt-[6px] pb-[6px]" style={{ letterSpacing: '-0.01em' }}>오늘의 운세: 목요일은 새로운 시작의 기운이 강한 날입니다.</span>
          </div>
          <div className="flex items-start space-x-1.5 min-w-0">
            <span className="text-[10px] text-primary font-medium flex-shrink-0">•</span>
            <span className="flex-1 min-w-0 truncate" style={{ letterSpacing: '-0.01em' }}>만세력 업데이트: 2025년 음력 절입시간 정보가 업데이트되었습니다.</span>
          </div>
        </div>
      </div>
    </Card>
  );
}