import { 
  CHEONGAN, 
  JIJI, 
  type SajuInfo, 
  type DaeunSegment, 
  type FortuneCalculationResult 
} from "./schema";

/**
 * 운세 계산 핵심 함수들 (서버/클라이언트 공용)
 * 전통 사주학의 대운, 세운, 월운 계산 로직 구현
 */

// 양년(陽年) 천간 - 甲丙戊庚壬
const YANG_CHEONGAN = ["甲", "丙", "戊", "庚", "壬"];

// 음년(陰年) 천간 - 乙丁己辛癸  
const YIN_CHEONGAN = ["乙", "丁", "己", "辛", "癸"];

/**
 * 천간지지 다음/이전 간지 구하기
 * @param currentSky 현재 천간
 * @param currentEarth 현재 지지
 * @param isForward 순행 여부
 * @returns 다음/이전 간지
 */
function getNextGanji(currentSky: string, currentEarth: string, isForward: boolean): { sky: string; earth: string } {
  const skyIndex = CHEONGAN.indexOf(currentSky as typeof CHEONGAN[number]);
  const earthIndex = JIJI.indexOf(currentEarth as typeof JIJI[number]);
  
  if (skyIndex === -1 || earthIndex === -1) {
    throw new Error(`Invalid ganji: ${currentSky}${currentEarth}`);
  }
  
  let newSkyIndex: number;
  let newEarthIndex: number;
  
  if (isForward) {
    // 순행: 다음 간지
    newSkyIndex = (skyIndex + 1) % CHEONGAN.length;
    newEarthIndex = (earthIndex + 1) % JIJI.length;
  } else {
    // 역행: 이전 간지
    newSkyIndex = (skyIndex - 1 + CHEONGAN.length) % CHEONGAN.length;
    newEarthIndex = (earthIndex - 1 + JIJI.length) % JIJI.length;
  }
  
  return {
    sky: CHEONGAN[newSkyIndex],
    earth: JIJI[newEarthIndex]
  };
}

/**
 * 대운 방향 결정 (순행/역행)
 * @param gender 성별 ("남자" | "여자")
 * @param yearSky 태어난 년의 천간
 * @returns 대운 방향
 */
export function determineDaeunDirection(gender: string, yearSky: string): "순행" | "역행" {
  const isYangYear = YANG_CHEONGAN.includes(yearSky);
  
  if (gender === "남자") {
    // 남자: 양년에 태어나면 순행, 음년에 태어나면 역행
    return isYangYear ? "순행" : "역행";
  } else {
    // 여자: 양년에 태어나면 역행, 음년에 태어나면 순행
    return isYangYear ? "역행" : "순행";
  }
}

/**
 * 대운 간지 목록 계산
 * @param monthSky 월주 천간
 * @param monthEarth 월주 지지
 * @param direction 대운 방향
 * @param count 생성할 대운 개수 (기본 10개)
 * @returns 대운 간지 목록
 */
export function calculateDaeunGanji(
  monthSky: string, 
  monthEarth: string, 
  direction: "순행" | "역행",
  count: number = 10
): { sky: string; earth: string }[] {
  const daeunList: { sky: string; earth: string }[] = [];
  let currentSky = monthSky;
  let currentEarth = monthEarth;
  
  for (let i = 0; i < count; i++) {
    const nextGanji = getNextGanji(currentSky, currentEarth, direction === "순행");
    daeunList.push(nextGanji);
    currentSky = nextGanji.sky;
    currentEarth = nextGanji.earth;
  }
  
  return daeunList;
}

/**
 * 절기로부터 대략적인 일수 계산 (근사치)
 * @param month 월
 * @param day 일
 * @param direction 대운 방향 (선택사항)
 * @returns 절기로부터의 일수 (근사치)
 */
function calculateApproximateDaysFromSolarTerm(month: number, day: number, direction?: "순행" | "역행"): number {
  // 각 월의 대략적인 절기 시작일 (근사치) - 수정된 12개월 전체
  const solarTermDays = [5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7]; // 1월-12월 절기 시작일 근사치
  const termDay = solarTermDays[month - 1];
  
  let daysFromTerm: number;
  
  if (direction === "역행") {
    // 역행: 과거절 - 태어난 날부터 이전 절입일까지의 날수
    if (day >= termDay) {
      daysFromTerm = day - termDay;
    } else {
      // 이전 월의 절기로부터 계산
      const prevMonthIndex = month - 2 < 0 ? 11 : month - 2;
      const prevTermDay = solarTermDays[prevMonthIndex];
      const daysInPrevMonth = month === 1 ? 31 : 30; // 근사치
      daysFromTerm = (daysInPrevMonth - prevTermDay) + day;
    }
  } else {
    // 순행: 미래절 - 태어난 날부터 다음 절입일까지의 날수
    if (day <= termDay) {
      daysFromTerm = termDay - day;
    } else {
      // 다음 월의 절기로부터 계산
      const nextMonthIndex = (month % 12);
      const nextTermDay = solarTermDays[nextMonthIndex];
      const daysInCurrentMonth = month === 2 ? 28 : 30; // 근사치
      daysFromTerm = (daysInCurrentMonth - day) + nextTermDay;
    }
  }
  
  return Math.max(0, daysFromTerm);
}

/**
 * 대운수 계산 (근사치)
 * @param birthDate 생년월일
 * @param gender 성별
 * @param yearSky 태어난 년의 천간
 * @returns 대운수 (1-10)
 */
export function calculateDaeunNumber(
  birthDate: Date,
  gender: string,
  yearSky: string
): number {
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  
  // 대운 방향 결정
  const direction = determineDaeunDirection(gender, yearSky);
  
  // 간단한 근사치 계산 (정확한 계산은 서버 API 사용)
  const daysFromSolarTerm = calculateApproximateDaysFromSolarTerm(month, day, direction);
  
  // 3일 = 1년 공식 적용
  const quotient = Math.floor(daysFromSolarTerm / 3);
  const remainder = daysFromSolarTerm % 3;
  
  // 나머지가 2 이상이면 반올림
  const daeunNumber = remainder >= 2 ? quotient + 1 : quotient;
  
  // 1-10 범위로 제한
  return Math.max(1, Math.min(10, daeunNumber));
}

/**
 * 대운 세그먼트 목록 생성
 * @param daeunGanji 대운 간지 목록
 * @param daeunNumber 대운수
 * @returns 대운 세그먼트 목록
 */
export function createDaeunSegments(
  daeunGanji: { sky: string; earth: string }[],
  daeunNumber: number
): DaeunSegment[] {
  const segments: DaeunSegment[] = [];
  
  for (let i = 0; i < daeunGanji.length; i++) {
    const startAge = daeunNumber + (i * 10);
    const endAge = startAge + 9;
    
    segments.push({
      startAge,
      endAge,
      sky: daeunGanji[i].sky,
      earth: daeunGanji[i].earth,
      period: `${startAge}-${endAge}세`
    });
  }
  
  return segments;
}

/**
 * 전체 운세 계산 (서버/클라이언트 공용)
 * @param saju 사주 정보
 * @param birthDate 생년월일
 * @param gender 성별
 * @returns 운세 계산 결과
 */
export function calculateFullFortune(
  saju: SajuInfo,
  birthDate: Date,
  gender: string
): FortuneCalculationResult {
  // 대운 방향 결정
  const daeunDirection = determineDaeunDirection(gender, saju.year.sky);
  
  // 대운수 계산
  const daeunNumber = calculateDaeunNumber(birthDate, gender, saju.year.sky);
  
  // 대운 간지 계산
  const daeunGanji = calculateDaeunGanji(saju.month.sky, saju.month.earth, daeunDirection);
  
  // 대운 세그먼트 생성
  const daeunList = createDaeunSegments(daeunGanji, daeunNumber);
  
  return {
    daeunNumber,
    daeunDirection,
    daeunStartAge: daeunNumber,
    daeunList,
    saeunStartYear: birthDate.getFullYear(),
    calculationDate: new Date(),
    algorithmVersion: "1.0"
  };
}