import { 
  CHEONGAN, 
  JIJI, 
  YEAR_TIANGAN_BASE, 
  YEAR_DIZHI_BASE,
  MONTH_DIZHI,
  YEAR_MONTH_SKY_MAP,
  DAY_GANJI_BASE_DATE,
  DAY_GANJI_BASE_INDEX
} from "@shared/schema";

/**
 * 년간지 계산 (연도의 간지)
 * @param year 서기 연도
 * @returns {sky: string, earth: string} 천간과 지지
 */
export function calculateYearGanji(year: number): { sky: string; earth: string } {
  const skyIndex = year % 10;
  const earthIndex = year % 12;
  
  return {
    sky: YEAR_TIANGAN_BASE[skyIndex],
    earth: YEAR_DIZHI_BASE[earthIndex]
  };
}

// 60갑자 순환 배열 생성
function generate60Ganji(): string[] {
  const ganji60: string[] = [];
  for (let i = 0; i < 60; i++) {
    const sky = CHEONGAN[i % 10];
    const earth = JIJI[i % 12];
    ganji60.push(sky + earth);
  }
  return ganji60;
}

const GANJI_60 = generate60Ganji();

// 기준 월간지 (2000년 1월 = 정축월로 설정)
const BASE_YEAR = 2000;
const BASE_MONTH = 1;
const BASE_MONTH_GANJI_INDEX = 13; // 정축(丁丑) = 14번째 (0부터 시작이므로 13)

/**
 * 월간지 계산 (월의 간지) - 60갑자 순환 방식
 * @param year 서기 연도
 * @param month 서기 월 (1-12)
 * @returns {sky: string, earth: string} 천간과 지지
 */
export function calculateMonthGanji(year: number, month: number): { sky: string; earth: string } {
  // 기준년월로부터 총 개월수 차이 계산
  const totalMonths = (year - BASE_YEAR) * 12 + (month - BASE_MONTH);
  
  // 60갑자 순환에서 해당 월간지 인덱스 계산
  const ganjiIndex = (BASE_MONTH_GANJI_INDEX + totalMonths) % 60;
  
  // 음수 방지
  const adjustedIndex = ganjiIndex < 0 ? ganjiIndex + 60 : ganjiIndex;
  
  // 60갑자에서 해당 월간지 가져오기
  const monthGanji = GANJI_60[adjustedIndex];
  const sky = monthGanji[0]; // 첫 번째 글자는 천간
  const earth = monthGanji[1]; // 두 번째 글자는 지지
  
  return { sky, earth };
}

/**
 * 일간지 계산 (일의 간지)
 * @param date 날짜
 * @returns {sky: string, earth: string} 천간과 지지
 */
export function calculateDayGanji(date: Date): { sky: string; earth: string } {
  const timeDiff = date.getTime() - DAY_GANJI_BASE_DATE.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const ganjiIndex = (DAY_GANJI_BASE_INDEX + daysDiff) % 60;
  
  const skyIndex = ganjiIndex % 10;
  const earthIndex = ganjiIndex % 12;
  
  const result = {
    sky: CHEONGAN[skyIndex],
    earth: JIJI[earthIndex]
  };
  
  // 디버깅: 실제 값 확인
  if (date.getDate() === 1 || date.getDate() === 30) {
    console.log(`[${date.getDate()}일] 일간지:`, result.sky, result.earth, 
      `(charCodes: ${result.sky.charCodeAt(0)}, ${result.earth.charCodeAt(0)})`);
  }
  
  return result;
}

/**
 * 해당 월의 달력 데이터 생성
 * @param year 서기 연도
 * @param month 서기 월 (1-12)
 * @returns 달력 데이터
 */
export interface CalendarDayData {
  solarDate: Date;
  solarDay: number;
  lunarYear?: number;
  lunarMonth?: number;
  lunarDay?: number;
  lunarDayGanji?: { sky: string; earth: string };
  isLunarFirst?: boolean; // 음력 1일 여부
  isToday?: boolean;
  isCurrentMonth: boolean;
  solarTerm?: string; // 절기명
  dayOfWeek: number; // 0=일요일, 6=토요일
}

/**
 * 달력 월 데이터 생성 (7x6 그리드)
 */
export function generateCalendarMonth(year: number, month: number): CalendarDayData[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const firstDayOfWeek = firstDay.getDay(); // 0=일요일
  const daysInMonth = lastDay.getDate();
  
  const today = new Date();
  const calendar: CalendarDayData[][] = [];
  
  let currentWeek: CalendarDayData[] = [];
  let currentDate = 1;
  
  // 6주 생성
  for (let week = 0; week < 6; week++) {
    currentWeek = [];
    
    for (let day = 0; day < 7; day++) {
      let date: Date;
      let isCurrentMonth = true;
      let solarDay: number;
      
      if (week === 0 && day < firstDayOfWeek) {
        // 이전 달의 날짜들
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
        solarDay = prevMonthLastDay - (firstDayOfWeek - day - 1);
        date = new Date(prevYear, prevMonth - 1, solarDay);
        isCurrentMonth = false;
      } else if (currentDate > daysInMonth) {
        // 다음 달의 날짜들
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        solarDay = currentDate - daysInMonth;
        date = new Date(nextYear, nextMonth - 1, solarDay);
        isCurrentMonth = false;
        currentDate++;
      } else {
        // 현재 달의 날짜들
        solarDay = currentDate;
        date = new Date(year, month - 1, currentDate);
        currentDate++;
      }
      
      const dayData: CalendarDayData = {
        solarDate: date,
        solarDay,
        isCurrentMonth,
        isToday: date.toDateString() === today.toDateString(),
        dayOfWeek: day,
        lunarDayGanji: calculateDayGanji(date)
      };
      
      currentWeek.push(dayData);
    }
    
    calendar.push(currentWeek);
    
    // 현재 달 날짜가 모두 끝났고, 다음 주가 모두 다음 달이면 중단
    if (currentDate > daysInMonth && currentWeek.every(d => !d.isCurrentMonth)) {
      break;
    }
  }
  
  return calendar;
}

/**
 * 년/월의 간지 정보 가져오기
 */
export function getCalendarInfo(year: number, month: number) {
  const yearGanji = calculateYearGanji(year);
  const monthGanji = calculateMonthGanji(year, month);
  
  return {
    yearGanji: `${yearGanji.sky}${yearGanji.earth}`,
    monthGanji: `${monthGanji.sky}${monthGanji.earth}`,
    solarYear: year,
    solarMonth: month
  };
}