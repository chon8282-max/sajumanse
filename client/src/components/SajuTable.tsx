import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI } from "@shared/schema";
import { calculateCompleteYukjin, calculateYukjin, calculateEarthlyBranchYukjin } from "@/lib/yukjin-calculator";
import { calculateDaeunNumber } from "@/lib/daeun-calculator";
import { User, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

interface SajuTableProps {
  saju: SajuInfo;
  title?: string;
  name?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  lunarYear?: number;
  lunarMonth?: number;
  lunarDay?: number;
  birthHour?: string;
  daySky?: string;
  dayEarth?: string;
  gender?: string;
  memo?: string;
}

// 지장간 계산 - 사용자 요청 수정사항 반영
const EARTHLY_BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['壬', '癸'],      // 자 = 임계
  '丑': ['癸', '辛', '己'], // 축 = 계신기
  '寅': ['戊', '丙', '甲'], // 인 = 무병갑
  '卯': ['甲', '乙'],      // 묘 = 갑을
  '辰': ['乙', '癸', '戊'], // 진 = 을계무
  '巳': ['戊', '庚', '丙'], // 사 = 무경병
  '午': ['丙', '己', '丁'], // 오 = 병기정
  '未': ['丁', '乙', '己'], // 미 = 정을기
  '申': ['戊', '壬', '庚'], // 신 = 무임경
  '酉': ['庚', '辛'],      // 유 = 경신
  '戌': ['辛', '丁', '戊'], // 술 = 신정무
  '亥': ['戊', '甲', '壬']  // 해 = 무갑임
};

export default function SajuTable({ 
  saju, 
  title = "사주명식", 
  name,
  birthYear,
  birthMonth,
  birthDay,
  lunarYear,
  lunarMonth,
  lunarDay,
  birthHour,
  daySky,
  dayEarth,
  gender = '남자',
  memo
}: SajuTableProps) {

  // 나이 계산 (메모이제이션)
  const age = useMemo(() => {
    if (!birthYear) return 0;
    
    const today = new Date();
    const birthDate = new Date(birthYear, (birthMonth || 1) - 1, birthDay || 1);
    
    // 만 나이 계산
    const manAge = today.getFullYear() - birthDate.getFullYear() - 
      (today.getMonth() < birthDate.getMonth() || 
       (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
    
    // 한국식 나이 (만 나이 + 1)
    return manAge + 1;
  }, [birthYear, birthMonth, birthDay]);

  // 메모 상태 관리
  const [memoText, setMemoText] = useState(memo || '');

  // 오늘 날짜를 메모에 추가하는 함수
  const insertTodayDate = () => {
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const currentMemo = memoText;
    const newMemo = currentMemo ? `${currentMemo}\n${dateString}` : dateString;
    setMemoText(newMemo);
  };

  // 생시 한자 표시 함수
  const formatBirthHour = (hour?: string): string => {
    if (!hour) return '';
    
    // 이미 한자 형태인 경우 그대로 반환 (예: "亥時")
    if (hour.includes('時')) {
      return hour;
    }
    
    // 숫자 형태인 경우 한자로 변환 (예: "22" -> "戌時")
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '未詳';
    
    const timeHanja = {
      23: '子時', 1: '子時', 3: '丑時', 5: '寅時', 7: '卯時',
      9: '辰時', 11: '巳時', 13: '午時', 15: '未時', 17: '申時',
      19: '酉時', 21: '戌時'
    };
    
    // 가장 가까운 시간대 찾기
    const timeKeys = Object.keys(timeHanja).map(Number).sort((a, b) => a - b);
    let closestTime = timeKeys[0];
    for (const time of timeKeys) {
      if (hourNum >= time) {
        closestTime = time;
      }
    }
    
    return timeHanja[closestTime as keyof typeof timeHanja] || '未詳';
  };

  // 사주 데이터 구성 (메모이제이션)
  const sajuColumns = useMemo(() => [
    { label: "시주", sky: saju.hour.sky, earth: saju.hour.earth },
    { label: "일주", sky: saju.day.sky, earth: saju.day.earth },
    { label: "월주", sky: saju.month.sky, earth: saju.month.earth },
    { label: "년주", sky: saju.year.sky, earth: saju.year.earth }
  ], [saju]);

  // 육친 계산 (메모이제이션)
  const { heavenlyYukjin, earthlyYukjin } = useMemo(() => {
    const dayStem = saju.day.sky;
    return {
      heavenlyYukjin: sajuColumns.map(col => {
        if (col.sky === dayStem) return "일간";
        return calculateYukjin(dayStem, col.sky);
      }),
      earthlyYukjin: sajuColumns.map(col => {
        return calculateEarthlyBranchYukjin(dayStem, col.earth);
      })
    };
  }, [sajuColumns, saju.day.sky]);

  // 지장간 계산 (메모이제이션)
  const jijanggan = useMemo(() => {
    return sajuColumns.map(col => {
      const hiddenStems = EARTHLY_BRANCH_HIDDEN_STEMS[col.earth] || [];
      return hiddenStems.join('');
    });
  }, [sajuColumns]);

  // 대운수 계산 (메모이제이션)
  const daeunAges = useMemo(() => {
    if (!birthYear || !birthMonth || !birthDay || !gender || !saju.year.sky) {
      return Array.from({ length: 10 }, (_, i) => 93 - (i * 10));
    }

    try {
      const startDaeun = calculateDaeunNumber(birthYear, birthMonth, birthDay, gender, saju.year.sky);
      return Array.from({ length: 10 }, (_, i) => startDaeun + (9 - i) * 10);
    } catch {
      return Array.from({ length: 10 }, (_, i) => 93 - (i * 10));
    }
  }, [birthYear, birthMonth, birthDay, gender, saju.year.sky]);

  // 세운 년도 계산 (9행용 - 12칸, 우측에서 좌측)
  const saeunYears = useMemo(() => {
    if (!birthYear) {
      return Array.from({ length: 12 }, (_, i) => 2024 - i);
    }
    // 우측에서 좌측: 출생년도부터 11년 더한 값까지
    return Array.from({ length: 12 }, (_, i) => birthYear + 11 - i);
  }, [birthYear]);

  // 세운 나이 계산 (12행용 - 12칸, 우측에서 좌측)  
  const saeunAges = useMemo(() => {
    // 우측에서 좌측: 1살부터 12살까지
    return Array.from({ length: 12 }, (_, i) => 12 - i);
  }, []);

  // 세운 간지 계산 (10행, 11행용 - 12칸, 우측에서 좌측)
  const saeunGanji = useMemo(() => {
    if (!birthYear || !saju.year.sky || !saju.year.earth) {
      return { skies: Array(12).fill(''), earths: Array(12).fill('') };
    }

    // 60갑자 순환
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    
    // 출생년도의 간지 인덱스 찾기
    const yearSkyIndex = heavenlyStems.indexOf(saju.year.sky);
    const yearEarthIndex = earthlyBranches.indexOf(saju.year.earth);
    
    const skies: string[] = [];
    const earths: string[] = [];

    // 우측에서 좌측: 출생년부터 11년 더한 간지까지
    for (let i = 0; i < 12; i++) {
      const yearOffset = 11 - i; // 우측에서 좌측 순서
      skies.push(heavenlyStems[(yearSkyIndex + yearOffset) % 10]);
      earths.push(earthlyBranches[(yearEarthIndex + yearOffset) % 12]);
    }

    return { skies, earths };
  }, [birthYear, saju.year.sky, saju.year.earth]);

  // 월운 간지 계산 (14행, 15행용 - 13칸, 우측에서 좌측)
  const wolunGanji = useMemo(() => {
    if (!saju.year.sky) {
      return { skies: Array(13).fill(''), earths: Array(13).fill('') };
    }

    // 천간 배열
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    // 지지 배열 (축부터 시작)
    const monthlyBranches = ["丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子"];
    
    // 년간에 따른 정월의 천간 결정
    const yearSkyIndex = heavenlyStems.indexOf(saju.year.sky);
    let firstMonthSkyIndex = 0;
    
    // 갑기년: 정월은 丙 (인덱스 2)
    // 을경년: 정월은 戊 (인덱스 4) 
    // 병신년: 정월은 庚 (인덱스 6)
    // 정임년: 정월은 壬 (인덱스 8)
    // 무계년: 정월은 甲 (인덱스 0)
    const monthStartMap = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 甲부터 癸까지
    firstMonthSkyIndex = monthStartMap[yearSkyIndex];
    
    const skies: string[] = [];
    const earths: string[] = [];

    // 13개월 (12개월 + 윤달 고려) 우측에서 좌측으로
    for (let i = 0; i < 13; i++) {
      const monthOffset = 12 - i; // 우측에서 좌측 순서
      skies.push(heavenlyStems[(firstMonthSkyIndex + monthOffset) % 10]);
      earths.push(monthlyBranches[monthOffset % 12]);
    }

    return { skies, earths };
  }, [saju.year.sky]);

  // 월운 월 순서 (16행용 - 13칸, 우측에서 좌측)
  const wolunMonths = useMemo(() => {
    // 우측에서 좌측: 13월부터 1월까지
    return Array.from({ length: 13 }, (_, i) => 13 - i);
  }, []);

  // 대운 간지 계산 (7행, 8행용)
  const daeunGanji = useMemo(() => {
    if (!gender || !saju.year.sky || !saju.month.sky || !saju.month.earth) {
      return { skies: Array(10).fill(''), earths: Array(10).fill('') };
    }

    // 양년/음년 판정 (천간)
    const yangCheongan = ["甲", "丙", "戊", "庚", "壬"];
    const isYangYear = yangCheongan.includes(saju.year.sky);
    
    // 순행/역행 결정
    let isForward: boolean;
    if (gender === "남자") {
      isForward = isYangYear; // 양년=순행, 음년=역행
    } else {
      isForward = !isYangYear; // 양년=역행, 음년=순행
    }

    // 천간 배열 (순서)
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    // 지지 배열 (순서)
    const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

    // 월주 천간, 지지의 인덱스 찾기
    const monthSkyIndex = heavenlyStems.indexOf(saju.month.sky);
    const monthEarthIndex = earthlyBranches.indexOf(saju.month.earth);

    const skies: string[] = [];
    const earths: string[] = [];

    // 월주 다음/이전부터 10개 대운 계산
    for (let i = 0; i < 10; i++) {
      if (isForward) {
        // 순행: 월주 다음부터 (monthIndex + 1 + i)
        skies.push(heavenlyStems[(monthSkyIndex + 1 + i) % 10]);
        earths.push(earthlyBranches[(monthEarthIndex + 1 + i) % 12]);
      } else {
        // 역행: 월주 이전부터 (monthIndex - 1 - i)
        skies.push(heavenlyStems[(monthSkyIndex - 1 - i + 10) % 10]);
        earths.push(earthlyBranches[(monthEarthIndex - 1 - i + 12) % 12]);
      }
    }

    // 우측에서 좌측으로 표시하기 위해 배열 뒤집기
    return { skies: skies.reverse(), earths: earths.reverse() };
  }, [gender, saju.year.sky, saju.month.sky, saju.month.earth]);


  // 간지별 배경색 매핑
  function getGanjiBackgroundColor(character: string): string {
    const ganjiColorMap: Record<string, string> = {
      // 갑을인묘 = dcfce7 (한글)
      '갑': '#dcfce7', '을': '#dcfce7', '인': '#dcfce7', '묘': '#dcfce7',
      // 갑을인묘 = dcfce7 (한자)
      '甲': '#dcfce7', '乙': '#dcfce7', '寅': '#dcfce7', '卯': '#dcfce7',
      // 병정사오 = fee2e2 (한글)
      '병': '#fee2e2', '정': '#fee2e2', '사': '#fee2e2', '오': '#fee2e2',
      // 병정사오 = fee2e2 (한자)
      '丙': '#fee2e2', '丁': '#fee2e2', '巳': '#fee2e2', '午': '#fee2e2',
      // 무기진미술축 = fbfce6 (한글)
      '무': '#fbfce6', '기': '#fbfce6', '진': '#fbfce6', '미': '#fbfce6', '술': '#fbfce6', '축': '#fbfce6',
      // 무기진미술축 = fbfce6 (한자)
      '戊': '#fbfce6', '己': '#fbfce6', '辰': '#fbfce6', '未': '#fbfce6', '戌': '#fbfce6', '丑': '#fbfce6',
      // 경신유 = ffffff (한글)
      '경': '#ffffff', '신': '#ffffff', '유': '#ffffff',
      // 경신유 = ffffff (한자)
      '庚': '#ffffff', '辛': '#ffffff', '酉': '#ffffff',
      // 임계해자 = e7e7e6 (한글)
      '임': '#e7e7e6', '계': '#e7e7e6', '해': '#e7e7e6', '자': '#e7e7e6',
      // 임계해자 = e7e7e6 (한자)
      '壬': '#e7e7e6', '癸': '#e7e7e6', '亥': '#e7e7e6', '子': '#e7e7e6',
      // 추가 지지 (한자)
      '申': '#ffffff' 
    };
    
    return ganjiColorMap[character] || '#ffffff';
  }


  return (
    <Card className="p-4" data-testid="card-saju-table">

      {/* 개인정보 표시 */}
      {name && (
        <div className="mb-2 p-3 bg-muted/30 border border-border rounded-md">
          {/* 첫 번째 줄: 이름, 성별, 나이 */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-bold text-lg" data-testid="text-name">{name}</span>
            <div className="flex items-center gap-1">
              {gender === '남자' ? (
                <User className="w-4 h-4 text-blue-600" data-testid="icon-male" />
              ) : (
                <UserCheck className="w-4 h-4 text-pink-600" data-testid="icon-female" />
              )}
              <span className="text-sm" data-testid="text-gender">{gender}</span>
            </div>
            <span className="font-medium" data-testid="text-age">{age}</span>
          </div>

          {/* 두 번째 줄: 양력생일, 음력생일, 생시 */}
          <div className="text-center text-xs text-muted-foreground mb-3">
            <span data-testid="text-birth-info">
              {birthYear && birthMonth && birthDay && (
                <>양력: {birthYear}.{birthMonth.toString().padStart(2, '0')}.{birthDay.toString().padStart(2, '0')}</>
              )}
              {lunarYear && lunarMonth && lunarDay && (
                <>  음력: {lunarYear}.{lunarMonth.toString().padStart(2, '0')}.{lunarDay.toString().padStart(2, '0')}</>
              )}
              {birthHour && (
                <>  ({formatBirthHour(birthHour)})</>
              )}
            </span>
          </div>

          {/* 세 번째 줄: 5개 버튼 */}
          <div className="flex flex-wrap justify-center gap-2">
            <button 
              className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 border border-orange-300 dark:border-orange-700 rounded-md transition-colors"
              data-testid="button-wuxing"
            >
              오행
            </button>
            <button 
              className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 border border-purple-300 dark:border-purple-700 rounded-md transition-colors"
              data-testid="button-sinsal"
            >
              신살
            </button>
            <button 
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 border border-blue-300 dark:border-blue-700 rounded-md transition-colors"
              data-testid="button-12sinsal"
            >
              12신살
            </button>
            <button 
              className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 border border-green-300 dark:border-green-700 rounded-md transition-colors"
              data-testid="button-hangul"
            >
              한글
            </button>
            <button 
              className="px-3 py-1 text-xs bg-pink-100 hover:bg-pink-200 dark:bg-pink-900 dark:hover:bg-pink-800 border border-pink-300 dark:border-pink-700 rounded-md transition-colors"
              data-testid="button-compatibility"
            >
              궁합
            </button>
          </div>
        </div>
      )}

      {/* 사주명식 메인 테이블 */}
      <div className="border border-border">
        {/* 1행: 천간 육친 */}
        <div className="grid grid-cols-4 border-b border-border">
          {heavenlyYukjin.map((yukjin, index) => (
            <div 
              key={`yukjin-sky-${index}`} 
              className="py-1 text-center text-sm font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
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
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(col.sky),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3), 1px 1px 2px rgba(0,0,0,0.2)'
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
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(col.earth),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3), 1px 1px 2px rgba(0,0,0,0.2)'
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
              className="py-1 text-center text-sm font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
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
              className="py-1 text-center text-sm border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3), 0.5px 0.5px 1px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-jijanggan-${index}`}
            >
              {stems}
            </div>
          ))}
        </div>

        {/* 6행: 대운수 (우측에서 좌측으로) */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunAges.map((age, colIndex) => (
            <div 
              key={`daeun-age-${colIndex}`}
              className="py-1 text-center text-sm font-medium border-r border-border last:border-r-0 min-h-[1.5rem] bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center"
              data-testid={`text-daeun-age-${colIndex}`}
            >
              {age}
            </div>
          ))}
        </div>

        {/* 7행: 대운 천간 */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunGanji.skies.map((sky, colIndex) => (
            <div 
              key={`daeun-sky-${colIndex}`}
              className="py-1 text-center text-sm font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(sky),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3), 0.5px 0.5px 1px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-daeun-sky-${colIndex}`}
            >
              {sky}
            </div>
          ))}
        </div>

        {/* 8행: 대운 지지 */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunGanji.earths.map((earth, colIndex) => (
            <div 
              key={`daeun-earth-${colIndex}`}
              className="py-1 text-center text-sm font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(earth),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3), 0.5px 0.5px 1px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-daeun-earth-${colIndex}`}
            >
              {earth}
            </div>
          ))}
        </div>

        {/* 9행: 세운 년도 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunYears.map((year, colIndex) => (
            <div 
              key={`saeun-year-${colIndex}`}
              className="py-1 text-center text-xs font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ backgroundColor: '#fde8fa' }}
              data-testid={`text-saeun-year-${colIndex}`}
            >
              {year}
            </div>
          ))}
        </div>

        {/* 10행: 세운 천간 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunGanji.skies.map((sky, colIndex) => (
            <div 
              key={`saeun-sky-${colIndex}`}
              className="py-1 text-center text-xs font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(sky),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.3), 0.25px 0.25px 0.5px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-saeun-sky-${colIndex}`}
            >
              {sky}
            </div>
          ))}
        </div>

        {/* 11행: 세운 지지 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunGanji.earths.map((earth, colIndex) => (
            <div 
              key={`saeun-earth-${colIndex}`}
              className="py-1 text-center text-xs font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(earth),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.3), 0.25px 0.25px 0.5px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-saeun-earth-${colIndex}`}
            >
              {earth}
            </div>
          ))}
        </div>

        {/* 12행: 세운 나이 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunAges.map((age, colIndex) => (
            <div 
              key={`saeun-age-${colIndex}`}
              className="py-1 text-center text-xs font-medium border-r border-border last:border-r-0 min-h-[1.5rem] bg-white flex items-center justify-center"
              data-testid={`text-saeun-age-${colIndex}`}
            >
              {age}
            </div>
          ))}
        </div>

        {/* 13행: 월운(月運) 제목 */}
        <div className="grid grid-cols-1 border-b border-border">
          <div 
            className="py-1 text-center text-xs font-bold min-h-[1.5rem] flex items-center justify-center text-white"
            style={{ backgroundColor: '#1b1464' }}
            data-testid="text-wolun-title"
          >
            월운(月運)
          </div>
        </div>

        {/* 14행: 월운 천간 (우측에서 좌측) */}
        <div className="grid grid-cols-13 border-b border-border">
          {wolunGanji.skies.map((sky, colIndex) => (
            <div 
              key={`wolun-sky-${colIndex}`}
              className="py-1 text-center text-xs font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(sky),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.3), 0.25px 0.25px 0.5px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-wolun-sky-${colIndex}`}
            >
              {sky}
            </div>
          ))}
        </div>

        {/* 15행: 월운 지지 (우측에서 좌측) */}
        <div className="grid grid-cols-13 border-b border-border">
          {wolunGanji.earths.map((earth, colIndex) => (
            <div 
              key={`wolun-earth-${colIndex}`}
              className="py-1 text-center text-xs font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: '#131313',
                backgroundColor: getGanjiBackgroundColor(earth),
                fontFamily: "'ChosunKm', sans-serif",
                fontWeight: '900',
                textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.3), 0.25px 0.25px 0.5px rgba(0,0,0,0.2)'
              }}
              data-testid={`text-wolun-earth-${colIndex}`}
            >
              {earth}
            </div>
          ))}
        </div>

        {/* 16행: 월운 월 순서 (우측에서 좌측) */}
        <div className="grid grid-cols-13 border-b border-border">
          {wolunMonths.map((month, colIndex) => (
            <div 
              key={`wolun-month-${colIndex}`}
              className="py-1 text-center text-xs font-medium border-r border-border last:border-r-0 min-h-[1.5rem] bg-white flex items-center justify-center"
              data-testid={`text-wolun-month-${colIndex}`}
            >
              {colIndex === 0 ? 1 : month}
            </div>
          ))}
        </div>

        {/* 17행: 메모 + 오늘 날짜 */}
        <div className="flex border-b border-border">
          <div 
            className="flex-1 py-1 text-center text-xs font-bold min-h-[1.5rem] flex items-center justify-center text-white border-r border-border"
            style={{ backgroundColor: '#1b1464' }}
            data-testid="text-memo-title"
          >
            메모
          </div>
          <button 
            className="px-3 py-1 text-xs bg-white hover:bg-gray-50 border-l border-border cursor-pointer transition-colors"
            style={{ color: 'var(--foreground)' }}
            onClick={insertTodayDate}
            data-testid="button-today-date"
          >
            오늘날짜
          </button>
        </div>

        {/* 18행: 메모 입력 박스 */}
        <div className="border-b border-border">
          <div className="p-4 bg-white flex justify-center">
            <textarea
              className="w-full max-w-2xl min-h-[10rem] text-xs border border-gray-300 rounded px-2 py-1 resize-vertical"
              placeholder="메모를 입력하세요..."
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              data-testid="textarea-memo"
            />
          </div>
        </div>

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