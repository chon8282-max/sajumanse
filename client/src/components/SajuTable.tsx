import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI } from "@shared/schema";
import { calculateCompleteYukjin, calculateYukjin, calculateEarthlyBranchYukjin } from "@/lib/yukjin-calculator";

interface SajuTableProps {
  saju: SajuInfo;
  title?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  daySky?: string;
  dayEarth?: string;
  gender?: string;
  memo?: string;
}

// 지장간 계산
const EARTHLY_BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};


export default function SajuTable({ 
  saju, 
  title = "사주명식", 
  birthYear,
  birthMonth,
  birthDay,
  daySky,
  dayEarth,
  gender = '남자',
  memo
}: SajuTableProps) {

  // 사주 데이터 구성 (우측부터 년월일시 순)
  const sajuColumns = [
    { label: "시주", sky: saju.hour.sky, earth: saju.hour.earth },
    { label: "일주", sky: saju.day.sky, earth: saju.day.earth },
    { label: "월주", sky: saju.month.sky, earth: saju.month.earth },
    { label: "년주", sky: saju.year.sky, earth: saju.year.earth }
  ];

  // 육친 계산
  const dayStem = saju.day.sky;
  const heavenlyYukjin = sajuColumns.map(col => {
    if (col.sky === dayStem) return "일간";
    return calculateYukjin(dayStem, col.sky);
  });

  const earthlyYukjin = sajuColumns.map(col => {
    return calculateEarthlyBranchYukjin(dayStem, col.earth);
  });

  // 지장간 계산
  const jijanggan = sajuColumns.map(col => {
    const hiddenStems = EARTHLY_BRANCH_HIDDEN_STEMS[col.earth] || [];
    return hiddenStems.join('');
  });


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
    <Card className="p-4" data-testid="card-saju-table">
      {/* 제목 */}
      <div className="text-center mb-4">
        <div className="font-tmon text-lg font-bold mb-2">{title}</div>
      </div>

      {/* 사주명식 메인 테이블 */}
      <div className="border border-border">
        {/* 1행: 천간 육친 */}
        <div className="grid grid-cols-4 border-b border-border">
          {heavenlyYukjin.map((yukjin, index) => (
            <div 
              key={`yukjin-sky-${index}`} 
              className="p-2 text-center text-sm font-medium border-r border-border last:border-r-0"
              data-testid={`text-yukjin-sky-${index}`}
            >
              {yukjin}
            </div>
          ))}
        </div>

        {/* 2행: 천간 */}
        <div className="grid grid-cols-4 border-b border-border">
          {sajuColumns.map((col, index) => (
            <div 
              key={`sky-${index}`} 
              className="p-3 text-center text-2xl font-bold border-r border-border last:border-r-0"
              style={{ 
                color: '#000000',
                backgroundColor: getGanjiBackgroundColor(col.sky)
              }}
              data-testid={`text-sky-${index}`}
            >
              {col.sky}
            </div>
          ))}
        </div>

        {/* 3행: 지지 */}
        <div className="grid grid-cols-4 border-b border-border">
          {sajuColumns.map((col, index) => (
            <div 
              key={`earth-${index}`} 
              className="p-3 text-center text-2xl font-bold border-r border-border last:border-r-0"
              style={{ 
                color: '#000000',
                backgroundColor: getGanjiBackgroundColor(col.earth)
              }}
              data-testid={`text-earth-${index}`}
            >
              {col.earth}
            </div>
          ))}
        </div>

        {/* 4행: 지지 육친 */}
        <div className="grid grid-cols-4 border-b border-border">
          {earthlyYukjin.map((yukjin, index) => (
            <div 
              key={`yukjin-earth-${index}`} 
              className="p-2 text-center text-sm font-medium border-r border-border last:border-r-0"
              data-testid={`text-yukjin-earth-${index}`}
            >
              {yukjin}
            </div>
          ))}
        </div>

        {/* 5행: 지장간 */}
        <div className="grid grid-cols-4 border-b border-border">
          {jijanggan.map((stems, index) => (
            <div 
              key={`jijanggan-${index}`} 
              className="p-2 text-center text-sm border-r border-border last:border-r-0"
              style={{ color: '#000000' }}
              data-testid={`text-jijanggan-${index}`}
            >
              {stems}
            </div>
          ))}
        </div>

        {/* 추가된 13행 - 6~18행 */}
        {Array.from({ length: 13 }, (_, rowIndex) => (
          <div key={`extra-row-${rowIndex + 6}`} className="grid grid-cols-4 border-b border-border">
            {Array.from({ length: 4 }, (_, colIndex) => (
              <div 
                key={`extra-cell-${rowIndex + 6}-${colIndex}`}
                className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
                data-testid={`text-extra-${rowIndex + 6}-${colIndex}`}
              >
                {/* 빈 셀 - 추후 내용 추가 예정 */}
              </div>
            ))}
          </div>
        ))}

      </div>



      {/* 메모 */}
      {memo && (
        <div className="mt-4 border border-border">
          <div className="p-2 text-center text-xs font-medium border-b border-border bg-muted/30">메모</div>
          <div className="p-3 text-sm" data-testid="text-memo">
            {memo}
          </div>
        </div>
      )}
    </Card>
  );
}