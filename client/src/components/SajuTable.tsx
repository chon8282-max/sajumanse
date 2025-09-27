import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI } from "@shared/schema";
import { calculateCompleteYukjin, calculateYukjin, calculateEarthlyBranchYukjin } from "@/lib/yukjin-calculator";
import { calculateDaeunNumber } from "@/lib/daeun-calculator";
import { User, UserCheck } from "lucide-react";
import { useMemo } from "react";

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

    for (let i = 0; i < 10; i++) {
      if (isForward) {
        // 순행: 월주부터 다음으로
        skies.push(heavenlyStems[(monthSkyIndex + i) % 10]);
        earths.push(earthlyBranches[(monthEarthIndex + i) % 12]);
      } else {
        // 역행: 월주부터 이전으로
        skies.push(heavenlyStems[(monthSkyIndex - i + 10) % 10]);
        earths.push(earthlyBranches[(monthEarthIndex - i + 12) % 12]);
      }
    }

    return { skies, earths };
  }, [gender, saju.year.sky, saju.month.sky, saju.month.earth]);


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

      {/* 개인정보 표시 */}
      {name && (
        <div className="mb-6 p-4 bg-muted/30 border border-border rounded-md">
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
            <span className="font-medium" data-testid="text-age">{age}세</span>
          </div>

          {/* 두 번째 줄: 양력생일, 음력생일, 생시 */}
          <div className="text-center text-xs text-muted-foreground">
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
        </div>
      )}

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

        {/* 6행: 대운수 (우측에서 좌측으로) */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunAges.map((age, colIndex) => (
            <div 
              key={`daeun-age-${colIndex}`}
              className="p-2 text-center text-sm font-medium border-r border-border last:border-r-0 min-h-[2rem] bg-blue-50 dark:bg-blue-950/30"
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
              className="p-3 text-center text-2xl font-bold border-r border-border last:border-r-0"
              style={{ 
                color: '#000000',
                backgroundColor: getGanjiBackgroundColor(sky)
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
              className="p-3 text-center text-2xl font-bold border-r border-border last:border-r-0"
              style={{ 
                color: '#000000',
                backgroundColor: getGanjiBackgroundColor(earth)
              }}
              data-testid={`text-daeun-earth-${colIndex}`}
            >
              {earth}
            </div>
          ))}
        </div>

        {/* 9행: 12칸 */}
        <div className="grid grid-cols-12 border-b border-border">
          {Array.from({ length: 12 }, (_, colIndex) => (
            <div 
              key={`extra-cell-9-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-9-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 10행: 12칸 */}
        <div className="grid grid-cols-12 border-b border-border">
          {Array.from({ length: 12 }, (_, colIndex) => (
            <div 
              key={`extra-cell-10-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-10-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 11행: 12칸 */}
        <div className="grid grid-cols-12 border-b border-border">
          {Array.from({ length: 12 }, (_, colIndex) => (
            <div 
              key={`extra-cell-11-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-11-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 12행: 12칸 */}
        <div className="grid grid-cols-12 border-b border-border">
          {Array.from({ length: 12 }, (_, colIndex) => (
            <div 
              key={`extra-cell-12-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-12-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 13행: 1칸 (합쳐진 셀) */}
        <div className="grid grid-cols-1 border-b border-border">
          <div 
            className="p-2 text-center text-sm min-h-[2rem]"
            data-testid="text-extra-13-0"
          >
            {/* 빈 셀 - 추후 내용 추가 예정 */}
          </div>
        </div>

        {/* 14행: 13칸 */}
        <div className="grid grid-cols-13 border-b border-border">
          {Array.from({ length: 13 }, (_, colIndex) => (
            <div 
              key={`extra-cell-14-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-14-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 15행: 13칸 */}
        <div className="grid grid-cols-13 border-b border-border">
          {Array.from({ length: 13 }, (_, colIndex) => (
            <div 
              key={`extra-cell-15-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-15-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 16행: 13칸 */}
        <div className="grid grid-cols-13 border-b border-border">
          {Array.from({ length: 13 }, (_, colIndex) => (
            <div 
              key={`extra-cell-16-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-16-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 17행: 4칸 (기존 유지) */}
        <div className="grid grid-cols-4 border-b border-border">
          {Array.from({ length: 4 }, (_, colIndex) => (
            <div 
              key={`extra-cell-17-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-17-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
        </div>

        {/* 18행: 4칸 (기존 유지) */}
        <div className="grid grid-cols-4 border-b border-border">
          {Array.from({ length: 4 }, (_, colIndex) => (
            <div 
              key={`extra-cell-18-${colIndex}`}
              className="p-2 text-center text-sm border-r border-border last:border-r-0 min-h-[2rem]"
              data-testid={`text-extra-18-${colIndex}`}
            >
              {/* 빈 셀 - 추후 내용 추가 예정 */}
            </div>
          ))}
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