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

/**
 * 월간지 계산 (월의 간지)
 * @param year 서기 연도
 * @param month 서기 월 (1-12)
 * @returns {sky: string, earth: string} 천간과 지지
 */
export function calculateMonthGanji(year: number, month: number): { sky: string; earth: string } {
  // 월지는 양력 기준으로 고정 매핑
  const earthIndex = (month - 1) % 12;
  const earth = MONTH_DIZHI[earthIndex];
  
  // 월천간은 년천간에 따라 달라짐 - 정확한 룩업 테이블 사용
  const yearGanji = calculateYearGanji(year);
  const yearSky = yearGanji.sky;
  
  // 년천간별 월천간 매핑 테이블에서 해당 월의 천간 조회
  const monthSkyArray = YEAR_MONTH_SKY_MAP[yearSky];
  if (!monthSkyArray) {
    console.warn(`Unknown year sky: ${yearSky}, falling back to default`);
    // 기본값으로 甲년 기준 사용
    return { sky: YEAR_MONTH_SKY_MAP['甲'][month - 1], earth };
  }
  
  const sky = monthSkyArray[month - 1];
  
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
  
  return {
    sky: CHEONGAN[skyIndex],
    earth: JIJI[earthIndex]
  };
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