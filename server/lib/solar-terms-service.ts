import { getLunarCalInfo } from './data-gov-kr-service';

/**
 * 24절기 및 대운수 계산을 위한 절기 서비스
 */

// 24절기 목록 (순서대로)
export const TWENTY_FOUR_SOLAR_TERMS = [
  "입춘", "우수", "경칩", "춘분", "청명", "곡우",      // 봄
  "입하", "소만", "망종", "하지", "소서", "대서",      // 여름  
  "입추", "처서", "백로", "추분", "한로", "상강",      // 가을
  "입동", "소설", "대설", "동지", "소한", "대한"       // 겨울
] as const;

// 대운수 계산에 사용되는 12절기 (홀수 번째 절기들)
export const TWELVE_MAJOR_SOLAR_TERMS = [
  "입춘", "경칩", "청명", "입하", "망종", "소서", 
  "입추", "백로", "한로", "입동", "대설", "소한"
] as const;

// 각 절기가 몇 번째 월에 해당하는지 매핑 (사주 월 기준)
const SOLAR_TERM_TO_SAJU_MONTH: Record<string, number> = {
  "입춘": 0,  // 인월
  "경칩": 1,  // 묘월
  "청명": 2,  // 진월
  "입하": 3,  // 사월
  "망종": 4,  // 오월
  "소서": 5,  // 미월
  "입추": 6,  // 신월
  "백로": 7,  // 유월
  "한로": 8,  // 술월
  "입동": 9,  // 해월
  "대설": 10, // 자월
  "소한": 11  // 축월
};

/**
 * 절기 정보 타입
 */
export interface SolarTermInfo {
  name: string;        // 절기명
  date: Date;          // 절입 날짜/시각
  sajuMonth: number;   // 사주 월 (0-11)
}

/**
 * 대운수 계산 결과 타입
 */
export interface DaeunNumberResult {
  daeunNumber: number;     // 대운수 (1-10)
  direction: "순행" | "역행"; // 계산 방향
  daysFromTerm: number;    // 절기로부터의 일수
  usedTerm: SolarTermInfo; // 사용된 절기
  calculationMethod: "미래절" | "과거절"; // 계산 방법
}

/**
 * 특정 년도의 24절기 날짜들을 근사치로 계산
 * @param year 년도
 * @returns 24절기 정보 배열
 */
export async function getSolarTermsForYear(year: number): Promise<SolarTermInfo[]> {
  const terms: SolarTermInfo[] = [];
  
  // 24절기 모두를 근사치로 계산
  const all24Terms = getAll24SolarTermsForYear(year);
  
  for (const termInfo of all24Terms) {
    terms.push(termInfo);
  }
  
  return terms.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * 특정 년도의 24절기 모두 계산
 * @param year 년도
 * @returns 24절기 정보 배열
 */
function getAll24SolarTermsForYear(year: number): SolarTermInfo[] {
  // 정확한 만세력 데이터 (주요 연도)
  const exactYearData: Record<number, Array<{name: string, month: number, day: number, hour?: number, minute?: number}>> = {
    1958: [
      { name: "소한", month: 1, day: 6, hour: 12, minute: 0 },
      { name: "대한", month: 1, day: 20, hour: 18, minute: 0 },
      { name: "입춘", month: 2, day: 4, hour: 18, minute: 0 },
      { name: "우수", month: 2, day: 19, hour: 12, minute: 0 },
      { name: "경칩", month: 3, day: 6, hour: 12, minute: 0 },
      { name: "춘분", month: 3, day: 21, hour: 12, minute: 0 },
      { name: "청명", month: 4, day: 5, hour: 17, minute: 0 },
      { name: "곡우", month: 4, day: 20, hour: 6, minute: 0 },
      { name: "입하", month: 5, day: 5, hour: 6, minute: 0 },
      { name: "소만", month: 5, day: 20, hour: 0, minute: 0 },
      { name: "망종", month: 6, day: 5, hour: 12, minute: 0 },
      { name: "하지", month: 6, day: 21, hour: 6, minute: 0 },
      { name: "소서", month: 7, day: 7, hour: 6, minute: 0 },
      { name: "대서", month: 7, day: 23, hour: 12, minute: 0 },
      { name: "입추", month: 8, day: 8, hour: 6, minute: 0 },
      { name: "처서", month: 8, day: 23, hour: 0, minute: 0 },
      { name: "백로", month: 9, day: 8, hour: 12, minute: 0 },
      { name: "추분", month: 9, day: 23, hour: 18, minute: 0 },
      { name: "한로", month: 10, day: 9, hour: 0, minute: 0 },
      { name: "상강", month: 10, day: 24, hour: 12, minute: 0 },
      { name: "입동", month: 11, day: 8, hour: 6, minute: 0 },
      { name: "소설", month: 11, day: 22, hour: 6, minute: 0 },
      { name: "대설", month: 12, day: 7, hour: 18, minute: 0 },
      { name: "동지", month: 12, day: 22, hour: 12, minute: 0 }
    ],
    1957: [
      { name: "소한", month: 1, day: 6, hour: 5, minute: 0 },
      { name: "대한", month: 1, day: 21, hour: 0, minute: 0 },
      { name: "입춘", month: 2, day: 5, hour: 0, minute: 0 },
      { name: "우수", month: 2, day: 19, hour: 18, minute: 0 },
      { name: "경칩", month: 3, day: 6, hour: 18, minute: 0 },
      { name: "춘분", month: 3, day: 21, hour: 18, minute: 0 },
      { name: "청명", month: 4, day: 5, hour: 23, minute: 0 },
      { name: "곡우", month: 4, day: 21, hour: 0, minute: 0 },
      { name: "입하", month: 5, day: 6, hour: 12, minute: 0 },
      { name: "소만", month: 5, day: 22, hour: 6, minute: 0 },
      { name: "망종", month: 6, day: 6, hour: 18, minute: 0 },
      { name: "하지", month: 6, day: 22, hour: 12, minute: 0 },
      { name: "소서", month: 7, day: 8, hour: 0, minute: 0 },
      { name: "대서", month: 7, day: 23, hour: 18, minute: 0 },
      { name: "입추", month: 8, day: 8, hour: 12, minute: 0 },
      { name: "처서", month: 8, day: 24, hour: 6, minute: 0 },
      { name: "백로", month: 9, day: 8, hour: 18, minute: 0 },
      { name: "추분", month: 9, day: 24, hour: 0, minute: 0 },
      { name: "한로", month: 10, day: 9, hour: 6, minute: 0 },
      { name: "상강", month: 10, day: 24, hour: 18, minute: 0 },
      { name: "입동", month: 11, day: 8, hour: 18, minute: 0 },
      { name: "소설", month: 11, day: 23, hour: 12, minute: 0 },
      { name: "대설", month: 12, day: 8, hour: 0, minute: 0 },
      { name: "동지", month: 12, day: 22, hour: 18, minute: 0 }
    ],
    1944: [
      { name: "소한", month: 1, day: 6, hour: 12, minute: 0 },
      { name: "대한", month: 1, day: 21, hour: 6, minute: 0 },
      { name: "입춘", month: 2, day: 5, hour: 6, minute: 0 },
      { name: "우수", month: 2, day: 20, hour: 0, minute: 0 },
      { name: "경칩", month: 3, day: 6, hour: 0, minute: 0 },
      { name: "춘분", month: 3, day: 21, hour: 0, minute: 0 },
      { name: "청명", month: 4, day: 5, hour: 6, minute: 0 },
      { name: "곡우", month: 4, day: 20, hour: 6, minute: 0 },
      { name: "입하", month: 5, day: 5, hour: 18, minute: 0 },
      { name: "소만", month: 5, day: 21, hour: 12, minute: 0 },
      { name: "망종", month: 6, day: 6, hour: 0, minute: 0 },
      { name: "하지", month: 6, day: 21, hour: 18, minute: 0 },
      { name: "소서", month: 7, day: 7, hour: 6, minute: 0 },
      { name: "대서", month: 7, day: 23, hour: 0, minute: 0 },
      { name: "입추", month: 8, day: 7, hour: 18, minute: 0 },
      { name: "처서", month: 8, day: 23, hour: 12, minute: 0 },
      { name: "백로", month: 9, day: 8, hour: 0, minute: 0 },
      { name: "추분", month: 9, day: 23, hour: 6, minute: 0 },
      { name: "한로", month: 10, day: 8, hour: 12, minute: 0 },
      { name: "상강", month: 10, day: 24, hour: 0, minute: 0 },
      { name: "입동", month: 11, day: 8, hour: 0, minute: 0 },
      { name: "소설", month: 11, day: 22, hour: 18, minute: 0 },
      { name: "대설", month: 12, day: 7, hour: 6, minute: 0 },
      { name: "동지", month: 12, day: 22, hour: 0, minute: 0 }
    ]
  };

  // 정확한 데이터가 있으면 사용
  if (exactYearData[year]) {
    const terms: SolarTermInfo[] = [];
    for (const termData of exactYearData[year]) {
      terms.push({
        name: termData.name,
        date: new Date(year, termData.month - 1, termData.day, termData.hour || 12, termData.minute || 0),
        sajuMonth: SOLAR_TERM_TO_SAJU_MONTH[termData.name] || 0
      });
    }
    return terms;
  }

  // 2024년 기준 24절기 날짜 (시각 포함)
  const baseSolarTerms2024 = [
    // 1월
    { name: "소한", month: 1, day: 5, hour: 23, minute: 49 },
    { name: "대한", month: 1, day: 20, hour: 10, minute: 7 },
    // 2월  
    { name: "입춘", month: 2, day: 4, hour: 16, minute: 27 },
    { name: "우수", month: 2, day: 19, hour: 6, minute: 13 },
    // 3월
    { name: "경칩", month: 3, day: 5, hour: 10, minute: 23 },
    { name: "춘분", month: 3, day: 20, hour: 9, minute: 6 },
    // 4월
    { name: "청명", month: 4, day: 4, hour: 15, minute: 2 },
    { name: "곡우", month: 4, day: 20, hour: 4, minute: 27 },
    // 5월
    { name: "입하", month: 5, day: 5, hour: 8, minute: 10 },
    { name: "소만", month: 5, day: 20, hour: 20, minute: 59 },
    // 6월
    { name: "망종", month: 6, day: 5, hour: 12, minute: 10 },
    { name: "하지", month: 6, day: 21, hour: 4, minute: 51 },
    // 7월
    { name: "소서", month: 7, day: 6, hour: 22, minute: 20 },
    { name: "대서", month: 7, day: 22, hour: 15, minute: 44 },
    // 8월
    { name: "입추", month: 8, day: 7, hour: 9, minute: 11 },
    { name: "처서", month: 8, day: 23, hour: 2, minute: 55 },
    // 9월
    { name: "백로", month: 9, day: 7, hour: 11, minute: 11 },
    { name: "추분", month: 9, day: 22, hour: 20, minute: 44 },
    // 10월
    { name: "한로", month: 10, day: 8, hour: 3, minute: 56 },
    { name: "상강", month: 10, day: 23, hour: 14, minute: 15 },
    // 11월
    { name: "입동", month: 11, day: 7, hour: 12, minute: 20 },
    { name: "소설", month: 11, day: 22, hour: 9, minute: 56 },
    // 12월
    { name: "대설", month: 12, day: 7, hour: 0, minute: 17 },
    { name: "동지", month: 12, day: 21, hour: 15, minute: 21 }
  ];
  
  const terms: SolarTermInfo[] = [];
  
  // 년도별 변동 계산 (4년마다 약 1일 변동) - 근사치
  const yearDiff = year - 2024;
  const dayOffset = Math.round(yearDiff / 4);
  
  for (const baseTerm of baseSolarTerms2024) {
    const termDate = new Date(
      year, 
      baseTerm.month - 1, 
      baseTerm.day + dayOffset, 
      baseTerm.hour, 
      baseTerm.minute
    );
    
    terms.push({
      name: baseTerm.name,
      date: termDate,
      sajuMonth: SOLAR_TERM_TO_SAJU_MONTH[baseTerm.name] || 0
    });
  }
  
  return terms;
}

/**
 * 특정 월의 절기 근사치 계산
 * @param year 년도
 * @param month 월 (1-12)
 * @returns 절기 정보
 */
function getApproximateSolarTermForMonth(year: number, month: number): SolarTermInfo | null {
  // 2024년 기준 12절기 날짜 (시각 포함) - 완전한 12개월 매핑
  const baseSolarTerms2024 = [
    { name: "소한", month: 1, day: 5, hour: 23, minute: 49 },      // 1월 (작년 12월 절기가 1월까지)
    { name: "입춘", month: 2, day: 4, hour: 16, minute: 27 },      // 2월 - 인월 시작
    { name: "경칩", month: 3, day: 5, hour: 10, minute: 23 },      // 3월 - 묘월 시작
    { name: "청명", month: 4, day: 4, hour: 15, minute: 2 },       // 4월 - 진월 시작
    { name: "입하", month: 5, day: 5, hour: 8, minute: 10 },       // 5월 - 사월 시작
    { name: "망종", month: 6, day: 5, hour: 12, minute: 10 },      // 6월 - 오월 시작
    { name: "소서", month: 7, day: 6, hour: 22, minute: 20 },      // 7월 - 미월 시작
    { name: "입추", month: 8, day: 7, hour: 9, minute: 11 },       // 8월 - 신월 시작
    { name: "백로", month: 9, day: 7, hour: 11, minute: 11 },      // 9월 - 유월 시작
    { name: "한로", month: 10, day: 8, hour: 3, minute: 56 },      // 10월 - 술월 시작
    { name: "입동", month: 11, day: 7, hour: 12, minute: 20 },     // 11월 - 해월 시작
    { name: "대설", month: 12, day: 7, hour: 0, minute: 17 }       // 12월 - 자월 시작
  ];
  
  const baseTerm = baseSolarTerms2024.find(term => term.month === month);
  
  if (!baseTerm) return null;
  
  // 년도별 변동 계산 (4년마다 약 1일 변동)
  const yearDiff = year - 2024;
  const dayOffset = Math.round(yearDiff / 4);
  
  let targetYear = year;
  let targetMonth = baseTerm.month;
  
  // 특별한 경우 처리 없음 - 모든 절기가 해당 년도 내에 존재
  
  const termDate = new Date(
    targetYear, 
    targetMonth - 1, 
    baseTerm.day + dayOffset, 
    baseTerm.hour, 
    baseTerm.minute
  );
  
  return {
    name: baseTerm.name,
    date: termDate,
    sajuMonth: SOLAR_TERM_TO_SAJU_MONTH[baseTerm.name] || 0
  };
}

/**
 * 특정 날짜 기준으로 대운수 계산
 * @param birthDate 생년월일
 * @param gender 성별 ("남자" | "여자")
 * @param yearSky 태어난 년의 천간
 * @returns 대운수 계산 결과
 */
export async function calculatePreciseDaeunNumber(
  birthDate: Date,
  gender: string,
  yearSky: string
): Promise<DaeunNumberResult> {
  const year = birthDate.getFullYear();
  const solarTerms = await getSolarTermsForYear(year);
  
  // 양년/음년 판정
  const yangCheongan = ["甲", "丙", "戊", "庚", "壬"];
  const isYangYear = yangCheongan.includes(yearSky);
  
  // 대운 방향 결정
  let direction: "순행" | "역행";
  let calculationMethod: "미래절" | "과거절";
  
  if (gender === "남자") {
    if (isYangYear) {
      direction = "순행";
      calculationMethod = "미래절";
    } else {
      direction = "역행"; 
      calculationMethod = "과거절";
    }
  } else { // 여자
    if (isYangYear) {
      direction = "역행";
      calculationMethod = "과거절";
    } else {
      direction = "순행";
      calculationMethod = "미래절";
    }
  }
  
  let targetTerm: SolarTermInfo;
  let daysFromTerm: number;
  
  if (calculationMethod === "미래절") {
    // 미래절: 태어난 날부터 다음 절입일까지의 날수
    targetTerm = findNextSolarTerm(birthDate, solarTerms);
    daysFromTerm = Math.ceil((targetTerm.date.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // 과거절: 태어난 날부터 이전 절입일까지의 날수  
    targetTerm = findPreviousSolarTerm(birthDate, solarTerms);
    daysFromTerm = Math.ceil((birthDate.getTime() - targetTerm.date.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // 3일 = 1년 공식 적용
  const quotient = Math.floor(daysFromTerm / 3);
  const remainder = daysFromTerm % 3;
  
  // 나머지가 2 이상이면 반올림
  const daeunNumber = remainder >= 2 ? quotient + 1 : quotient;
  
  // 1-10 범위 제한
  const finalDaeunNumber = Math.max(1, Math.min(10, daeunNumber));
  
  return {
    daeunNumber: finalDaeunNumber,
    direction,
    daysFromTerm,
    usedTerm: targetTerm,
    calculationMethod
  };
}

/**
 * 다음 절기 찾기
 */
function findNextSolarTerm(date: Date, solarTerms: SolarTermInfo[]): SolarTermInfo {
  const nextTerm = solarTerms.find(term => term.date > date);
  
  if (nextTerm) {
    return nextTerm;
  }
  
  // 올해 절기가 없으면 다음해 첫 절기 (입춘) 사용
  const nextYear = date.getFullYear() + 1;
  return {
    name: "입춘",
    date: new Date(nextYear, 1, 4, 16, 0), // 근사치
    sajuMonth: 0
  };
}

/**
 * 이전 절기 찾기
 */
function findPreviousSolarTerm(date: Date, solarTerms: SolarTermInfo[]): SolarTermInfo {
  // 역순으로 찾기
  for (let i = solarTerms.length - 1; i >= 0; i--) {
    if (solarTerms[i].date <= date) {
      return solarTerms[i];
    }
  }
  
  // 올해 절기가 없으면 작년 마지막 절기 (대한) 사용
  const prevYear = date.getFullYear() - 1;
  return {
    name: "대한",
    date: new Date(prevYear, 0, 20, 12, 0), // 근사치
    sajuMonth: 11
  };
}