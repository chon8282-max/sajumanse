import { CHEONGAN, JIJI } from "@shared/schema";
import { getSolarTermsForCalculation } from "@/lib/solar-terms-data";

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
// month는 월주 지지 인덱스: 인=0, 묘=1, 진=2, 사=3, 오=4, 미=5, 신=6, 유=7, 술=8, 해=9, 자=10, 축=11
const TWELVE_SOLAR_TERMS_2024 = [
  { term: "입춘", month: 0, date: new Date(2024, 1, 4, 16, 27) },  // 인월 시작
  { term: "경칩", month: 1, date: new Date(2024, 2, 5, 10, 23) },  // 묘월 시작
  { term: "청명", month: 2, date: new Date(2024, 3, 4, 15, 2) },   // 진월 시작
  { term: "입하", month: 3, date: new Date(2024, 4, 5, 8, 10) },   // 사월 시작
  { term: "망종", month: 4, date: new Date(2024, 5, 5, 12, 10) },  // 오월 시작
  { term: "소서", month: 5, date: new Date(2024, 6, 6, 22, 20) },  // 미월 시작
  { term: "입추", month: 6, date: new Date(2024, 7, 7, 9, 11) },   // 신월 시작
  { term: "백로", month: 7, date: new Date(2024, 8, 7, 11, 11) },  // 유월 시작
  { term: "한로", month: 8, date: new Date(2024, 9, 8, 3, 56) },   // 술월 시작
  { term: "입동", month: 9, date: new Date(2024, 10, 7, 12, 20) }, // 해월 시작
  { term: "대설", month: 10, date: new Date(2024, 11, 7, 0, 17) }, // 자월 시작
  { term: "소한", month: 11, date: new Date(2025, 0, 5, 23, 49) }, // 축월 시작
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
  const currentYearTerms = generateSolarTermsForYear(year);
  const nextYearTerms = generateSolarTermsForYear(year + 1);
  
  // 해당 연도의 절기에서 시작 절기 찾기
  const termStart = currentYearTerms.find(t => t.month === monthIndex);
  
  if (!termStart) {
    // 기본값: 해당 월의 첫날과 마지막날
    const month = monthIndex + 1;
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0)
    };
  }
  
  // 종료 절기는 다음 월의 절기 (currentYear 또는 nextYear에서 찾기)
  const allTermsSorted = [...currentYearTerms, ...nextYearTerms].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );
  
  const startIndex = allTermsSorted.findIndex(t => t.date.getTime() === termStart.date.getTime());
  const termEnd = allTermsSorted[startIndex + 1];
  
  if (!termEnd) {
    // 기본값
    const month = monthIndex + 1;
    return {
      start: termStart.date,
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
  const baseDate = new Date(1900, 0, 1); // 1900년 1월 1일 = 갑술일
  const BASE_INDEX = 10; // 갑술(甲戌)의 60갑자 인덱스
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayIndex = ((BASE_INDEX + daysDiff) % 60 + 60) % 60;
  const daySkyIndex = dayIndex % 10;
  const dayEarthIndex = dayIndex % 12;
  
  return {
    sky: CHEONGAN[daySkyIndex],
    earth: JIJI[dayEarthIndex]
  };
}

// 간지 정보로부터 양력 날짜 역산 (KASI 정확 절기 데이터 사용, async)
export async function reverseCalculateSolarDate(ganji: GanjiInfo, birthYear: number): Promise<{ year: number; month: number; day: number } | null> {
  try {
    // 1. 월주의 지지로 절기 월 인덱스 찾기 (인월=0 ... 축월=11)
    const monthIndex = getMonthIndexFromEarth(ganji.monthEarth);
    if (monthIndex === -1) {
      console.error("Invalid month earth:", ganji.monthEarth);
      return null;
    }

    // 2. KASI 정확 절기 데이터로 해당 월(절기 구간) 범위 계산
    //    사주 연도 Y는 입춘(Y년) ~ 다음 입춘(Y+1년) 구간이다.
    //    따라서 인월~대설월은 양력 Y년, 축월(소한)은 양력 Y+1년 1월에 해당한다.
    const termsThisYear = await getSolarTermsForCalculation(birthYear);
    const termsNextYear = await getSolarTermsForCalculation(birthYear + 1);
    // 두 해 절기를 합쳐 날짜순 정렬 (중복 제거)
    const seen = new Set<number>();
    const terms = [...termsThisYear, ...termsNextYear]
      .filter(t => {
        const k = t.date.getTime();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // 이 사주 연도의 시작점 = birthYear년의 입춘
    const lichun = terms.find(t => t.month === 0 && t.date.getFullYear() === birthYear);
    if (!lichun) {
      console.error("입춘 데이터를 찾을 수 없음:", birthYear);
      return null;
    }
    // 사주 연도 구간: birthYear 입춘 ~ (birthYear+1) 입춘 직전
    const nextLichun = terms.find(t => t.month === 0 && t.date.getFullYear() === birthYear + 1);

    // 이 구간 안에 있는 해당 월(monthIndex)의 절기만 후보로
    const candidates = terms.filter(t =>
      t.month === monthIndex &&
      t.date.getTime() >= lichun.date.getTime() &&
      (!nextLichun || t.date.getTime() < nextLichun.date.getTime())
    );
    if (candidates.length === 0) {
      console.error("절기 데이터에서 해당 월을 찾을 수 없음:", ganji.monthEarth, birthYear);
      return null;
    }

    let foundDate: Date | null = null;

    for (const startTerm of candidates) {
      // 이 절기 다음 절기 = 구간의 끝
      const idx = terms.findIndex(t => t.date.getTime() === startTerm.date.getTime());
      const endTerm = terms[idx + 1];
      const rangeStart = new Date(startTerm.date);
      const rangeEnd = endTerm ? new Date(endTerm.date) : new Date(rangeStart.getTime() + 31 * 86400000);

      // 3. 이 절기 구간 안에서만 일주가 일치하는 날짜 찾기
      //    절기 시각은 KST 기준이다. 기기 타임존에 상관없이 항상 KST 날짜를 뽑아야
      //    PC/모바일에서 결과가 달라지지 않는다. (UTC+9로 강제 변환 후 UTC 게터 사용)
      const KST = 9 * 60 * 60 * 1000;
      const sK = new Date(rangeStart.getTime() + KST);
      const eK = new Date(rangeEnd.getTime() + KST);
      const cur = new Date(Date.UTC(sK.getUTCFullYear(), sK.getUTCMonth(), sK.getUTCDate()));
      const last = new Date(Date.UTC(eK.getUTCFullYear(), eK.getUTCMonth(), eK.getUTCDate()));
      while (cur <= last) {
        const dayGanji = calculateDayGanji(cur);
        if (dayGanji.sky === ganji.daySky && dayGanji.earth === ganji.dayEarth) {
          foundDate = new Date(cur);
          break;
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (foundDate) break;
    }

    if (!foundDate) {
      console.error("Could not find matching date for ganji:", ganji);
      return null;
    }
    
    // 양력 날짜 반환 (UTC 게터 사용 - 기기 타임존 무관)
    return {
      year: foundDate.getUTCFullYear(),
      month: foundDate.getUTCMonth() + 1,
      day: foundDate.getUTCDate()
    };
  } catch (error) {
    console.error("Error in reverseCalculateSolarDate:", error);
    return null;
  }
}
