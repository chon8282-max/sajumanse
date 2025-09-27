import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI } from "@shared/schema";
import { getWuXingColor, getWuXingBgColor } from "@/lib/saju-calculator";
import { getWuxingColor, getZodiacHourFromTime } from "@/lib/wuxing-colors";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Solar } from "lunar-javascript";

interface SajuTableProps {
  saju: SajuInfo;
  title?: string;
  showWuxing?: boolean;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  daySky?: string; // 일주 천간 (세운 계산용)
  dayEarth?: string; // 일주 지지 (세운 계산용)
}

// 다음 천간지지 조합 구하기
function getNextGanji(sky: string, earth: string): { sky: string; earth: string } {
  const skyIndex = CHEONGAN.indexOf(sky as typeof CHEONGAN[number]);
  const earthIndex = JIJI.indexOf(earth as typeof JIJI[number]);
  
  if (skyIndex === -1 || earthIndex === -1) {
    return { sky, earth }; // 잘못된 입력일 경우 원본 반환
  }
  
  const nextSkyIndex = (skyIndex + 1) % CHEONGAN.length;
  const nextEarthIndex = (earthIndex + 1) % JIJI.length;
  
  return {
    sky: CHEONGAN[nextSkyIndex],
    earth: JIJI[nextEarthIndex]
  };
}

// 세운 계산 (태어난 다음날부터 시작)
function calculateSaeun(birthYear: number, startSky: string, startEarth: string, yearsCount: number = 4) {
  const years: number[] = [];
  const ages: number[] = [];
  const skyStems: string[] = [];
  const earthBranches: string[] = [];
  
  let currentSky = startSky;
  let currentEarth = startEarth;
  
  // 태어난 다음날부터 시작하므로 첫 번째부터 다음 간지
  const nextGanji = getNextGanji(currentSky, currentEarth);
  currentSky = nextGanji.sky;
  currentEarth = nextGanji.earth;
  
  for (let i = 0; i < yearsCount; i++) {
    const currentYear = birthYear + i;
    const currentAge = i + 1;
    
    years.push(currentYear);
    ages.push(currentAge);
    skyStems.push(currentSky);
    earthBranches.push(currentEarth);
    
    // 다음 년도를 위해 간지 증가
    const next = getNextGanji(currentSky, currentEarth);
    currentSky = next.sky;
    currentEarth = next.earth;
  }
  
  return { years, ages, skyStems, earthBranches };
}

// 월운 계산 (2부터 시작해서 2까지 순환)
function calculateWolun() {
  return [2, 1, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
}

export default function SajuTable({ 
  saju, 
  title = "사주팔자", 
  showWuxing = true,
  birthYear,
  birthMonth,
  birthDay,
  daySky,
  dayEarth
}: SajuTableProps) {
  const columns = [
    { label: "시주", data: saju.hour },
    { label: "일주", data: saju.day },
    { label: "월주", data: saju.month },
    { label: "년주", data: saju.year }
  ];

  // 세운과 월운 계산 (생년월일이 있을 때만)
  const showSaeunWolun = birthYear && daySky && dayEarth;
  const saeunData = showSaeunWolun ? calculateSaeun(birthYear!, daySky!, dayEarth!) : null;
  const wolunData = showSaeunWolun ? calculateWolun() : null;

  // 현재 날짜 정보 생성
  const now = new Date();
  
  // 음력 변환
  const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lunar = solar.getLunar();
  const zodiacTime = getZodiacHourFromTime(now.getHours(), now.getMinutes());
  
  const combinedDateString = `(양)${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (음)${lunar.getYear()}년 ${lunar.getMonth()}월 ${lunar.getDay()}일) ${zodiacTime}生`;

  const wuxingData = [
    saju.wuxing.hourSky,
    saju.wuxing.daySky,
    saju.wuxing.monthSky,
    saju.wuxing.yearSky
  ];

  const wuxingEarthData = [
    saju.wuxing.hourEarth,
    saju.wuxing.dayEarth,
    saju.wuxing.monthEarth,
    saju.wuxing.yearEarth
  ];

  return (
    <Card className="p-4" data-testid="card-saju-table">
      <div className="text-center mb-4">
        <div className="space-y-1">
          <div className="font-tmon text-foreground text-[15px] text-center" data-testid="text-saju-title">
            <span>현재 만세력 </span><span>(양) {format(now, 'yyyy년 M월 d일 EEEE', { locale: ko })}</span>
          </div>
          <div className="font-tmon text-foreground text-[15px] text-center" data-testid="text-lunar-date">
            <span>.................. </span><span>(음) {lunar.getYear()}년 {lunar.getMonth()}월 {lunar.getDay()}일</span>
          </div>
        </div>
      </div>
      {/* 메인 사주 테이블 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {/* 레이블 행 */}
        {columns.map((col, index) => (
          <div key={index} className="text-center">
            <div className="text-sm text-muted-foreground font-medium mb-2" data-testid={`text-column-label-${index}`}>
              {col.label}
            </div>
          </div>
        ))}
        
        {/* 천간 행 */}
        {columns.map((col, index) => (
          <div key={`sky-${index}`} className="text-center">
            <div 
              className="py-3 px-2 rounded-md font-tmon font-semibold border text-[40px] text-black pt-[2px] pb-[2px]"
              style={{ backgroundColor: getWuxingColor(col.data.sky) }}
              data-testid={`text-sky-${index}`}
            >
              {col.data.sky}
            </div>
          </div>
        ))}
        
        {/* 지지 행 */}
        {columns.map((col, index) => (
          <div key={`earth-${index}`} className="text-center">
            <div 
              className="py-3 px-2 rounded-md font-tmon font-semibold border text-[40px] text-black pt-[2px] pb-[2px]"
              style={{ backgroundColor: getWuxingColor(col.data.earth) }}
              data-testid={`text-earth-${index}`}
            >
              {col.data.earth}
            </div>
          </div>
        ))}
      </div>
      {/* 오행 정보 */}
      {showWuxing && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <h3 className="text-sm font-medium mb-2 text-center" data-testid="text-wuxing-title">
            오행 분석
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">천간:</span>{" "}
              {wuxingData.map((w, i) => (
                <span key={i} className={`${getWuXingColor(w)} font-medium`}>
                  {w}{i < wuxingData.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
            <div>
              <span className="font-medium">지지:</span>{" "}
              {wuxingEarthData.map((w, i) => (
                <span key={i} className={`${getWuXingColor(w)} font-medium`}>
                  {w}{i < wuxingEarthData.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 세운과 월운 테이블 */}
      {showSaeunWolun && saeunData && wolunData && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2 text-center">세운과 월운</h3>
          
          {/* 세운 테이블 (4열) */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {/* 9행: 년도 (우측→좌측) */}
            {[...saeunData.years].reverse().map((year, index) => (
              <div key={`year-${index}`} className="text-center">
                <div className="py-1 px-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 border rounded">
                  {year}
                </div>
              </div>
            ))}
            
            {/* 10행: 세운 천간 (우측→좌측) */}
            {[...saeunData.skyStems].reverse().map((sky, index) => (
              <div key={`saeun-sky-${index}`} className="text-center">
                <div 
                  className="py-2 px-1 text-lg font-bold border rounded text-black"
                  style={{ backgroundColor: getWuxingColor(sky) }}
                >
                  {sky}
                </div>
              </div>
            ))}
            
            {/* 11행: 세운 지지 (우측→좌측) */}
            {[...saeunData.earthBranches].reverse().map((earth, index) => (
              <div key={`saeun-earth-${index}`} className="text-center">
                <div 
                  className="py-2 px-1 text-lg font-bold border rounded text-black"
                  style={{ backgroundColor: getWuxingColor(earth) }}
                >
                  {earth}
                </div>
              </div>
            ))}
            
            {/* 12행: 나이 (우측→좌측) */}
            {[...saeunData.ages].reverse().map((age, index) => (
              <div key={`age-${index}`} className="text-center">
                <div className="py-1 px-1 text-xs font-medium bg-gray-50 dark:bg-gray-800 border rounded">
                  {age}
                </div>
              </div>
            ))}
          </div>
          
          {/* 빈 줄 */}
          <div className="my-2"></div>
          
          {/* 14행: 월운 (flex로 변경) */}
          <div className="flex gap-1 overflow-x-auto">
            {wolunData.map((month, index) => (
              <div key={`wolun-${index}`} className="text-center flex-shrink-0">
                <div className="py-1 px-2 text-xs font-medium bg-green-50 dark:bg-green-900/20 border rounded min-w-[24px]">
                  {month}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}