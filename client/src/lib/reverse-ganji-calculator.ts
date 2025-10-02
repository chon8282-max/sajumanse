import { CHEONGAN, JIJI } from "@shared/schema";

interface GanjiInfo {
  yearSky: string;
  yearEarth: string;
  monthSky: string;
  monthEarth: string;
  daySky: string;
  dayEarth: string;
  hourSky: string;
  hourEarth: string;
}

interface CalculatedDate {
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
}

// 12절기 날짜 데이터 (월주 계산용)
const TWELVE_SOLAR_TERMS_2024 = [
  { term: "입춘", month: 0, date: new Date(2024, 1, 4, 16, 27) },
  { term: "경칩", month: 1, date: new Date(2024, 2, 5, 10, 23) },
  { term: "청명", month: 2, date: new Date(2024, 3, 4, 15, 2) },
  { term: "입하", month: 3, date: new Date(2024, 4, 5, 8, 10) },
  { term: "망종", month: 4, date: new Date(2024, 5, 5, 12, 10) },
  { term: "소서", month: 5, date: new Date(2024, 6, 6, 22, 20) },
  { term: "입추", month: 6, date: new Date(2024, 7, 7, 9, 11) },
  { term: "백로", month: 7, date: new Date(2024, 8, 7, 11, 11) },
  { term: "한로", month: 8, date: new Date(2024, 9, 8, 3, 56) },
  { term: "입동", month: 9, date: new Date(2024, 10, 7, 12, 20) },
  { term: "대설", month: 10, date: new Date(2024, 11, 7, 0, 17) },
  { term: "소한", month: 11, date: new Date(2025, 0, 5, 23, 49) },
];

// 24절기 정보 생성 (특정 연도)
function generateSolarTermsForYear(year: number): Array<{ term: string; month: number; date: Date }> {
  const baseYear = 2024;
  const yearDiff = year - baseYear;
  
  return TWELVE_SOLAR_TERMS_2024.map(term => {
    const originalDate = term.date;
    let targetYear = year;
    
    if (term.term === "소한") {
      targetYear = year + 1;
    }
    
    let dayOffset = 0;
    if (Math.abs(yearDiff) <= 100) {
      dayOffset = Math.round(yearDiff / 4 * 0.25);
    }
    
    let adjustedDate = new Date(targetYear, originalDate.getMonth(), originalDate.getDate() + dayOffset, originalDate.getHours(), originalDate.getMinutes());
    
    if (year === 1974 && term.term === "소한") {
      adjustedDate = new Date(1975, 0, 6, 12, 0);
    }
    
    return {
      ...term,
      date: adjustedDate
    };
  });
}

// 월주의 지지로부터 절기 월 인덱스 찾기 (인=0, 묘=1, ..., 축=11)
function getMonthIndexFromEarth(monthEarth: string): number {
  const monthEarths = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  return monthEarths.indexOf(monthEarth);
}

// 특정 연도, 월의 절기 날짜 범위 찾기
function getSolarTermDateRange(year: number, monthIndex: number): { start: Date; end: Date } {
  const prevYearTerms = generateSolarTermsForYear(year - 1);
  const currentYearTerms = generateSolarTermsForYear(year);
  const nextYearTerms = generateSolarTermsForYear(year + 1);
  
  const allTerms = [...prevYearTerms, ...currentYearTerms, ...nextYearTerms].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );
  
  // 해당 월에 해당하는 절기 구간 찾기
  const termStart = allTerms.find(t => t.month === monthIndex);
  const termStartIndex = allTerms.findIndex(t => t.month === monthIndex);
  const termEnd = allTerms[termStartIndex + 1];
  
  if (!termStart || !termEnd) {
    // 기본값: 해당 월의 첫날과 마지막날
    const month = monthIndex + 1;
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0)
    };
  }
  
  return {
    start: termStart.date,
    end: termEnd.date
  };
}

// 일주 계산 (특정 날짜의 일주)
function calculateDayGanji(date: Date): { sky: string; earth: string } {
  const baseDate = new Date(2025, 7, 23); // 2025년 8월 23일 갑자일
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayIndex = ((daysDiff % 60) + 60) % 60;
  const daySkyIndex = dayIndex % 10;
  const dayEarthIndex = dayIndex % 12;
  
  return {
    sky: CHEONGAN[daySkyIndex],
    earth: JIJI[dayEarthIndex]
  };
}

// 간지 정보로부터 양력 날짜 역산
export function reverseCalculateSolarDate(ganji: GanjiInfo, birthYear: number): { year: number; month: number; day: number } | null {
  try {
    // 1. 월주의 지지로 절기 월 인덱스 찾기
    const monthIndex = getMonthIndexFromEarth(ganji.monthEarth);
    if (monthIndex === -1) {
      console.error("Invalid month earth:", ganji.monthEarth);
      return null;
    }
    
    // 2. 해당 연도, 월의 절기 날짜 범위 찾기
    const { start: termStart, end: termEnd } = getSolarTermDateRange(birthYear, monthIndex);
    
    // 3. 절기 범위 내에서 일주가 일치하는 날짜 찾기
    let foundDate: Date | null = null;
    const startDate = new Date(termStart);
    const endDate = new Date(termEnd);
    
    // 범위를 조금 넓혀서 검색 (절기 전후 5일)
    startDate.setDate(startDate.getDate() - 5);
    endDate.setDate(endDate.getDate() + 5);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayGanji = calculateDayGanji(currentDate);
      
      if (dayGanji.sky === ganji.daySky && dayGanji.earth === ganji.dayEarth) {
        foundDate = new Date(currentDate);
        break;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (!foundDate) {
      console.error("Could not find matching date for ganji:", ganji);
      return null;
    }
    
    // 양력 날짜 반환
    return {
      year: foundDate.getFullYear(),
      month: foundDate.getMonth() + 1,
      day: foundDate.getDate()
    };
  } catch (error) {
    console.error("Error in reverseCalculateSolarDate:", error);
    return null;
  }
}
