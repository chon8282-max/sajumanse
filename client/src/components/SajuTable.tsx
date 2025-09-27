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
  daeunData?: any;
  saeunData?: any;
  currentDaeun?: any;
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

// 대운수 계산 (출생일로부터 첫 대운까지의 일수)
function calculateDaeunSu(birthYear: number, birthMonth: number, birthDay: number, gender: string): number {
  // 간단한 대운수 계산 (실제로는 절기를 고려해야 함)
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  const yearStart = new Date(birthYear, 0, 1);
  const dayOfYear = Math.floor((birthDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
  
  // 남자는 양년에 순행, 음년에 역행
  // 여자는 양년에 역행, 음년에 순행
  const isOddYear = birthYear % 2 === 1;
  const isMale = gender === '남자';
  
  if ((isMale && isOddYear) || (!isMale && !isOddYear)) {
    return Math.floor(dayOfYear / 3); // 순행
  } else {
    return Math.floor((365 - dayOfYear) / 3); // 역행
  }
}

// 월운 천간지지 계산
function calculateWolunGanji(daySky: string, dayEarth: string, month: number) {
  const skyIndex = CHEONGAN.indexOf(daySky as any);
  const earthIndex = JIJI.indexOf(dayEarth as any);
  
  if (skyIndex === -1 || earthIndex === -1) {
    return { sky: daySky, earth: dayEarth };
  }
  
  // 월운은 월별로 계산 (간단한 방식)
  const monthSkyIndex = (skyIndex + month - 1) % CHEONGAN.length;
  const monthEarthIndex = (earthIndex + month - 1) % JIJI.length;
  
  return {
    sky: CHEONGAN[monthSkyIndex],
    earth: JIJI[monthEarthIndex]
  };
}

export default function SajuTable({ 
  saju, 
  title = "사주명식", 
  birthYear,
  birthMonth,
  birthDay,
  daySky,
  dayEarth,
  gender = '남자',
  daeunData,
  saeunData,
  currentDaeun,
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

  // 대운수 계산
  const daeunSu = birthYear && birthMonth && birthDay ? 
    calculateDaeunSu(birthYear, birthMonth, birthDay, gender) : 0;

  // 세운 정보 (최대 12년 표시)
  const displaySaeun = saeunData ? {
    years: saeunData.years.slice(0, 12),
    skyStems: saeunData.skyStems.slice(0, 12),
    earthBranches: saeunData.earthBranches.slice(0, 12),
    ages: saeunData.ages.slice(0, 12)
  } : null;

  // 간지별 배경색 매핑
  function getGanjiBackgroundColor(character: string): string {
    const ganjiColorMap: Record<string, string> = {
      // 갑을인문 = dcfce7
      '갑': '#dcfce7', '을': '#dcfce7', '인': '#dcfce7', '문': '#dcfce7',
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

  // 월운 계산 (12개월)
  const wolunData = daySky && dayEarth ? Array.from({length: 12}, (_, i) => {
    const month = i + 1;
    const ganji = calculateWolunGanji(daySky, dayEarth, month);
    return { month, ...ganji };
  }) : [];

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



      </div>

      {/* 세운 정보 */}
      {displaySaeun && (
        <div className="mt-4 border border-border">
          {/* 세운년도 */}
          <div className="grid grid-cols-12 border-b border-border">
            {displaySaeun.years.map((year: number, index: number) => (
              <div 
                key={`saeun-year-${index}`} 
                className="p-1 text-center text-xs border-r border-border last:border-r-0"
                data-testid={`text-saeun-year-${index}`}
              >
                {year}
              </div>
            ))}
          </div>

          {/* 세운천간 */}
          <div className="grid grid-cols-12 border-b border-border">
            {displaySaeun.skyStems.map((sky: string, index: number) => (
              <div 
                key={`saeun-sky-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ 
                  color: '#000000',
                  backgroundColor: getGanjiBackgroundColor(sky)
                }}
                data-testid={`text-saeun-sky-${index}`}
              >
                {sky}
              </div>
            ))}
          </div>

          {/* 세운지지 */}
          <div className="grid grid-cols-12 border-b border-border">
            {displaySaeun.earthBranches.map((earth: string, index: number) => (
              <div 
                key={`saeun-earth-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ 
                  color: '#000000',
                  backgroundColor: getGanjiBackgroundColor(earth)
                }}
                data-testid={`text-saeun-earth-${index}`}
              >
                {earth}
              </div>
            ))}
          </div>

          {/* 세운별 나이 */}
          <div className="grid grid-cols-12 border-b border-border">
            {displaySaeun.ages.map((age: number, index: number) => (
              <div 
                key={`saeun-age-${index}`} 
                className="p-1 text-center text-xs border-r border-border last:border-r-0"
                data-testid={`text-saeun-age-${index}`}
              >
                {age}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 월운 정보 */}
      {wolunData.length > 0 && (
        <div className="mt-4 border border-border">
          {/* 월운 */}
          <div className="grid grid-cols-12 border-b border-border">
            {wolunData.map((data, index) => (
              <div 
                key={`wolun-${index}`} 
                className="p-1 text-center text-xs border-r border-border last:border-r-0"
                data-testid={`text-wolun-${index}`}
              >
                {data.month}월
              </div>
            ))}
          </div>

          {/* 월운천간 */}
          <div className="grid grid-cols-12 border-b border-border">
            {wolunData.map((data, index) => (
              <div 
                key={`wolun-sky-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ 
                  color: '#000000',
                  backgroundColor: getGanjiBackgroundColor(data.sky)
                }}
                data-testid={`text-wolun-sky-${index}`}
              >
                {data.sky}
              </div>
            ))}
          </div>

          {/* 월운지지 */}
          <div className="grid grid-cols-12 border-b border-border">
            {wolunData.map((data, index) => (
              <div 
                key={`wolun-earth-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ 
                  color: '#000000',
                  backgroundColor: getGanjiBackgroundColor(data.earth)
                }}
                data-testid={`text-wolun-earth-${index}`}
              >
                {data.earth}
              </div>
            ))}
          </div>

          {/* 월 표시 */}
          <div className="grid grid-cols-12 border-b border-border">
            {Array.from({length: 12}, (_, i) => (
              <div 
                key={`month-display-${i}`} 
                className="p-1 text-center text-xs border-r border-border last:border-r-0"
                data-testid={`text-month-display-${i}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

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