import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI } from "@shared/schema";
import { getWuxingColor } from "@/lib/wuxing-colors";
import { calculateCompleteYukjin, calculateYukjin, calculateEarthlyBranchYukjin } from "@/lib/yukjin-calculator";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Solar } from "lunar-javascript";

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
  // 현재 날짜 정보
  const now = new Date();
  const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lunar = solar.getLunar();

  // 사주 데이터 구성 (시주, 일주, 월주, 년주 순)
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

  // 월운 계산 (12개월)
  const wolunData = daySky && dayEarth ? Array.from({length: 12}, (_, i) => {
    const month = i + 1;
    const ganji = calculateWolunGanji(daySky, dayEarth, month);
    return { month, ...ganji };
  }) : [];

  return (
    <Card className="p-4" data-testid="card-saju-table">
      {/* 제목 및 날짜 정보 */}
      <div className="text-center mb-4">
        <div className="font-tmon text-lg font-bold mb-2">{title}</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>(양) {format(now, 'yyyy년 M월 d일 EEEE', { locale: ko })}</div>
          <div>(음) {lunar.getYear()}년 {lunar.getMonth()}월 {lunar.getDay()}일</div>
        </div>
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
              className={`p-3 text-center text-2xl font-bold border-r border-border last:border-r-0 ${
                index === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
              }`}
              style={{ color: getWuxingColor(col.sky) }}
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
              className={`p-3 text-center text-2xl font-bold border-r border-border last:border-r-0 ${
                index === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
              }`}
              style={{ color: getWuxingColor(col.earth) }}
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
          <div className="p-2 text-center text-xs font-medium border-r border-border bg-muted/30">지장간</div>
          {jijanggan.map((stems, index) => (
            <div 
              key={`jijanggan-${index}`} 
              className="p-2 text-center text-sm border-r border-border last:border-r-0"
              data-testid={`text-jijanggan-${index}`}
            >
              {stems}
            </div>
          ))}
        </div>

        {/* 6행: 대운수 */}
        <div className="grid grid-cols-4 border-b border-border">
          <div className="p-2 text-center text-xs font-medium border-r border-border bg-muted/30">대운수</div>
          <div className="col-span-3 p-2 text-center text-sm" data-testid="text-daeun-su">
            {daeunSu}일
          </div>
        </div>

        {/* 7행: 대운천간 */}
        {daeunData && (
          <div className="grid grid-cols-4 border-b border-border">
            <div className="p-2 text-center text-xs font-medium border-r border-border bg-muted/30">대운천간</div>
            {daeunData.daeunPeriods.slice(0, 3).map((period: any, index: number) => (
              <div 
                key={`daeun-sky-${index}`} 
                className="p-2 text-center text-lg font-bold border-r border-border last:border-r-0"
                style={{ color: getWuxingColor(period.gapja[0]) }}
                data-testid={`text-daeun-sky-${index}`}
              >
                {period.gapja[0]}
              </div>
            ))}
          </div>
        )}

        {/* 8행: 대운지지 */}
        {daeunData && (
          <div className="grid grid-cols-4 border-b border-border">
            <div className="p-2 text-center text-xs font-medium border-r border-border bg-muted/30">대운지지</div>
            {daeunData.daeunPeriods.slice(0, 3).map((period: any, index: number) => (
              <div 
                key={`daeun-earth-${index}`} 
                className="p-2 text-center text-lg font-bold border-r border-border last:border-r-0"
                style={{ color: getWuxingColor(period.gapja[1]) }}
                data-testid={`text-daeun-earth-${index}`}
              >
                {period.gapja[1]}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 세운 정보 */}
      {displaySaeun && (
        <div className="mt-4 border border-border">
          {/* 세운년도 */}
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">세운년도</div>
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
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">세운천간</div>
            {displaySaeun.skyStems.map((sky: string, index: number) => (
              <div 
                key={`saeun-sky-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ color: getWuxingColor(sky) }}
                data-testid={`text-saeun-sky-${index}`}
              >
                {sky}
              </div>
            ))}
          </div>

          {/* 세운지지 */}
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">세운지지</div>
            {displaySaeun.earthBranches.map((earth: string, index: number) => (
              <div 
                key={`saeun-earth-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ color: getWuxingColor(earth) }}
                data-testid={`text-saeun-earth-${index}`}
              >
                {earth}
              </div>
            ))}
          </div>

          {/* 세운별 나이 */}
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">세운별 나이</div>
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
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">월운</div>
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
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">월운천간</div>
            {wolunData.map((data, index) => (
              <div 
                key={`wolun-sky-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ color: getWuxingColor(data.sky) }}
                data-testid={`text-wolun-sky-${index}`}
              >
                {data.sky}
              </div>
            ))}
          </div>

          {/* 월운지지 */}
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">월운지지</div>
            {wolunData.map((data, index) => (
              <div 
                key={`wolun-earth-${index}`} 
                className="p-1 text-center text-sm font-bold border-r border-border last:border-r-0"
                style={{ color: getWuxingColor(data.earth) }}
                data-testid={`text-wolun-earth-${index}`}
              >
                {data.earth}
              </div>
            ))}
          </div>

          {/* 월 표시 */}
          <div className="grid grid-cols-13 border-b border-border">
            <div className="p-1 text-center text-xs font-medium border-r border-border bg-muted/30">월 표시</div>
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