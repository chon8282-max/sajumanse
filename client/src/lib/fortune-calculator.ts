import { 
  CHEONGAN, 
  JIJI, 
  type SajuInfo, 
  type DaeunSegment, 
  type SaeunInfo, 
  type WolunInfo, 
  type FortuneCalculationResult 
} from "@shared/schema";

/**
 * 운세 계산 핵심 함수들
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
 * 대운수 계산 (절기 기반)
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
  // 이 함수는 절기 계산이 필요하므로 서버 API를 통해 계산해야 함
  // 임시로 기본값 반환 (실제 구현은 서버 API에서 처리)
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  
  // 간단한 근사치 계산 (실제로는 정확한 절기 계산 필요)
  const daysFromSolarTerm = calculateApproximateDaysFromSolarTerm(month, day);
  const direction = determineDaeunDirection(gender, yearSky);
  
  let calculatedDays = daysFromSolarTerm;
  if (direction === "역행") {
    // 역행의 경우 이전 절기로부터의 날짜 계산
    calculatedDays = 30 - daysFromSolarTerm; // 근사치
  }
  
  // 3일 = 1년 공식 적용
  const daeunNumber = Math.floor(calculatedDays / 3) + (calculatedDays % 3 >= 2 ? 1 : 0);
  
  // 1-10 범위로 제한
  return Math.max(1, Math.min(10, daeunNumber));
}

/**
 * 절기로부터 대략적인 일수 계산 (근사치)
 * @param month 월
 * @param day 일
 * @returns 절기로부터의 일수 (근사치)
 */
function calculateApproximateDaysFromSolarTerm(month: number, day: number): number {
  // 각 월의 대략적인 절기 시작일 (근사치)
  const solarTermDays = [4, 4, 5, 5, 5, 6, 7, 7, 8, 8, 7, 5]; // 각 월의 절기 시작일 근사치
  const termDay = solarTermDays[month - 1];
  
  if (day >= termDay) {
    return day - termDay;
  } else {
    // 이전 월의 절기로부터 계산
    return 30 - termDay + day; // 근사치
  }
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
 * 세운 계산
 * @param birthYear 출생년도
 * @param targetYear 계산할 년도 (선택사항, 기본값은 현재년도)
 * @returns 세운 정보
 */
export function calculateSaeun(birthYear: number, targetYear?: number): SaeunInfo {
  const year = targetYear || new Date().getFullYear();
  const age = year - birthYear + 1;
  
  // 태어난 해(년주 간지)부터 시작하여 매년 증가
  const yearsSinceBirth = year - birthYear;
  
  // 60갑자 순환
  const ganjiIndex = yearsSinceBirth % 60;
  const skyIndex = ganjiIndex % 10;
  const earthIndex = ganjiIndex % 12;
  
  return {
    year,
    age,
    sky: CHEONGAN[skyIndex],
    earth: JIJI[earthIndex]
  };
}

/**
 * 월운 계산 (전통 방식)
 * @param year 년도
 * @param month 월
 * @returns 월운 정보
 */
export function calculateWolun(year: number, month: number): WolunInfo {
  // 월운은 월주 뽑는 법과 동일
  // 갑기년=병인월, 을경년=무인월, 병신년=경인월, 정임년=임인월, 무계년=갑인월
  
  const yearSkyIndex = year % 10; // 년간의 인덱스
  const yearSky = CHEONGAN[yearSkyIndex];
  
  // 년간에 따른 월간 시작 천간 결정
  let startSkysIndex: number;
  if (["甲", "己"].includes(yearSky)) {
    startSkysIndex = CHEONGAN.indexOf("丙"); // 병인월부터
  } else if (["乙", "庚"].includes(yearSky)) {
    startSkysIndex = CHEONGAN.indexOf("戊"); // 무인월부터
  } else if (["丙", "辛"].includes(yearSky)) {
    startSkysIndex = CHEONGAN.indexOf("庚"); // 경인월부터
  } else if (["丁", "壬"].includes(yearSky)) {
    startSkysIndex = CHEONGAN.indexOf("壬"); // 임인월부터
  } else { // 무, 계
    startSkysIndex = CHEONGAN.indexOf("甲"); // 갑인월부터
  }
  
  // 인월(1월)부터 해당 월까지의 천간 계산
  const monthSkyIndex = (startSkysIndex + (month - 1)) % CHEONGAN.length;
  const monthEarthIndex = (JIJI.indexOf("寅") + (month - 1)) % JIJI.length; // 인월부터 시작
  
  return {
    month,
    sky: CHEONGAN[monthSkyIndex],
    earth: JIJI[monthEarthIndex],
    period: `${year}년 ${month}월`
  };
}

/**
 * 전체 운세 계산
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