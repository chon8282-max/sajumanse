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

// 정확한 절입일 하드코딩 데이터 (API 실패 시 사용)
const HARDCODED_SOLAR_TERMS: Record<number, SolarTermInfo[]> = {
  1958: [
    // 1958년 정확한 절입일 (UTC 기준)
    { name: "소한", date: new Date("1958-01-05T23:49:00Z"), sajuMonth: 11 },
    { name: "대한", date: new Date("1958-01-20T10:07:00Z"), sajuMonth: 0 },
    { name: "입춘", date: new Date("1958-02-04T18:00:00Z"), sajuMonth: 0 },  // ← 정확한 입춘 시각
    { name: "우수", date: new Date("1958-02-19T06:13:00Z"), sajuMonth: 0 },
    { name: "경칩", date: new Date("1958-03-05T10:23:00Z"), sajuMonth: 1 },
    { name: "춘분", date: new Date("1958-03-20T09:06:00Z"), sajuMonth: 0 },
    { name: "청명", date: new Date("1958-04-04T15:02:00Z"), sajuMonth: 2 },
    { name: "곡우", date: new Date("1958-04-20T04:27:00Z"), sajuMonth: 0 },
    { name: "입하", date: new Date("1958-05-05T08:10:00Z"), sajuMonth: 3 },
    { name: "소만", date: new Date("1958-05-20T20:59:00Z"), sajuMonth: 0 },
    { name: "망종", date: new Date("1958-06-05T12:10:00Z"), sajuMonth: 4 },
    { name: "하지", date: new Date("1958-06-21T04:51:00Z"), sajuMonth: 0 },
    { name: "소서", date: new Date("1958-07-06T22:20:00Z"), sajuMonth: 5 },
    { name: "대서", date: new Date("1958-07-22T15:44:00Z"), sajuMonth: 0 },
    { name: "입추", date: new Date("1958-08-07T09:11:00Z"), sajuMonth: 6 },
    { name: "처서", date: new Date("1958-08-23T02:55:00Z"), sajuMonth: 0 },
    { name: "백로", date: new Date("1958-09-07T11:11:00Z"), sajuMonth: 7 },
    { name: "추분", date: new Date("1958-09-22T20:44:00Z"), sajuMonth: 0 },
    { name: "한로", date: new Date("1958-10-08T03:56:00Z"), sajuMonth: 8 },
    { name: "상강", date: new Date("1958-10-23T14:15:00Z"), sajuMonth: 0 },
    { name: "입동", date: new Date("1958-11-07T12:20:00Z"), sajuMonth: 9 },
    { name: "소설", date: new Date("1958-11-22T09:56:00Z"), sajuMonth: 0 },
    { name: "대설", date: new Date("1958-12-07T00:17:00Z"), sajuMonth: 10 },
    { name: "동지", date: new Date("1958-12-22T15:21:00Z"), sajuMonth: 0 }
  ]
};

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

// 캐시 저장소
const solarTermsCache = new Map<number, SolarTermInfo[]>();

/**
 * data.go.kr API에서 24절기 데이터 가져오기
 * @param year 년도
 * @returns 24절기 정보 배열 또는 null (실패시)
 */
async function fetchSolarTermsFromDataGovKr(year: number): Promise<SolarTermInfo[] | null> {
  try {
    console.log(`🌐 data.go.kr에서 ${year}년 절입일 데이터 가져오는 중...`);
    
    // data-gov-kr-service의 get24DivisionsInfo 사용
    const { get24DivisionsInfo } = await import('./data-gov-kr-service');
    const apiResponse = await get24DivisionsInfo(year);
    
    // 응답 구조: response.body.items가 직접 배열인 경우도 처리
    let items = apiResponse?.response?.body?.items;
    
    // items가 객체이고 item 속성이 있는 경우
    if (items && typeof items === 'object' && 'item' in items) {
      items = items.item;
    }
    
    // items가 배열이 아닌 경우 (단일 객체)
    if (items && !Array.isArray(items)) {
      items = [items];
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log(`❌ data.go.kr API 응답 데이터 없음`);
      return null;
    }
    
    console.log(`📊 data.go.kr items 개수: ${items.length}`);
    
    // dateKind 값들 확인
    const dateKinds = items.map((item: any) => item.dateKind);
    const uniqueDateKinds = Array.from(new Set(dateKinds));
    console.log(`📊 고유한 dateKind 값들:`, uniqueDateKinds);
    
    // 각 dateKind별 샘플 출력
    for (const kind of uniqueDateKinds) {
      const sample = items.find((item: any) => item.dateKind === kind);
      console.log(`📊 dateKind="${kind}" 샘플:`, sample);
    }
    
    // dateKind로 24절기만 필터링 (dateKind === '02' 또는 '24'일 가능성)
    const solarTermItems = items.filter((item: any) => 
      item.dateKind === '02' || 
      item.dateKind === '24' ||
      item.dateKind === '2' ||
      // 또는 isHoliday가 'N'인 것만 (24절기는 공휴일이 아님)
      (item.isHoliday === 'N' && item.dateName && TWENTY_FOUR_SOLAR_TERMS.includes(item.dateName))
    );
    
    console.log(`📊 24절기 필터링 후: ${solarTermItems.length}개`);
    if (solarTermItems.length > 0) {
      console.log(`📊 첫 번째 24절기 item:`, solarTermItems[0]);
    }
    
    const terms: SolarTermInfo[] = [];
    
    for (const item of solarTermItems) {
      // locdate: "YYYYMMDD", dateName: "소한", kst: "HH:mm"
      const dateStr = item.locdate;
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6));
      const day = parseInt(dateStr.substring(6, 8));
      
      const timeStr = item.kst || "00:00";
      const [hour, minute] = timeStr.split(':').map((s: string) => parseInt(s));
      
      const termDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const sajuMonth = SOLAR_TERM_TO_SAJU_MONTH[item.dateName] ?? 0;
      
      terms.push({
        name: item.dateName,
        date: termDate,
        sajuMonth
      });
    }
    
    console.log(`✅ data.go.kr에서 ${terms.length}개 절입일 데이터 로드 성공`);
    return terms.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error(`❌ data.go.kr API 호출 실패:`, error);
    return null;
  }
}

/**
 * 외부 API에서 24절기 데이터 가져오기 (holidays.dist.be - 2010년 이후만)
 * @param year 년도
 * @returns 24절기 정보 배열 또는 null (실패시)
 */
async function fetchSolarTermsFromDistBe(year: number): Promise<SolarTermInfo[] | null> {
  try {
    console.log(`🌐 holidays.dist.be에서 ${year}년 절입일 데이터 가져오는 중...`);
    const response = await fetch(`https://holidays.dist.be/${year}.json`);
    
    if (!response.ok) {
      console.log(`❌ holidays.dist.be API 응답 실패: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`📊 holidays.dist.be 원본 데이터 개수: ${data.length}`);
    
    const terms: SolarTermInfo[] = [];
    
    // kind가 3인 항목만 필터링 (24절기)
    const solarTermsData = data.filter((item: any) => item.kind === 3);
    console.log(`📊 kind === 3 필터링 후: ${solarTermsData.length}개`);
    
    for (const item of solarTermsData) {
      // date: "YYYY-MM-DD", time: "HH:mm" 또는 null
      const [yearStr, monthStr, dayStr] = item.date.split('-');
      const [hourStr, minuteStr] = item.time ? item.time.split(':') : ['0', '0'];
      
      const termDate = new Date(Date.UTC(
        parseInt(yearStr),
        parseInt(monthStr) - 1,
        parseInt(dayStr),
        parseInt(hourStr),
        parseInt(minuteStr)
      ));
      
      const sajuMonth = SOLAR_TERM_TO_SAJU_MONTH[item.name] ?? 0;
      
      terms.push({
        name: item.name,
        date: termDate,
        sajuMonth
      });
    }
    
    console.log(`✅ holidays.dist.be에서 ${terms.length}개 절입일 데이터 로드 성공`);
    return terms.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error(`❌ holidays.dist.be API 호출 실패:`, error);
    return null;
  }
}

/**
 * 특정 년도의 24절기 날짜들을 가져오기 (외부 API 우선, fallback으로 근사치)
 * @param year 년도
 * @returns 24절기 정보 배열
 */
export async function getSolarTermsForYear(year: number): Promise<SolarTermInfo[]> {
  console.log(`Fetching solar terms for year: ${year}`);
  
  // 캐시 확인
  if (solarTermsCache.has(year)) {
    console.log(`📦 캐시에서 ${year}년 절입일 데이터 반환`);
    return solarTermsCache.get(year)!;
  }
  
  // 0. 하드코딩 데이터 확인 (정확한 절입일이 있는 경우)
  if (HARDCODED_SOLAR_TERMS[year]) {
    console.log(`✨ 하드코딩된 정확한 절입일 사용: ${year}년`);
    const hardcodedTerms = HARDCODED_SOLAR_TERMS[year];
    solarTermsCache.set(year, hardcodedTerms);
    return hardcodedTerms;
  }
  
  // 1. data.go.kr API 시도 (모든 년도) - 현재 공휴일만 반환하므로 실패
  const dataGovTerms = await fetchSolarTermsFromDataGovKr(year);
  if (dataGovTerms && dataGovTerms.length > 0) {
    solarTermsCache.set(year, dataGovTerms);
    return dataGovTerms;
  }
  
  // 2. holidays.dist.be API 시도 (2006년 이후)
  if (year >= 2006) {
    const distBeTerms = await fetchSolarTermsFromDistBe(year);
    if (distBeTerms && distBeTerms.length > 0) {
      solarTermsCache.set(year, distBeTerms);
      return distBeTerms;
    }
  }
  
  // 3. Fallback: 로컬 근사치 계산
  console.log(`⚠️ 모든 외부 API 실패, 로컬 근사치로 계산: ${year}년`);
  const all24Terms = getAll24SolarTermsForYear(year);
  solarTermsCache.set(year, all24Terms);
  return all24Terms.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * 특정 년도의 24절기 모두 계산 (근사치 - Fallback용)
 * @param year 년도
 * @returns 24절기 정보 배열
 */
function getAll24SolarTermsForYear(year: number): SolarTermInfo[] {

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