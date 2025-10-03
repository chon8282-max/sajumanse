import { Card } from "@/components/ui/card";
import { type SajuInfo, CHEONGAN, JIJI, CHINESE_TO_KOREAN_MAP, KOREAN_TO_CHINESE_MAP } from "@shared/schema";
import { calculateCompleteYukjin, calculateYukjin, calculateEarthlyBranchYukjin } from "@/lib/yukjin-calculator";
import { calculateMonthGanji } from "@/lib/calendar-calculator";
import { calculateDaeunNumber, calculateCurrentAge, type DaeunPeriod } from "@/lib/daeun-calculator";
import { User, UserCheck } from "lucide-react";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import type { TouchEvent } from "react";
import { getCheonganImage, getJijiImage, isCheongan, isJiji } from "@/lib/cheongan-images";
import { calculateAllShinSal, calculateFirstRowShinSal, formatShinSal } from "@/lib/shinsal-calculator";
import BirthTimeSelector from "@/components/BirthTimeSelector";
import BirthDateSelector from "@/components/BirthDateSelector";
import { Button } from "@/components/ui/button";
import { reverseCalculateSolarDate } from "@/lib/reverse-ganji-calculator";
import { getWuxingColor, getWuxingTextColor } from "@/lib/wuxing-colors";

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
  // 간지 정보 (역산용)
  yearSky?: string;
  yearEarth?: string;
  monthSky?: string;
  monthEarth?: string;
  hourSky?: string;
  hourEarth?: string;
  calendarType?: string;
  // 대운/歲運 상호작용 props
  currentAge?: number | null;
  focusedDaeun?: DaeunPeriod | null;
  daeunPeriods?: DaeunPeriod[];
  saeunOffset?: number;
  saeunData?: any;
  onDaeunClick?: (period: DaeunPeriod) => void;
  onSaeunClick?: (age: number) => void;
  onSaeunScroll?: (direction: 'left' | 'right') => void;
  onBirthTimeChange?: (timeCode: string) => void;
  onBirthDateChange?: (year: number, month: number, day: number) => void;
  onNameClick?: () => void;
  onMemoChange?: (memo: string) => void;
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

// 오행 매핑 함수
function getWuxingElement(character: string): string {
  const wuxingMap: Record<string, string> = {
    // 갑을인묘 = 木 (목)
    '갑': '木', '을': '木', '인': '木', '묘': '木',
    '甲': '木', '乙': '木', '寅': '木', '卯': '木',
    // 병정사오 = 火 (화)
    '병': '火', '정': '火', '사': '火', '오': '火',
    '丙': '火', '丁': '火', '巳': '火', '午': '火',
    // 무기진미술축 = 土 (토)
    '무': '土', '기': '土', '진': '土', '미': '土', '술': '土', '축': '土',
    '戊': '土', '己': '土', '辰': '土', '未': '土', '戌': '土', '丑': '土',
    // 경신신유 = 金 (금)
    '경': '金', '신': '金', '유': '金',
    '庚': '金', '辛': '金', '申': '金', '酉': '金',
    // 임계해자 = 水 (수)
    '임': '水', '계': '水', '해': '水', '자': '水',
    '壬': '水', '癸': '水', '亥': '水', '子': '水'
  };
  
  return wuxingMap[character] || character;
}

// 공망 계산 함수 (일주 기준)
function calculateGongmang(daySky: string, dayEarth: string): string[] {
  // 60갑자와 공망 매핑표 (사용자 제공 정확한 로직)
  const gongmangMap: Record<string, string[]> = {
    // 자축 공망 (子丑 空亡) - 첫 번째 그룹: 갑자,을축 병인 정묘 무진 기사 경오 신미 임신 계유
    '甲子': ['子', '丑'], '乙丑': ['子', '丑'],
    '丙寅': ['子', '丑'], '丁卯': ['子', '丑'],
    '戊辰': ['子', '丑'], '己巳': ['子', '丑'],
    '庚午': ['子', '丑'], '辛未': ['子', '丑'],
    '壬申': ['子', '丑'], '癸酉': ['子', '丑'],
    
    // 신유 공망 (申酉 空亡): 갑술 을해 병자 정축 무인 기묘 경진 신사 임오 계미
    '甲戌': ['申', '酉'], '乙亥': ['申', '酉'],
    '丙子': ['申', '酉'], '丁丑': ['申', '酉'],
    '戊寅': ['申', '酉'], '己卯': ['申', '酉'],
    '庚辰': ['申', '酉'], '辛巳': ['申', '酉'],
    '壬午': ['申', '酉'], '癸未': ['申', '酉'],
    
    // 오미 공망 (午未 空亡): 갑신 을유 병술 정해 무자 기축 경인 신묘 임진 계사
    '甲申': ['午', '未'], '乙酉': ['午', '未'],
    '丙戌': ['午', '未'], '丁亥': ['午', '未'],
    '戊子': ['午', '未'], '己丑': ['午', '未'],
    '庚寅': ['午', '未'], '辛卯': ['午', '未'],
    '壬辰': ['午', '未'], '癸巳': ['午', '未'],
    
    // 진사 공망 (辰巳 空亡): 갑오 을미 병신 정유 무술 기해 경자 신축 임인 계묘
    '甲午': ['辰', '巳'], '乙未': ['辰', '巳'],
    '丙申': ['辰', '巳'], '丁酉': ['辰', '巳'],
    '戊戌': ['辰', '巳'], '己亥': ['辰', '巳'],
    '庚子': ['辰', '巳'], '辛丑': ['辰', '巳'],
    '壬寅': ['辰', '巳'], '癸卯': ['辰', '巳'],
    
    // 인묘 공망 (寅卯 空亡): 갑진 을사 병오 정미 무신 기유 경술 신해 임자 계축
    '甲辰': ['寅', '卯'], '乙巳': ['寅', '卯'],
    '丙午': ['寅', '卯'], '丁未': ['寅', '卯'],
    '戊申': ['寅', '卯'], '己酉': ['寅', '卯'],
    '庚戌': ['寅', '卯'], '辛亥': ['寅', '卯'],
    '壬子': ['寅', '卯'], '癸丑': ['寅', '卯'],
    
    // 자축 공망 (子丑 空亡) - 두 번째 그룹: 갑인 을묘 병진 정사 무오 기미 경신 신유 임술 계해
    '甲寅': ['子', '丑'], '乙卯': ['子', '丑'],
    '丙辰': ['子', '丑'], '丁巳': ['子', '丑'],
    '戊午': ['子', '丑'], '己未': ['子', '丑'],
    '庚申': ['子', '丑'], '辛酉': ['子', '丑'],
    '壬戌': ['子', '丑'], '癸亥': ['子', '丑']
  };
  
  const dayPillar = daySky + dayEarth;
  return gongmangMap[dayPillar] || [];
}

// 12신살 한자-한글 변환 매핑
const SINSAL_KOREAN_MAP: Record<string, string> = {
  '劫殺': '겁살', '災殺': '재살', '天殺': '천살', '地殺': '지살',
  '年殺': '연살', '月殺': '월살', '亡身殺': '망신살', '將星殺': '장성살',
  '攀鞍殺': '반안살', '驛馬殺': '역마살', '六害殺': '육해살', '華蓋殺': '화개살'
};

// 12신살 계산 함수
function calculateSibiSinsal(yearEarth: string, sajuColumns: Array<{sky: string, earth: string}>): string[] {
  // 12신살 순서
  const sinsalNames = ['劫殺', '災殺', '天殺', '地殺', '年殺', '月殺', '亡身殺', '將星殺', '攀鞍殺', '驛馬殺', '六害殺', '華蓋殺'];
  
  // 12지지 순서
  const jiji = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  // 삼합과 시작 지지 매핑
  const samhapStartMap: Record<string, string> = {
    // 申子辰 (수국) - 辰 다음인 巳부터
    '申': '巳', '子': '巳', '辰': '巳',
    // 亥卯未 (목국) - 未 다음인 申부터  
    '亥': '申', '卯': '申', '未': '申',
    // 寅午戌 (화국) - 戌 다음인 亥부터
    '寅': '亥', '午': '亥', '戌': '亥',
    // 巳酉丑 (금국) - 丑 다음인 寅부터
    '巳': '寅', '酉': '寅', '丑': '寅'
  };
  
  // 년지 기준 시작 지지 찾기
  const startJiji = samhapStartMap[yearEarth];
  if (!startJiji) {
    return ['', '', '', '']; // 계산 불가시 빈 배열
  }
  
  // 시작 지지의 인덱스 찾기
  const startIndex = jiji.indexOf(startJiji);
  if (startIndex === -1) {
    return ['', '', '', ''];
  }
  
  // 각 사주 기둥(시일월년)에 해당하는 12신살 계산
  const result: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    const currentEarth = sajuColumns[i].earth;
    const currentIndex = jiji.indexOf(currentEarth);
    
    if (currentIndex === -1) {
      result.push('');
      continue;
    }
    
    // 시작 지지부터의 거리 계산 (12로 나눈 나머지)
    let distance = (currentIndex - startIndex + 12) % 12;
    
    // 12신살 이름 할당
    if (distance < sinsalNames.length) {
      result.push(sinsalNames[distance]);
    } else {
      result.push('');
    }
  }
  
  return result;
}

export default function SajuTable({ 
  saju, 
  title = "四柱命式", 
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
  // 간지 정보
  yearSky,
  yearEarth,
  monthSky,
  monthEarth,
  hourSky,
  hourEarth,
  calendarType,
  // 대운/歲運 상호작용 props
  currentAge,
  focusedDaeun,
  daeunPeriods = [],
  saeunOffset = 0,
  saeunData,
  onDaeunClick,
  onSaeunClick,
  onSaeunScroll,
  onBirthTimeChange,
  onBirthDateChange,
  onNameClick,
  onMemoChange
}: SajuTableProps) {

  // 나이 계산 (간지년 기준)
  const age = useMemo(() => {
    if (!birthYear) return 0;
    
    // saju 데이터에서 년간/년지 정보 가져오기
    const yearSky = saju?.year?.sky;
    const yearEarth = saju?.year?.earth;
    
    // calculateCurrentAge 함수 사용하여 정확한 간지년 기준 나이 계산
    return calculateCurrentAge(birthYear, birthMonth || 1, birthDay || 1, yearSky, yearEarth);
  }, [birthYear, birthMonth, birthDay, saju?.year?.sky, saju?.year?.earth]);

  // 간지 레코드인 경우 역산된 생년월일 계산
  const reversedDate = useMemo(() => {
    // 간지 입력으로 저장된 레코드이고 월/일이 없는 경우에만 역산
    if (calendarType === 'ganji' && (!birthMonth || !birthDay) && birthYear && yearSky && yearEarth && monthSky && monthEarth && daySky && dayEarth) {
      return reverseCalculateSolarDate({
        yearSky,
        yearEarth,
        monthSky,
        monthEarth,
        daySky,
        dayEarth,
        hourSky: hourSky || '',
        hourEarth: hourEarth || ''
      }, birthYear);
    }
    return null;
  }, [calendarType, birthYear, birthMonth, birthDay, yearSky, yearEarth, monthSky, monthEarth, daySky, dayEarth, hourSky, hourEarth]);

  // 역산된 양력 날짜를 음력으로 변환
  const [reversedLunarDate, setReversedLunarDate] = useState<{ year: number; month: number; day: number } | null>(null);
  
  useEffect(() => {
    if (reversedDate) {
      // 양력을 음력으로 변환하는 API 호출
      const convertToLunar = async () => {
        try {
          const response = await fetch('/api/lunar-solar/convert/lunar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              solYear: reversedDate.year,
              solMonth: reversedDate.month,
              solDay: reversedDate.day
            })
          });
          const data = await response.json();
          
          if (data.success && data.data) {
            setReversedLunarDate({
              year: data.data.lunYear,
              month: data.data.lunMonth,
              day: data.data.lunDay
            });
          }
        } catch (error) {
          console.error('음력 변환 오류:', error);
        }
      };
      convertToLunar();
    } else {
      setReversedLunarDate(null);
    }
  }, [reversedDate]);

  // 메모 상태 관리
  const [memoText, setMemoText] = useState(memo || '');
  
  // 메모가 변경될 때 부모 컴포넌트에 전달
  useEffect(() => {
    if (onMemoChange && memoText !== memo) {
      onMemoChange(memoText);
    }
  }, [memoText, onMemoChange, memo]);
  
  // 선택된 歲運 나이 상태 (초기값: 현재 나이)
  const [selectedSaeunAge, setSelectedSaeunAge] = useState<number | null>(currentAge || null);
  
  // 월운 활성화 상태
  const [isWolunActive, setIsWolunActive] = useState<boolean>(false);
  
  // 오행 표시 상태 관리
  const [showWuxing, setShowWuxing] = useState(false);
  
  // 12신살 표시 상태 관리
  const [showSibiSinsal, setShowSibiSinsal] = useState(false);
  
  // 신살 표시 상태 관리 (기본값: false, 지장간 표시)
  const [showShinsal, setShowShinsal] = useState(false);
  
  // 생시 선택 모달 상태 관리
  const [isBirthTimeSelectorOpen, setIsBirthTimeSelectorOpen] = useState(false);
  const [isBirthDateSelectorOpen, setIsBirthDateSelectorOpen] = useState(false);
  
  // 한글/한자 토글 상태 관리 (기본값: false = 한자 표시)
  const [showKorean, setShowKorean] = useState(false);
  
  // 한글/한자 변환 헬퍼 함수
  const convertText = (text: string): string => {
    if (showKorean) {
      // 한글 모드: 한자 → 한글 변환
      return CHINESE_TO_KOREAN_MAP[text] || text;
    } else {
      // 한자 모드: 한글 → 한자 변환
      return KOREAN_TO_CHINESE_MAP[text] || text;
    }
  };
  
  // 특정 행에서만 한글 변환을 적용하는 헬퍼 함수 (1행, 4행, 5행, 6행만)
  const convertTextForSpecificRows = (text: string): string => {
    // 먼저 전체 문자열로 변환 시도 (육친 등 2글자 단어)
    const converted = convertText(text);
    if (converted !== text) {
      return converted;
    }
    
    // 변환되지 않았다면 문자열의 각 문자를 개별적으로 변환 (지장간 등 복합 문자열 처리)
    return text.split('').map(char => convertText(char)).join('');
  };
  
  
  // currentAge가 변경되면 selectedSaeunAge를 항상 업데이트 (자동 선택)
  useEffect(() => {
    if (currentAge) {
      setSelectedSaeunAge(currentAge);
    }
  }, [currentAge]); // selectedSaeunAge 의존성 제거하여 항상 업데이트되도록
  
  // 歲運 클릭 핸들러 (내부용)
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

  // 생시 선택 관련 핸들러
  const handleHourEarthClick = useCallback(() => {
    setIsBirthTimeSelectorOpen(true);
  }, []);

  const handleBirthTimeSelect = useCallback((timeCode: string) => {
    console.log('SajuTable - handleBirthTimeSelect 호출됨:', timeCode);
    console.log('SajuTable - onBirthTimeChange 함수 존재:', !!onBirthTimeChange);
    if (onBirthTimeChange) {
      console.log('SajuTable - onBirthTimeChange 실행');
      onBirthTimeChange(timeCode);
    } else {
      console.warn('SajuTable - onBirthTimeChange가 없습니다!');
    }
    setIsBirthTimeSelectorOpen(false);
  }, [onBirthTimeChange]);

  const handleDayEarthClick = useCallback(() => {
    setIsBirthDateSelectorOpen(true);
  }, []);

  const handleBirthDateSelect = useCallback((year: number, month: number, day: number) => {
    console.log('SajuTable - handleBirthDateSelect 호출됨:', year, month, day);
    if (onBirthDateChange) {
      console.log('SajuTable - onBirthDateChange 실행');
      onBirthDateChange(year, month, day);
    } else {
      console.warn('SajuTable - onBirthDateChange가 없습니다!');
    }
    setIsBirthDateSelectorOpen(false);
  }, [onBirthDateChange]);

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

  // 12신살 계산 (년지 기준)
  const sibiSinsal = useMemo(() => {
    if (!saju?.year?.earth) return ['', '', '', ''];
    return calculateSibiSinsal(saju.year.earth, sajuColumns);
  }, [saju?.year?.earth, sajuColumns]);

  // 공망 계산 (일주 기준)
  const gongmang = useMemo(() => {
    if (!saju?.day?.sky || !saju?.day?.earth) return [];
    return calculateGongmang(saju.day.sky, saju.day.earth);
  }, [saju?.day?.sky, saju?.day?.earth]);

  // 공망 확인 함수 (텍스트 정보용으로만 사용)
  const isGongmang = useCallback((earth: string) => {
    return gongmang.includes(earth);
  }, [gongmang]);

  // 육친 계산 (메모이제이션)
  const { heavenlyYukjin, earthlyYukjin } = useMemo(() => {
    const dayStem = saju.day.sky;
    return {
      heavenlyYukjin: sajuColumns.map(col => {
        // 모든 천간을 동일한 방식으로 계산 (일간은 比肩으로 계산됨)
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

  // 신살 계산 (메모이제이션)
  const shinsal = useMemo(() => {
    if (!saju?.day?.sky) return ['', '', '', ''];
    
    // 각 주(년월일시)의 지지에서 신살 계산
    const daySky = saju.day.sky;
    const yearEarth = saju.year.earth;
    const monthEarth = saju.month.earth;
    const dayEarth = saju.day.earth;
    const hourEarth = saju.hour.earth;
    
    const shinsalResult = calculateAllShinSal(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
    
    // sajuColumns 순서(시주→일주→월주→년주)에 맞춰 신살 배열 재배열
    return [
      formatShinSal(shinsalResult.hourPillar, showKorean),  // 시주 (첫 번째 컬럼)
      formatShinSal(shinsalResult.dayPillar, showKorean),   // 일주 (두 번째 컬럼)
      formatShinSal(shinsalResult.monthPillar, showKorean), // 월주 (세 번째 컬럼)
      formatShinSal(shinsalResult.yearPillar, showKorean)   // 년주 (네 번째 컬럼)
    ];
  }, [saju?.day?.sky, saju?.year?.earth, saju?.month?.earth, saju?.day?.earth, saju?.hour?.earth, showKorean]);

  // 1행 신살 계산 (천덕귀인, 월덕귀인 - 메모이제이션)
  const firstRowShinsal = useMemo(() => {
    if (!saju?.day?.sky) return ['', '', '', ''];
    
    // 모든 천간과 지지 정보 수집
    const yearSky = saju.year.sky;
    const monthSky = saju.month.sky;
    const daySky = saju.day.sky;
    const hourSky = saju.hour.sky;
    const yearEarth = saju.year.earth;
    const monthEarth = saju.month.earth;
    const dayEarth = saju.day.earth;
    const hourEarth = saju.hour.earth;
    
    const firstRowResult = calculateFirstRowShinSal(
      yearSky, monthSky, daySky, hourSky,
      yearEarth, monthEarth, dayEarth, hourEarth
    );
    
    // sajuColumns 순서(시주→일주→월주→년주)에 맞춰 1행 신살 배열 재배열
    return [
      formatShinSal(firstRowResult.hourPillar, showKorean),  // 시주 (첫 번째 컬럼)
      formatShinSal(firstRowResult.dayPillar, showKorean),   // 일주 (두 번째 컬럼)
      formatShinSal(firstRowResult.monthPillar, showKorean), // 월주 (세 번째 컬럼)
      formatShinSal(firstRowResult.yearPillar, showKorean)   // 년주 (네 번째 컬럼)
    ];
  }, [saju?.year?.sky, saju?.month?.sky, saju?.day?.sky, saju?.hour?.sky,
      saju?.year?.earth, saju?.month?.earth, saju?.day?.earth, saju?.hour?.earth, showKorean]);

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

  // 정확한 간지년 계산 함수
  const calculateActualGanjiYear = useCallback((birthYear: number, yearSky: string, yearEarth: string): number => {
    const skyIndex = CHEONGAN.indexOf(yearSky as any);
    const earthIndex = JIJI.indexOf(yearEarth as any);
    
    if (skyIndex === -1 || earthIndex === -1) {
      return birthYear;
    }
    
    // 60갑자에서의 위치 계산
    let ganjiIndex = -1;
    for (let i = 0; i < 60; i++) {
      if (i % 10 === skyIndex && i % 12 === earthIndex) {
        ganjiIndex = i;
        break;
      }
    }
    
    if (ganjiIndex === -1) {
      return birthYear;
    }
    
    // 갑자년(1924년) 기준으로 정확한 간지년 계산
    // 입력된 생년 주변에서 해당 간지가 나오는 년도 찾기
    const baseYear = 1924;
    
    // 가장 가까운 해당 간지년 찾기
    for (let offset = -5; offset <= 5; offset++) {
      const testYear = birthYear + offset;
      const testYearDiff = testYear - baseYear;
      const testCyclePosition = ((testYearDiff % 60) + 60) % 60;
      
      if (testCyclePosition === ganjiIndex) {
        return testYear;
      }
    }
    
    return birthYear;
  }, []);

  // 정확한 간지년 계산
  const actualGanjiYear = useMemo(() => {
    if (!birthYear || !saju.year.sky || !saju.year.earth) {
      return birthYear || new Date().getFullYear();
    }
    return calculateActualGanjiYear(birthYear, saju.year.sky, saju.year.earth);
  }, [birthYear, saju.year.sky, saju.year.earth, calculateActualGanjiYear]);

  // 歲運 데이터 계산 (현재 나이 기준, 기존 규칙 복원)
  const saeunDisplayData = useMemo(() => {
    const currentYear = new Date().getFullYear(); // 현재 년도 사용
    
    if (!birthYear || !saju.year.sky || !saju.year.earth) {
      return {
        years: Array.from({ length: 12 }, (_, i) => currentYear - i),
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
    
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    
    // 태어난 해의 천간, 지지 인덱스 찾기
    const birthSkyIndex = heavenlyStems.indexOf(saju.year.sky);
    const birthEarthIndex = earthlyBranches.indexOf(saju.year.earth);
    
    const years: number[] = [];
    const ages: number[] = [];
    const skies: string[] = [];
    const earths: string[] = [];
    
    // 12칸 우측부터 좌측으로 배치
    for (let i = 0; i < 12; i++) {
      const currentAge = startAge + 11 - i;
      const currentYear = actualGanjiYear + (currentAge - 1); // 간지년 기준으로 계산
      
      years.push(currentYear);
      ages.push(currentAge);
      
      // 천간: 태어난 해 천간부터 순환
      const skyIndex = (birthSkyIndex + currentAge - 1) % 10;
      skies.push(heavenlyStems[skyIndex]);
      
      // 지지: 태어난 해 지지부터 순환
      const earthIndex = (birthEarthIndex + currentAge - 1) % 12;
      earths.push(earthlyBranches[earthIndex]);
    }
    
    return { years, ages, skies, earths };
  }, [birthYear, currentAge, age, focusedDaeun, saeunOffset, saju.year.sky, saju.year.earth]);

  // 개별 배열들 (기존 코드 호환성을 위해)
  const saeunYears = saeunDisplayData.years;
  const saeunAges = saeunDisplayData.ages;
  const saeunGanji = { skies: saeunDisplayData.skies, earths: saeunDisplayData.earths };

  // 월운 간지 계산 (14행, 15행용 - 13칸, 우측에서 좌측) - 선택된 歲運과 연동
  const wolunGanji = useMemo(() => {
    // 선택된 歲運 나이에 해당하는 연도 기준, 없으면 간지년 기준
    let targetYear = actualGanjiYear || new Date().getFullYear();
    
    if (selectedSaeunAge && actualGanjiYear) {
      // 선택된 歲運 나이에 해당하는 연도 계산 (간지년 기준)
      targetYear = actualGanjiYear + selectedSaeunAge - 1;
    } else if (focusedDaeun && saeunDisplayData.years.length > 0) {
      // fallback: 현재 표시된 歲運의 첫 번째 연도 사용
      targetYear = saeunDisplayData.years[0];
    }
    
    // 해당 연도의 천간 찾기
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    
    // 60갑자 정확한 순서로 해당 연도의 간지 찾기
    const gapja60 = [
      "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
      "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
      "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
      "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
      "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
      "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥"
    ];
    
    // 1975년 을묘(乙卯)를 기준으로 targetYear의 간지 계산
    if (!saju.year.sky || !saju.year.earth) {
      return { skies: Array(13).fill(''), earths: Array(13).fill('') };
    }
    
    const birthGanji = saju.year.sky + saju.year.earth;
    const birthGanjiIndex = gapja60.indexOf(birthGanji);
    const yearOffset = targetYear - actualGanjiYear; // 정확한 간지년 사용
    const targetGanjiIndex = (birthGanjiIndex + yearOffset) % 60;
    const targetGanji = gapja60[targetGanjiIndex];
    const targetYearSky = targetGanji[0];
    
    // 월운 천간 시작 규칙
    const wolunSkyStartTable: { [key: string]: string } = {
      "甲": "乙", // 갑기년=을축부터 (천간: 을부터)
      "乙": "丁", // 을경년=정축부터 (천간: 정부터)
      "丙": "己", // 병신년=기축부터 (천간: 기부터)
      "丁": "辛", // 정임년=신축부터 (천간: 신부터)
      "戊": "癸", // 무계년=계축부터 (천간: 계부터)
      "己": "乙", // 갑기년=을축부터 (천간: 을부터)
      "庚": "丁", // 을경년=정축부터 (천간: 정부터)
      "辛": "己", // 병신년=기축부터 (천간: 기부터)
      "壬": "辛", // 정임년=신축부터 (천간: 신부터)
      "癸": "癸"  // 무계년=계축부터 (천간: 계부터)
    };
    
    const startSky = wolunSkyStartTable[targetYearSky] || "乙";
    const startSkyIndex = heavenlyStems.indexOf(startSky);
    
    // 월운은 calculateMonthGanji 함수 사용하여 60갑자 순환 적용
    const skies: string[] = [];
    const earths: string[] = [];
    
    // 13개월에 대해 각각 60갑자 순환으로 월간지 계산 
    for (let i = 0; i < 13; i++) {
      const monthOffset = 13 - i; // 13월부터 1월까지 (우측에서 좌측)
      const currentMonth = monthOffset > 12 ? monthOffset - 12 : monthOffset;
      
      // 1월~8월인 경우 다음해로 계산 (월운은 연속된 13개월)
      const currentYear = currentMonth < 9 ? targetYear + 1 : targetYear;
      
      // 해당 연도/월의 정확한 월간지 계산
      const monthGanji = calculateMonthGanji(currentYear, currentMonth);
      skies.push(monthGanji.sky);
      earths.push(monthGanji.earth);
    }

    return { skies, earths };
  }, [actualGanjiYear, selectedSaeunAge, focusedDaeun, saeunDisplayData.years]);

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
      // 갑 = ffff00 (노란색), 을인묘 = 206000 (초록색) - 한글
      '갑': '#ffff00', '을': '#206000', '인': '#206000', '묘': '#206000',
      // 갑 = ffff00 (노란색), 을인묘 = 206000 (초록색) - 한자
      '甲': '#ffff00', '乙': '#206000', '寅': '#206000', '卯': '#206000',
      // 병정사오 = ff0000 (화) - 한글
      '병': '#ff0000', '정': '#ff0000', '사': '#ff0000', '오': '#ff0000',
      // 병정사오 = ff0000 (화) - 한자
      '丙': '#ff0000', '丁': '#ff0000', '巳': '#ff0000', '午': '#ff0000',
      // 무기진미술축 = ffff00 (토) - 한글
      '무': '#ffff00', '기': '#ffff00', '진': '#ffff00', '미': '#ffff00', '술': '#ffff00', '축': '#ffff00',
      // 무기진미술축 = ffff00 (토) - 한자
      '戊': '#ffff00', '己': '#ffff00', '辰': '#ffff00', '未': '#ffff00', '戌': '#ffff00', '丑': '#ffff00',
      // 경 = 000000 (검은색), 신신유 = ffffff (흰색) - 한글
      '경': '#000000', '신': '#ffffff', '유': '#ffffff',
      // 경 = 000000 (검은색), 신신유 = ffffff (흰색) - 한자
      '庚': '#000000', '辛': '#ffffff', '申': '#ffffff', '酉': '#ffffff',
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
      // 갑 = 000000 (노란색 배경), 을인묘 = ffffff (초록색 배경) - 한글
      '갑': '#000000', '을': '#ffffff', '인': '#ffffff', '묘': '#ffffff',
      // 갑 = 000000 (노란색 배경), 을인묘 = ffffff (초록색 배경) - 한자
      '甲': '#000000', '乙': '#ffffff', '寅': '#ffffff', '卯': '#ffffff',
      // 병정사오 = ffffff (빨간색 배경) - 한글
      '병': '#ffffff', '정': '#ffffff', '사': '#ffffff', '오': '#ffffff',
      // 병정사오 = ffffff (빨간색 배경) - 한자
      '丙': '#ffffff', '丁': '#ffffff', '巳': '#ffffff', '午': '#ffffff',
      // 무기진미술축 = 000000 (노란색 배경) - 한글
      '무': '#000000', '기': '#000000', '진': '#000000', '미': '#000000', '술': '#000000', '축': '#000000',
      // 무기진미술축 = 000000 (노란색 배경) - 한자
      '戊': '#000000', '己': '#000000', '辰': '#000000', '未': '#000000', '戌': '#000000', '丑': '#000000',
      // 경 = ffffff (검은색 배경), 신신유 = 000000 (흰색 배경) - 한글
      '경': '#ffffff', '신': '#000000', '유': '#000000',
      // 경 = ffffff (검은색 배경), 신신유 = 000000 (흰색 배경) - 한자
      '庚': '#ffffff', '辛': '#000000', '申': '#000000', '酉': '#000000',
      // 임계해자 = ffffff (검은색 배경) - 한글
      '임': '#ffffff', '계': '#ffffff', '해': '#ffffff', '자': '#ffffff',
      // 임계해자 = ffffff (검은색 배경) - 한자
      '壬': '#ffffff', '癸': '#ffffff', '亥': '#ffffff', '子': '#ffffff'
    };
    
    return ganjiTextColorMap[character] || '#000000';
  }


  return (
    <Card className="shadcn-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm p-4 pl-[0px] pr-[0px] pt-[1px] pb-[1px]" style={{ backgroundColor: 'hsl(var(--saju-header-bg))' }} data-testid="card-saju-table">
      {/* 개인정보 표시 */}
      {name && (
        <div className="p-3 border border-border rounded-md mt-[0px] mb-[0px] pt-[0px] pb-[0px]" style={{ backgroundColor: 'hsl(var(--name-card-bg))' }}>
          {/* 첫 번째 줄: 이름, 성별, 나이 */}
          <div className="flex items-center justify-center gap-2 mt-[0px] mb-[0px]">
            <button 
              onClick={onNameClick}
              className="font-bold text-lg hover:text-primary transition-colors cursor-pointer"
              data-testid="text-name"
            >
              {name}
            </button>
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
          <div className="text-center text-xs text-muted-foreground mb-3">
            <span data-testid="text-birth-info">
              {reversedDate ? (
                // 간지 역산된 날짜 표시
                <>
                  양력 {reversedDate.year}.{reversedDate.month.toString().padStart(2, '0')}.{reversedDate.day.toString().padStart(2, '0')}
                  {reversedLunarDate && reversedLunarDate.year && reversedLunarDate.month && reversedLunarDate.day && (
                    <>, (음력){reversedLunarDate.year}.{reversedLunarDate.month.toString().padStart(2, '0')}.{reversedLunarDate.day.toString().padStart(2, '0')}</>
                  )}
                </>
              ) : calendarType === '음력' || calendarType === '윤달' ? (
                // 음력 입력인 경우: 음력 먼저, 양력 나중
                <>
                  {lunarYear && lunarMonth && lunarDay && (
                    <>음력: {lunarYear}.{lunarMonth.toString().padStart(2, '0')}.{lunarDay.toString().padStart(2, '0')}</>
                  )}
                  {birthYear && birthMonth && birthDay && (
                    <>  양력: {birthYear}.{birthMonth.toString().padStart(2, '0')}.{birthDay.toString().padStart(2, '0')}</>
                  )}
                </>
              ) : (
                // 양력 입력인 경우: 양력 먼저, 음력 나중
                <>
                  {birthYear && birthMonth && birthDay && (
                    <>양력: {birthYear}.{birthMonth.toString().padStart(2, '0')}.{birthDay.toString().padStart(2, '0')}</>
                  )}
                  {lunarYear && lunarMonth && lunarDay && (
                    <>  음력: {lunarYear}.{lunarMonth.toString().padStart(2, '0')}.{lunarDay.toString().padStart(2, '0')}</>
                  )}
                </>
              )}
              {birthHour && (
                <>  ({formatBirthHour(birthHour)})</>
              )}
            </span>
          </div>

          {/* 세 번째 줄: 5개 버튼 */}
          <div className="flex flex-wrap justify-center gap-2">
            <button 
              className={`px-3 py-1 text-xs ${
                showWuxing 
                  ? 'bg-orange-200 hover:bg-orange-300 dark:bg-orange-800 dark:hover:bg-orange-700' 
                  : 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800'
              } border border-orange-300 dark:border-orange-700 rounded-md transition-colors`}
              onClick={() => setShowWuxing(!showWuxing)}
              data-testid="button-wuxing"
            >
              오행
            </button>
            <button 
              className={`px-3 py-1 text-xs ${
                showShinsal 
                  ? 'bg-purple-200 hover:bg-purple-300 dark:bg-purple-800 dark:hover:bg-purple-700' 
                  : 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800'
              } border border-purple-300 dark:border-purple-700 rounded-md transition-colors`}
              onClick={() => setShowShinsal(!showShinsal)}
              data-testid="button-sinsal"
            >
              신살
            </button>
            <button 
              className={`px-3 py-1 text-xs ${
                showSibiSinsal 
                  ? 'bg-blue-200 hover:bg-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700' 
                  : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800'
              } border border-blue-300 dark:border-blue-700 rounded-md transition-colors`}
              onClick={() => setShowSibiSinsal(!showSibiSinsal)}
              data-testid="button-12sinsal"
            >
              12신살
            </button>
            <button 
              className={`px-3 py-1 text-xs ${
                showKorean 
                  ? 'bg-green-200 hover:bg-green-300 dark:bg-green-800 dark:hover:bg-green-700' 
                  : 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800'
              } border border-green-300 dark:border-green-700 rounded-md transition-colors`}
              onClick={() => setShowKorean(!showKorean)}
              data-testid="button-hangul"
            >
              {showKorean ? '한자' : '한글'}
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
        {/* 1행: 천간 육친 / 오행 / 1행 신살 */}
        <div className="grid grid-cols-6 border-b border-border">
          {/* 빈 칸 */}
          <div className="py-1 text-center text-sm font-medium border-r border-border min-h-[1.5rem] flex items-center justify-center bg-white dark:bg-gray-900"></div>
          {showShinsal ? (
            // 신살 모드일 때: 1행 신살 (천덕귀인, 월덕귀인) 표시
            firstRowShinsal.map((shinsal, index) => (
              <div 
                key={`firstrow-shinsal-${index}`} 
                className="py-1 text-center text-xs font-medium border-r border-border min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-white dark:bg-gray-900 pt-[0px] pb-[0px]"
                data-testid={`text-firstrow-shinsal-${index}`}
              >
                {convertTextForSpecificRows(shinsal)}
              </div>
            ))
          ) : (
            // 일반 모드일 때: 천간 육친/오행 표시
            heavenlyYukjin.map((yukjin, index) => {
              const skyCharacter = sajuColumns[index]?.sky;
              let displayText = showWuxing && skyCharacter ? getWuxingElement(skyCharacter) : yukjin;
              displayText = convertTextForSpecificRows(displayText);
              
              return (
                <div 
                  key={`yukjin-sky-${index}`} 
                  className="py-1 text-center text-sm font-medium border-r border-border min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-white dark:bg-gray-900 pt-[0px] pb-[0px]"
                  data-testid={`text-yukjin-sky-${index}`}
                >
                  {displayText}
                </div>
              );
            })
          )}
          {/* 빈 칸 */}
          <div className="py-1 text-center text-sm font-medium min-h-[1.5rem] flex items-center justify-center bg-white dark:bg-gray-900"></div>
        </div>

        {/* 2행: 천간 */}
        <div className="grid grid-cols-6">
          {/* 빈 칸 */}
          <div className="text-center font-bold border-r border-border flex items-center justify-center bg-white dark:bg-gray-900" style={{ minHeight: '2.5rem' }}></div>
          {sajuColumns.map((col, index) => {
            const cheonganImage = getCheonganImage(col.sky, showKorean);
            return (
              <div 
                key={`sky-${index}`} 
                className="text-center font-bold border-r border-border flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(col.sky),
                  fontFamily: "var(--ganji-font-family)",
                  minHeight: '2.5rem',
                  padding: '0',
                  margin: '0'
                }}
                data-testid={`text-sky-${index}`}
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
                    fontSize: '38px',
                    fontWeight: '900',
                    textShadow: '0 0 1px rgba(0,0,0,0.5)',
                    color: getWuxingTextColor(col.sky)
                  }}>{col.sky}</span>
                )}
              </div>
            );
          })}
          {/* 빈 칸 */}
          <div className="text-center font-bold flex items-center justify-center bg-white dark:bg-gray-900" style={{ minHeight: '2.5rem' }}></div>
        </div>

        {/* 3행: 지지 */}
        <div className="grid grid-cols-6 border-b border-border">
          {/* 빈 칸 */}
          <div className="text-center font-bold border-r border-border flex items-center justify-center bg-white dark:bg-gray-900" style={{ minHeight: '2.5rem' }}></div>
          {sajuColumns.map((col, index) => {
            const jijiImage = getJijiImage(col.earth, showKorean);
            const isGongmangPosition = isGongmang(col.earth);
            const isHourEarth = index === 0;
            const isDayEarth = index === 2;
            
            return (
              <div 
                key={`earth-${index}`} 
                className={`text-center font-bold border-r border-border flex items-center justify-center ${
                  isHourEarth || isDayEarth ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900' : ''
                }`}
                style={{ 
                  backgroundColor: isGongmangPosition ? '#9CA3AF' : getWuxingColor(col.earth),
                  fontFamily: "var(--ganji-font-family)",
                  minHeight: '2.5rem',
                  padding: '0',
                  margin: '0',
                  position: 'relative'
                }}
                data-testid={`text-earth-${index}`}
                onClick={isHourEarth ? handleHourEarthClick : isDayEarth ? handleDayEarthClick : undefined}
              >
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
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
                      fontSize: '38px',
                      fontWeight: '900',
                      textShadow: '0 0 1px rgba(0,0,0,0.5)',
                      color: getWuxingTextColor(col.earth)
                    }}>{col.earth}</span>
                  )}
                </div>
              </div>
            );
          })}
          {/* 빈 칸 */}
          <div className="text-center font-bold flex items-center justify-center bg-white dark:bg-gray-900" style={{ minHeight: '2.5rem' }}></div>
        </div>

        {/* 4행 & 5행: 지지 육친/오행과 지장간/신살 (6번째 열 병합) */}
        <div className="grid grid-cols-6" style={{ gridTemplateRows: 'auto auto' }}>
          {/* 4행: 지지 육친 / 오행 */}
          <div className="py-1 text-center text-sm font-medium border-r border-border border-b min-h-[1.5rem] flex items-center justify-center bg-white dark:bg-gray-900"></div>
          {earthlyYukjin.map((yukjin, index) => {
            const earthCharacter = sajuColumns[index]?.earth;
            let displayText = showWuxing && earthCharacter ? getWuxingElement(earthCharacter) : yukjin;
            displayText = convertTextForSpecificRows(displayText);
            
            return (
              <div 
                key={`yukjin-earth-${index}`} 
                className="py-1 text-center text-sm font-medium border-r border-border border-b min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-white dark:bg-gray-900"
                data-testid={`text-yukjin-earth-${index}`}
              >
                {displayText}
              </div>
            );
          })}
          {/* 4행 & 5행 병합된 공망 정보 */}
          <div 
            className="py-1 text-center text-sm flex items-center justify-center bg-white dark:bg-gray-900 border-b"
            style={{ gridRow: 'span 2', minHeight: '3rem' }}
            data-testid="text-gongmang-info"
          >
            {gongmang.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white font-medium">
                  {gongmang.join('')}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  空亡
                </span>
              </div>
            )}
          </div>

          {/* 5행: 지장간 / 신살 (토글) */}
          <div className="py-1 text-center text-sm border-r border-border border-b min-h-[1.5rem] flex items-center justify-center bg-white dark:bg-gray-900"></div>
          {showShinsal ? (
            // 신살 표시
            shinsal.map((shinsalText, index) => (
              <div 
                key={`shinsal-${index}`} 
                className="py-1 text-center text-sm border-r border-border border-b min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-white dark:bg-gray-900"
                data-testid={`text-shinsal-${index}`}
              >
                {convertTextForSpecificRows(shinsalText)}
              </div>
            ))
          ) : (
            // 지장간 표시 (기본값)
            jijanggan.map((stems, index) => (
              <div 
                key={`jijanggan-${index}`} 
                className="py-1 text-center text-sm border-r border-border border-b min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-white dark:bg-gray-900"
                data-testid={`text-jijanggan-${index}`}
              >
                {convertTextForSpecificRows(stems)}
              </div>
            ))
          )}
        </div>

        {/* 6행: 12신살 (조건부 표시, 6열로 구성) */}
        {showSibiSinsal && (
          <div className="grid grid-cols-6 border-b border-border">
            {/* 1열: 빈칸 */}
            <div className="py-1 border-r border-border min-h-[1.5rem] bg-white" data-testid="text-sibisinsal-empty-1" />
            
            {/* 2-5열: 12신살 4개 */}
            {sibiSinsal.map((sinsal, index) => {
              // 한자-한글 변환
              const displayText = showKorean && SINSAL_KOREAN_MAP[sinsal] 
                ? SINSAL_KOREAN_MAP[sinsal] 
                : sinsal;
              
              return (
                <div 
                  key={`sibisinsal-${index}`} 
                  className="py-1 text-center text-sm border-r border-border min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-yellow-50 dark:bg-yellow-900/20"
                  data-testid={`text-sibisinsal-${index}`}
                >
                  {displayText}
                </div>
              );
            })}
            
            {/* 6열: 빈칸 */}
            <div className="py-1 min-h-[1.5rem] bg-white" data-testid="text-sibisinsal-empty-6" />
          </div>
        )}

        {/* 7행: 대운수 (우측에서 좌측으로) */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunAges.map((age, colIndex) => {
            const isCurrentDaeun = currentAge && age <= currentAge && currentAge < age + 10;
            const isFocusedDaeun = focusedDaeun && focusedDaeun.startAge === age;
            // 포커스된 대운이 있으면 우선, 없으면 현재 나이 대운 하이라이트
            const isHighlighted = isFocusedDaeun || (isCurrentDaeun && !focusedDaeun);
            
            return (
              <div 
                key={`daeun-age-${colIndex}`}
                className={`py-1 text-center text-sm font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 text-black dark:text-white ${
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
        <div className="grid grid-cols-10">
          {daeunGanji.skies.map((sky, colIndex) => {
            const cheonganImage = getCheonganImage(sky, showKorean);
            return (
              <div 
                key={`daeun-sky-${colIndex}`}
                className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(sky),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0'
                }}
                data-testid={`text-daeun-sky-${colIndex}`}
              >
                {cheonganImage ? (
                  <img 
                    src={cheonganImage} 
                    alt={sky} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontSize: '22px',
                    color: getWuxingTextColor(sky)
                  }}>{sky}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 8행: 대운 지지 */}
        <div className="grid grid-cols-10 border-b border-border">
          {daeunGanji.earths.map((earth, colIndex) => {
            const jijiImage = getJijiImage(earth, showKorean);
            const isGongmangPosition = isGongmang(earth);
            
            return (
              <div 
                key={`daeun-earth-${colIndex}`}
                className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(earth),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0',
                  position: 'relative'
                }}
                data-testid={`text-daeun-earth-${colIndex}`}
              >
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {jijiImage ? (
                    <img 
                      src={jijiImage} 
                      alt={earth} 
                      className="w-full h-full object-cover"
                      style={{ margin: '0', padding: '0' }}
                    />
                  ) : (
                    <span style={{ 
                      fontSize: '22px',
                      color: getWuxingTextColor(earth)
                    }}>{earth}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 9행: 歲運 년도 (우측에서 좌측) */}
        <div 
          className="grid grid-cols-12 border-b border-border"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {saeunYears.map((year, colIndex) => {
            const correspondingAge = saeunAges[colIndex];
            const isSelectedAge = selectedSaeunAge === correspondingAge;
            
            return (
              <div 
                key={`saeun-year-${colIndex}`}
                className={`py-1 text-center font-medium border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center cursor-pointer hover-elevate active-elevate-2 text-black dark:text-white overflow-hidden whitespace-nowrap ${
                  isSelectedAge 
                    ? 'bg-red-200 dark:bg-red-800/50 font-bold border-2 border-red-600' 
                    : 'bg-pink-50 dark:bg-gray-900'
                }`}
                style={{ fontSize: '10px' }}
                onClick={() => {
                  if (!isDragging.current) {
                    // 1열과 2열(colIndex 0, 1)은 월운 활성화 동작
                    if (colIndex === 0 || colIndex === 1) {
                      // 월운 모드 토글
                      setIsWolunActive(!isWolunActive);
                      // 선택된 나이도 설정 (월운 계산용)
                      setSelectedSaeunAge(correspondingAge);
                      if (onSaeunClick) {
                        onSaeunClick(correspondingAge);
                      }
                    } else {
                      // 나머지 열은 세운 모드로 전환하고 기존 처리
                      setIsWolunActive(false);
                      handleSaeunAgeClick(correspondingAge);
                    }
                  }
                }}
                data-testid={`text-saeun-year-${colIndex}`}
              >
                {year}
              </div>
            );
          })}
        </div>

        {/* 10행: 歲運 천간 (우측에서 좌측) */}
        <div className="grid grid-cols-12">
          {saeunGanji.skies.map((sky, colIndex) => {
            const cheonganImage = getCheonganImage(sky, showKorean);
            return (
              <div 
                key={`saeun-sky-${colIndex}`}
                className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(sky),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0'
                }}
                data-testid={`text-saeun-sky-${colIndex}`}
              >
                {cheonganImage ? (
                  <img 
                    src={cheonganImage} 
                    alt={sky} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontSize: '19px',
                    color: getWuxingTextColor(sky)
                  }}>{sky}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 11행: 歲運 지지 (우측에서 좌측) */}
        <div className="grid grid-cols-12 border-b border-border">
          {saeunGanji.earths.map((earth, colIndex) => {
            // 한자로 확실히 변환
            let chineseChar = earth;
            if (isJiji(earth)) {
              chineseChar = earth; // 이미 한자
            } else {
              chineseChar = KOREAN_TO_CHINESE_MAP[earth] || KOREAN_TO_CHINESE_MAP[earth.replace('신', '신지')] || earth;
            }
            
            // 이미지 가져오기
            const jijiImg = getJijiImage(chineseChar, showKorean);
            
            return (
              <div 
                key={`saeun-earth-${colIndex}`}
                className="text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center"
                style={{ 
                  backgroundColor: getWuxingColor(chineseChar),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0'
                }}
                data-testid={`text-saeun-earth-${colIndex}`}
              >
                {jijiImg ? (
                  <img 
                    src={jijiImg} 
                    alt={chineseChar} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontSize: '19px',
                    color: getWuxingTextColor(chineseChar)
                  }}>{chineseChar}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 12행: 歲運 나이 (우측에서 좌측) */}
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
            className={`py-1 text-center text-xs font-bold min-h-[1.5rem] flex items-center justify-center ${
              isWolunActive 
                ? 'text-blue-800 dark:text-blue-300 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                : 'text-black dark:text-white bg-white dark:bg-gray-900'
            }`}
            style={{ 
              transition: 'all 0.3s ease'
            }}
            data-testid="text-wolun-title"
          >
            월운(月運) {isWolunActive && '✓ 활성화'}
          </div>
        </div>

        {/* 14행: 월운 천간 (우측에서 좌측) */}
        <div className={`grid grid-cols-13 ${
          isWolunActive ? 'ring-2 ring-blue-400 ring-inset' : ''
        }`}>
          {wolunGanji.skies.map((sky, colIndex) => {
            const cheonganImage = getCheonganImage(sky, showKorean);
            return (
              <div 
                key={`wolun-sky-${colIndex}`}
                className={`text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center ${
                  isWolunActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                style={{ 
                  backgroundColor: isWolunActive ? undefined : getWuxingColor(sky),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0',
                  transition: 'all 0.3s ease'
                }}
                data-testid={`text-wolun-sky-${colIndex}`}
              >
                {cheonganImage ? (
                  <img 
                    src={cheonganImage} 
                    alt={sky} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontSize: '19px',
                    color: isWolunActive ? undefined : getWuxingTextColor(sky)
                  }}>{sky}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 15행: 월운 지지 (우측에서 좌측) */}
        <div className={`grid grid-cols-13 border-b border-border ${
          isWolunActive ? 'ring-2 ring-blue-400 ring-inset' : ''
        }`}>
          {wolunGanji.earths.map((earth, colIndex) => {
            // 한자로 확실히 변환
            let chineseChar = earth;
            if (isJiji(earth)) {
              chineseChar = earth; // 이미 한자
            } else {
              chineseChar = KOREAN_TO_CHINESE_MAP[earth] || KOREAN_TO_CHINESE_MAP[earth.replace('신', '신지')] || earth;
            }
            
            // 이미지 가져오기
            const jijiImg = getJijiImage(chineseChar, showKorean);
            
            return (
              <div 
                key={`wolun-earth-${colIndex}`}
                className={`text-center font-bold border-r border-border last:border-r-0 min-h-[1.5rem] flex items-center justify-center ${
                  isWolunActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                style={{ 
                  backgroundColor: isWolunActive ? undefined : getWuxingColor(chineseChar),
                  fontFamily: "var(--ganji-font-family)",
                  padding: '0',
                  margin: '0'
                }}
                data-testid={`text-wolun-earth-${colIndex}`}
              >
                {jijiImg ? (
                  <img 
                    src={jijiImg} 
                    alt={chineseChar} 
                    className="w-full h-full object-cover"
                    style={{ margin: '0', padding: '0' }}
                  />
                ) : (
                  <span style={{ 
                    fontSize: '19px',
                    color: isWolunActive ? undefined : getWuxingTextColor(chineseChar)
                  }}>{chineseChar}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 16행: 월운 월 순서 (우측에서 좌측) */}
        <div className="grid grid-cols-13 border-b border-border">
          {wolunMonths.map((month, colIndex) => (
            <div 
              key={`wolun-month-${colIndex}`}
              className="py-1 text-center text-xs font-medium border-r border-border last:border-r-0 min-h-[1.5rem] bg-white dark:bg-gray-900 text-black dark:text-white flex items-center justify-center"
              data-testid={`text-wolun-month-${colIndex}`}
            >
              {colIndex === 0 ? 1 : month}
            </div>
          ))}
        </div>

        {/* 17행: 메모 + 오늘 날짜 */}
        <div className="flex border-b border-border">
          <div 
            className="flex-1 py-1 text-center text-xs font-bold min-h-[1.5rem] flex items-center justify-center text-black dark:text-white bg-amber-200 dark:bg-gray-900 border-r border-border"
            data-testid="text-memo-title"
          >
            메모
          </div>
          <button 
            className="px-3 py-1 text-xs bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-black dark:text-white border-l border-border cursor-pointer transition-colors"
            onClick={insertTodayDate}
            data-testid="button-today-date"
          >
            오늘날짜
          </button>
        </div>

        {/* 18행: 메모 입력 박스 */}
        <div className="border-b border-border">
          <div className="p-4 bg-white dark:bg-gray-900 flex justify-center">
            <textarea
              className="w-full max-w-2xl min-h-[10rem] text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 resize-vertical bg-white dark:bg-gray-800 text-black dark:text-white"
              placeholder="메모를 입력하세요..."
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              data-testid="textarea-memo"
            />
          </div>
        </div>

      </div>
      
      {/* 생시 선택 모달 */}
      <BirthTimeSelector
        isOpen={isBirthTimeSelectorOpen}
        onClose={() => setIsBirthTimeSelectorOpen(false)}
        onSelect={handleBirthTimeSelect}
        currentTime={birthHour}
      />
      
      {/* 생년월일 선택 모달 */}
      <BirthDateSelector
        isOpen={isBirthDateSelectorOpen}
        onClose={() => setIsBirthDateSelectorOpen(false)}
        onSelect={handleBirthDateSelect}
        currentYear={birthYear}
        currentMonth={birthMonth}
        currentDay={birthDay}
      />
    </Card>
  );
}