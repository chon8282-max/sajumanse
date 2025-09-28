import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI } from "@shared/schema";
import { calculateCompleteYukjin, calculateYukjin, calculateEarthlyBranchYukjin } from "@/lib/yukjin-calculator";
import { calculateDaeunNumber, type DaeunPeriod } from "@/lib/daeun-calculator";
import { User, UserCheck } from "lucide-react";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import type { TouchEvent } from "react";

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
  // 대운/세운 상호작용 props
  currentAge?: number | null;
  focusedDaeun?: DaeunPeriod | null;
  daeunPeriods?: DaeunPeriod[];
  saeunOffset?: number;
  saeunData?: any;
  onDaeunClick?: (period: DaeunPeriod) => void;
  onSaeunClick?: (age: number) => void;
  onSaeunScroll?: (direction: 'left' | 'right') => void;
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
  memo,
  // 대운/세운 상호작용 props
  currentAge,
  focusedDaeun,
  daeunPeriods = [],
  saeunOffset = 0,
  saeunData,
  onDaeunClick,
  onSaeunClick,
  onSaeunScroll
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
  
  // 선택된 세운 나이 상태 (초기값: 현재 나이)
  const [selectedSaeunAge, setSelectedSaeunAge] = useState<number | null>(currentAge || null);
  
  // currentAge가 변경되면 selectedSaeunAge도 업데이트
  useEffect(() => {
    if (currentAge && !selectedSaeunAge) {
      setSelectedSaeunAge(currentAge);
    }
  }, [currentAge, selectedSaeunAge]);
  
  // 세운 클릭 핸들러 (내부용)
  const handleSaeunAgeClick = useCallback((age: number) => {
    setSelectedSaeunAge(age);
    if (onSaeunClick) {
      onSaeunClick(age);
    }
  }, [onSaeunClick]);
  
  // 터치 드래그 상태 관리
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // 오늘 날짜를 메모에 추가하는 함수
  const insertTodayDate = () => {
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const currentMemo = memoText;
    const newMemo = currentMemo ? `${currentMemo}\n${dateString}` : dateString;
    setMemoText(newMemo);
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    if (Math.abs(touchEndX.current - touchStartX.current) > 10) {
      isDragging.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isDragging.current && onSaeunScroll) {
      const deltaX = touchEndX.current - touchStartX.current;
      if (Math.abs(deltaX) > 50) { // 최소 50px 드래그 시에만 반응
        if (deltaX > 0) {
          onSaeunScroll('left'); // 오른쪽으로 드래그 = 왼쪽으로 스크롤
        } else {
          onSaeunScroll('right'); // 왼쪽으로 드래그 = 오른쪽으로 스크롤
        }
      }
    }
    isDragging.current = false;
  }, [onSaeunScroll]);

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

  // 세운 데이터 계산 (현재 나이 기준, 기존 규칙 복원)
  const saeunDisplayData = useMemo(() => {
    if (saeunData && saeunData.years && saeunData.ages && saeunData.skyStems && saeunData.earthBranches) {
      // saeunData에서 직접 사용 (우측에서 좌측 순서로 정렬)
      return {
        years: [...saeunData.years].reverse(),
        ages: [...saeunData.ages].reverse(),
        skies: [...saeunData.skyStems].reverse(),
        earths: [...saeunData.earthBranches].reverse()
      };
    }
    
    // 기존 규칙: 현재 나이를 중심으로 12년 표시 (현재 나이가 중간에 위치)
    if (!birthYear) {
      return {
        years: Array.from({ length: 12 }, (_, i) => 2024 - i),
        ages: Array.from({ length: 12 }, (_, i) => 12 - i),
        skies: Array(12).fill(''),
        earths: Array(12).fill('')
      };
    }
    
    // 현재 나이가 중간에 오도록 (6번째 위치)
    const centerAge = currentAge || age;
    let startAge = Math.max(1, centerAge - 5);
    
    // focusedDaeun이 있으면 해당 대운의 시작 나이 기준으로 조정
    if (focusedDaeun) {
      startAge = focusedDaeun.startAge + (saeunOffset || 0);
    }
    
    // 나이와 연도 계산: 태어난 해가 1세 (한국식 나이)
    const ages = Array.from({ length: 12 }, (_, i) => startAge + 11 - i);
    const years = Array.from({ length: 12 }, (_, i) => {
      const ageForYear = startAge + 11 - i;
      return birthYear + (ageForYear - 1); // 1세 = 태어난 해
    });
    
    // 간지 계산
    let skies: string[] = [];
    let earths: string[] = [];
    
    if (saju.year.sky && saju.year.earth) {
      const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
      const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
      
      const yearSkyIndex = heavenlyStems.indexOf(saju.year.sky);
      const yearEarthIndex = earthlyBranches.indexOf(saju.year.earth);
      
      for (let i = 0; i < 12; i++) {
        const ageForThisColumn = startAge + 11 - i;
        const yearForThisColumn = birthYear + (ageForThisColumn - 1);
        
        // 갑자년(1984)을 기준으로 해당 연도의 간지 계산
        const yearsSince1984 = yearForThisColumn - 1984;
        
        // 음수 처리를 위한 올바른 모듈로 연산
        let skyIndex = yearsSince1984 % 10;
        if (skyIndex < 0) skyIndex += 10;
        
        let earthIndex = yearsSince1984 % 12; 
        if (earthIndex < 0) earthIndex += 12;
        
        skies.push(heavenlyStems[skyIndex]);
        earths.push(earthlyBranches[earthIndex]);
      }
    } else {
      skies = Array(12).fill('');
      earths = Array(12).fill('');
    }
    
    return { years, ages, skies, earths };
  }, [saeunData, birthYear, currentAge, age, focusedDaeun, saeunOffset, saju.year.sky, saju.year.earth]);

  // 개별 배열들 (기존 코드 호환성을 위해)
  const saeunYears = saeunDisplayData.years;
  const saeunAges = saeunDisplayData.ages;
  const saeunGanji = { skies: saeunDisplayData.skies, earths: saeunDisplayData.earths };

  // 월운 간지 계산 (14행, 15행용 - 13칸, 우측에서 좌측) - 선택된 세운과 연동
  const wolunGanji = useMemo(() => {
    // 선택된 세운 나이에 해당하는 연도 기준, 없으면 태어난 해 기준
    let targetYear = birthYear || new Date().getFullYear();
    
    if (selectedSaeunAge && birthYear) {
      // 선택된 세운 나이에 해당하는 연도 계산
      targetYear = birthYear + selectedSaeunAge - 1;
    } else if (focusedDaeun && saeunDisplayData.years.length > 0) {
      // fallback: 현재 표시된 세운의 첫 번째 연도 사용
      targetYear = saeunDisplayData.years[0];
    }
    
    // 해당 연도의 천간 찾기
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    
    // 갑자년(1984)을 기준으로 해당 연도의 천간 계산
    const yearSkyIndex = (targetYear - 1984) % 10;
    const targetYearSky = heavenlyStems[yearSkyIndex < 0 ? yearSkyIndex + 10 : yearSkyIndex];
    
    // 월운 간지 계산 규칙: 세운을 기준으로 우측(13열)에서 좌측(1열)로 진행
    const wolunStartTable: { [key: string]: string } = {
      "甲": "乙丑", // 갑년: 을축부터 시작
      "乙": "丁丑", // 을년: 정축부터 시작
      "丙": "己丑", // 병년: 기축부터 시작
      "丁": "辛丑", // 정년: 신축부터 시작
      "戊": "癸丑", // 무년: 계축부터 시작
      "己": "乙丑", // 기년: 을축부터 시작 (갑년과 동일)
      "庚": "丁丑", // 경년: 정축부터 시작 (을년과 동일)
      "辛": "己丑", // 신년: 기축부터 시작 (병년과 동일)
      "壬": "辛丑", // 임년: 신축부터 시작 (정년과 동일)
      "癸": "癸丑"  // 계년: 계축부터 시작 (무년과 동일)
    };
    
    const startGanji = wolunStartTable[targetYearSky] || "乙丑";
    const startSky = startGanji[0];
    const startEarth = startGanji[1];
    
    const startSkyIndex = heavenlyStems.indexOf(startSky);
    const startEarthIndex = earthlyBranches.indexOf(startEarth);
    
    // 우측에서 좌측으로 배치: 축자해술유신미오사진묘인축
    // 지지 순서 (우측에서 좌측): 13열=축, 12열=자, 11열=해, ..., 2열=인, 1열=축
    const earthOrder = ["丑", "子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑"];
    
    const skies: string[] = [];
    const earths: string[] = [];

    // 13개월 (우측에서 좌측으로 배치)
    for (let i = 0; i < 13; i++) {
      // 지지는 고정 순서 사용
      const earthChar = earthOrder[i];
      earths.push(earthChar);
      
      // 천간은 해당 연도와 월에 맞게 계산
      const earthIndex = earthlyBranches.indexOf(earthChar);
      const startEarthIdx = earthlyBranches.indexOf(startEarth);
      
      // 시작 지지로부터의 오프셋 계산
      let monthOffset = (earthIndex - startEarthIdx + 12) % 12;
      
      // 13열(i=0)과 1열(i=12)이 모두 축이므로, 1열은 전해 축월이 되도록 조정
      if (i === 12) {
        monthOffset = monthOffset - 12; // 1년 전으로 설정
      }
      
      const skyIndex = (startSkyIndex + monthOffset + 10) % 10;
      skies.push(heavenlyStems[skyIndex]);
    }

    return { skies, earths };
  }, [birthYear, selectedSaeunAge, focusedDaeun, saeunDisplayData.years]);

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
      // 갑을인묘 = 206000 (목) - 한글
      '갑': '#206000', '을': '#206000', '인': '#206000', '묘': '#206000',
      // 갑을인묘 = 206000 (목) - 한자
      '甲': '#206000', '乙': '#206000', '寅': '#206000', '卯': '#206000',
      // 병정사오 = ff0000 (화) - 한글
      '병': '#ff0000', '정': '#ff0000', '사': '#ff0000', '오': '#ff0000',
      // 병정사오 = ff0000 (화) - 한자
      '丙': '#ff0000', '丁': '#ff0000', '巳': '#ff0000', '午': '#ff0000',
      // 무기진미술축 = ffff00 (토) - 한글
      '무': '#ffff00', '기': '#ffff00', '진': '#ffff00', '미': '#ffff00', '술': '#ffff00', '축': '#ffff00',
      // 무기진미술축 = ffff00 (토) - 한자
      '戊': '#ffff00', '己': '#ffff00', '辰': '#ffff00', '未': '#ffff00', '戌': '#ffff00', '丑': '#ffff00',
      // 경신신유 = ffffff (금) - 한글
      '경': '#ffffff', '신': '#ffffff', '유': '#ffffff',
      // 경신신유 = ffffff (금) - 한자
      '庚': '#ffffff', '辛': '#ffffff', '申': '#ffffff', '酉': '#ffffff',
      // 임계해자 = 000000 (수) - 한글
      '임': '#000000', '계': '#000000', '해': '#000000', '자': '#000000',
      // 임계해자 = 000000 (수) - 한자
      '壬': '#000000', '癸': '#000000', '亥': '#000000', '子': '#000000'
    };
    
    return ganjiColorMap[character] || '#ffffff';
  }

  // 간지별 글자색 매핑
  function getGanjiTextColor(character: string): string {
    const ganjiTextColorMap: Record<string, string> = {
      // 갑을인묘 = ffffff (목) - 한글
      '갑': '#ffffff', '을': '#ffffff', '인': '#ffffff', '묘': '#ffffff',
      // 갑을인묘 = ffffff (목) - 한자
      '甲': '#ffffff', '乙': '#ffffff', '寅': '#ffffff', '卯': '#ffffff',
      // 병정사오 = ffffff (화) - 한글
      '병': '#ffffff', '정': '#ffffff', '사': '#ffffff', '오': '#ffffff',
      // 병정사오 = ffffff (화) - 한자
      '丙': '#ffffff', '丁': '#ffffff', '巳': '#ffffff', '午': '#ffffff',
      // 무기진미술축 = 000000 (토) - 한글
      '무': '#000000', '기': '#000000', '진': '#000000', '미': '#000000', '술': '#000000', '축': '#000000',
      // 무기진미술축 = 000000 (토) - 한자
      '戊': '#000000', '己': '#000000', '辰': '#000000', '未': '#000000', '戌': '#000000', '丑': '#000000',
      // 경신신유 = 000000 (금) - 한글
      '경': '#000000', '신': '#000000', '유': '#000000',
      // 경신신유 = 000000 (금) - 한자
      '庚': '#000000', '辛': '#000000', '申': '#000000', '酉': '#000000',
      // 임계해자 = ffffff (수) - 한글
      '임': '#ffffff', '계': '#ffffff', '해': '#ffffff', '자': '#ffffff',
      // 임계해자 = ffffff (수) - 한자
      '壬': '#ffffff', '癸': '#ffffff', '亥': '#ffffff', '子': '#ffffff'
    };
    
    return ganjiTextColorMap[character] || '#000000';
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
              className="text-center font-bold border-r border-border last:border-r-0 flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(col.sky),
                backgroundColor: getGanjiBackgroundColor(col.sky),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '40px'
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
              className="text-center font-bold border-r border-border last:border-r-0 flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(col.earth),
                backgroundColor: getGanjiBackgroundColor(col.earth),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '40px'
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
                color: '#131313'
              }}
              data-testid={`text-jijanggan-${index}`}
            >
              {stems}
            </div>
          ))}
        </div>

        {/* 6행: 대운수 (우측에서 좌측으로) */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunAges.map((age, colIndex) => {
            const isCurrentDaeun = currentAge && age <= currentAge && currentAge < age + 10;
            const isFocusedDaeun = focusedDaeun && focusedDaeun.startAge === age;
            // 포커스된 대운이 있으면 우선, 없으면 현재 나이 대운 하이라이트
            const isHighlighted = isFocusedDaeun || (isCurrentDaeun && !focusedDaeun);
            
            return (
              <div 
                key={`daeun-age-${colIndex}`}
                className={`py-1 text-center text-sm font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 ${
                  isHighlighted 
                    ? 'bg-yellow-200 dark:bg-yellow-800/50 font-bold border-2 border-yellow-600' 
                    : 'bg-blue-50 dark:bg-blue-950/30'
                }`}
                onClick={() => {
                  const targetDaeun = daeunPeriods.find(p => p.startAge === age);
                  if (targetDaeun && onDaeunClick) {
                    onDaeunClick(targetDaeun);
                  }
                }}
                data-testid={`text-daeun-age-${colIndex}`}
              >
                {age}
              </div>
            );
          })}
        </div>

        {/* 7행: 대운 천간 */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunGanji.skies.map((sky, colIndex) => (
            <div 
              key={`daeun-sky-${colIndex}`}
              className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(sky),
                backgroundColor: getGanjiBackgroundColor(sky),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '22px'
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
              className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(earth),
                backgroundColor: getGanjiBackgroundColor(earth),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '22px'
              }}
              data-testid={`text-daeun-earth-${colIndex}`}
            >
              {earth}
            </div>
          ))}
        </div>

        {/* 9행: 세운 년도 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunYears.map((year, colIndex) => {
            const correspondingAge = saeunAges[colIndex];
            const isSelectedAge = selectedSaeunAge === correspondingAge;
            
            return (
              <div 
                key={`saeun-year-${colIndex}`}
                className={`py-1 text-center text-xs font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 ${
                  isSelectedAge 
                    ? 'bg-red-200 dark:bg-red-800/50 font-bold border-2 border-red-600' 
                    : 'bg-white dark:bg-gray-800'
                }`}
                style={{ backgroundColor: isSelectedAge ? undefined : '#fde8fa' }}
                onClick={() => {
                  handleSaeunAgeClick(correspondingAge);
                }}
                data-testid={`text-saeun-year-${colIndex}`}
              >
                {year}
              </div>
            );
          })}
        </div>

        {/* 10행: 세운 천간 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunGanji.skies.map((sky, colIndex) => (
            <div 
              key={`saeun-sky-${colIndex}`}
              className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(sky),
                backgroundColor: getGanjiBackgroundColor(sky),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '19px'
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
              className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(earth),
                backgroundColor: getGanjiBackgroundColor(earth),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '19px'
              }}
              data-testid={`text-saeun-earth-${colIndex}`}
            >
              {earth}
            </div>
          ))}
        </div>

        {/* 12행: 세운 나이 (우측에서 좌측) */}
        <div 
          className="grid grid-cols-12 border-b border-border"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {saeunAges.map((age, colIndex) => {
            const isSelectedAge = selectedSaeunAge === age;
            
            return (
              <div 
                key={`saeun-age-${colIndex}`}
                className={`py-1 text-center text-xs font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 ${
                  isSelectedAge 
                    ? 'bg-red-200 dark:bg-red-800/50 font-bold border-2 border-red-600' 
                    : 'bg-white dark:bg-gray-800'
                }`}
                onClick={() => {
                  if (!isDragging.current) {
                    handleSaeunAgeClick(age);
                  }
                }}
                data-testid={`text-saeun-age-${colIndex}`}
              >
                {age}
              </div>
            );
          })}
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
              className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(sky),
                backgroundColor: getGanjiBackgroundColor(sky),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '19px'
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
              className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
              style={{ 
                color: getGanjiTextColor(earth),
                backgroundColor: getGanjiBackgroundColor(earth),
                fontFamily: "'ChosunCentennial', sans-serif",
                fontSize: '19px'
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