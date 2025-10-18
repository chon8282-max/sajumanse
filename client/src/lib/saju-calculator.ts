import { CHEONGAN, JIJI, type SajuInfo, type WuXing } from "@shared/schema";

// 천간의 오행 매핑
const CHEONGAN_WUXING: Record<string, WuXing> = {
  "甲": "목", "乙": "목",
  "丙": "화", "丁": "화", 
  "戊": "토", "己": "토",
  "庚": "금", "辛": "금",
  "壬": "수", "癸": "수"
};

// 지지의 오행 매핑
const JIJI_WUXING: Record<string, WuXing> = {
  "子": "수", "丑": "토", "寅": "목", "卯": "목",
  "辰": "토", "巳": "화", "午": "화", "未": "토",
  "申": "금", "酉": "금", "戌": "토", "亥": "수"
};

// 월별 지지 (음력 기준) - 참고용
const MONTH_JIJI = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

// 시간별 지지 - 참고용
const HOUR_JIJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/**
 * 12절기 기준으로 사주 월 계산
 * @param date 계산할 날짜 (시/분 포함)
 * @param solarTerms DB에서 가져온 절기 데이터 (없으면 근사값 사용)
 * @returns 사주 월 (0:축월, 1:인월, 2:묘월..., 11:자월)
 */
function calculateSajuMonth(date: Date, solarTerms?: Array<{ name: string; date: Date; month: number }>): number {
  // DB 절기 데이터가 있으면 정확한 계산
  if (solarTerms && solarTerms.length > 0) {
    console.log(`✓ DB 절기 데이터 사용 (${solarTerms.length}개 절기)`);
    
    // 현재 날짜가 어느 절기 구간에 속하는지 확인
    for (let i = 0; i < solarTerms.length - 1; i++) {
      const currentTerm = solarTerms[i];
      const nextTerm = solarTerms[i + 1];
      
      // 현재 날짜가 이 절기 구간에 속하는지 확인
      if (date >= currentTerm.date && date < nextTerm.date) {
        console.log(`  → ${currentTerm.name}~${nextTerm.name} 구간: ${currentTerm.month}월`);
        return currentTerm.month;
      }
    }
    
    // 마지막 절기 이후면 해당 월
    const lastTerm = solarTerms[solarTerms.length - 1];
    console.log(`  → 마지막 절기(${lastTerm.name}) 이후: ${lastTerm.month}월`);
    return lastTerm.month;
  }
  
  // DB 절기 데이터가 없으면 근사값 사용 (실시간 시계 용도)
  console.warn('⚠️ DB 절기 데이터 없음 - 근사값 사용 (실시간 표시용)');
  const solarMonth = date.getMonth(); // 0-11 (1월=0, 12월=11)
  const solarDay = date.getDate();
  
  // 간단한 근사 (각 월 6일경 절입으로 가정)
  const monthMapping = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 양력 1월=자월(11)...
  let sajuMonth = monthMapping[solarMonth];
  
  // 월 초순이면 전월일 가능성 (6일 이전)
  if (solarDay < 6) {
    sajuMonth = (sajuMonth - 1 + 12) % 12;
  }
  
  return sajuMonth;
}

/**
 * 사주팔자 계산 함수 (정확한 버전)
 */
export function calculateSaju(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  isLunar: boolean = false,
  solarDate?: { solarYear: number; solarMonth: number; solarDay: number },
  apiData?: any, // data.go.kr API 응답 데이터
  usePreviousMonthPillar?: boolean, // 절입일 전월 간지 적용 여부
  solarTerms?: Array<{ name: string; date: Date; month: number }> // DB 절기 데이터 (서버에서 전달)
): SajuInfo {
  let calcDate: Date;
  
  // 생시 미상 여부 확인 (hour가 유효하지 않으면 생시를 모르는 것으로 간주)
  const isBirthTimeUnknown = hour === undefined || hour === null || isNaN(hour);
  const timeInMinutes = isBirthTimeUnknown ? 0 : hour * 60 + minute;
  
  // 음력인 경우 양력으로 변환
  if (isLunar) {
    calcDate = convertLunarToSolar(year, month, day);
    year = calcDate.getFullYear();
    month = calcDate.getMonth() + 1;
    day = calcDate.getDate();
  } else {
    // 생시 미상일 경우 12시로 기본 설정 (일주 계산용)
    const defaultHour = isBirthTimeUnknown ? 12 : hour;
    const defaultMinute = isBirthTimeUnknown ? 0 : minute;
    calcDate = new Date(year, month - 1, day, defaultHour, defaultMinute);
  }
  
  // 야자시 체크 (23:31~00:30)
  const isNightZiShi = timeInMinutes >= 1411 || timeInMinutes <= 30; // 23:31 이후 또는 00:00~00:30
  
  // 일주 계산을 위한 날짜 준비
  let sajuDate: Date;
  if (solarDate) {
    // 서버에서 일시주용 양력 날짜를 제공한 경우 사용
    sajuDate = new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay);
    // 야자시는 일간이 바뀌지 않으므로 다음날로 넘기지 않음
  } else {
    // 기존 방식 (일주 계산을 위한 날짜 조정)
    sajuDate = new Date(calcDate);
    // 야자시는 일간이 바뀌지 않으므로 다음날로 넘기지 않음
  }
  
  // 입춘 기준으로 년도 조정 (DB 절기 데이터 사용)
  let baseYear = solarDate ? solarDate.solarYear : year;
  let sajuYear = year; // 년주는 음력 년도 기준
  let isLichunAdjusted = false; // 입춘 조정 여부 추적
  
  // 음력 변환 시 년도가 바뀐 경우 이미 조정된 것으로 간주
  if (year !== baseYear) {
    isLichunAdjusted = true;
  }
  
  // 입춘 조정: DB 절기 데이터에서 입춘일 찾기
  if (solarTerms && solarTerms.length > 0) {
    const lichunTerm = solarTerms.find(term => term.name === "입춘");
    if (lichunTerm) {
      const checkDate = solarDate 
        ? new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay, hour || 12, minute || 0)
        : calcDate;
      
      // 음력 변환이 이미 되어 year가 baseYear와 다르면 이미 조정된 것으로 간주
      if (checkDate < lichunTerm.date && year === baseYear) {
        sajuYear = year - 1;
        isLichunAdjusted = true;
        console.log(`입춘 전이므로 년주 -1: ${year} → ${sajuYear}`);
      } else {
        sajuYear = year;
      }
    } else {
      console.warn('⚠ DB 절기 데이터에 입춘이 없습니다.');
      sajuYear = year;
    }
  } else {
    console.warn('⚠ DB 절기 데이터가 없어 입춘 조정을 생략합니다.');
    sajuYear = year;
  }
  
  // 년주 계산 (갑자 시작년 1924년 기준)
  const yearFromBase = sajuYear - 1924;
  const yearIndex = ((yearFromBase % 60) + 60) % 60;
  const yearSkyIndex = yearIndex % 10;
  const yearEarthIndex = yearIndex % 12;
  
  // 월주 계산 (12절기 기준으로 정확하게)
  let sajuMonth: number; // calculateSajuMonth의 반환값 (0=축월, 1=인월, 2=묘월...)
  
  // 12절기 기준 월주 계산 (양력 기준) - solarDate 우선 사용
  let monthCalcDate: Date;
  if (solarDate) {
    // 서버에서 제공한 정확한 양력 날짜 사용 (시간 포함) - 음력 입력도 양력으로 변환된 날짜 사용
    monthCalcDate = new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay, hour || 12, minute || 0);
  } else if (isLunar) {
    // solarDate가 없고 음력인 경우: 음력→양력 변환 필요 (하지만 solarDate가 있어야 함)
    console.warn('음력 입력인데 solarDate가 없음. 근사값으로 계산');
    monthCalcDate = calcDate; // 폴백
  } else {
    // 기존 방식 (양력 입력)
    monthCalcDate = calcDate;
  }
  sajuMonth = calculateSajuMonth(monthCalcDate, solarTerms); // 0=축월, 1=인월, 2=묘월...
  
  // 절입일 전월 간지 처리 (입절 전 간지는 전월 간지)
  let adjustedYearSkyIndex = yearSkyIndex;
  let adjustedYearEarthIndex = yearEarthIndex;
  
  if (usePreviousMonthPillar === true) {
    // 전월로 조정하고, 인월(1)에서 전월로 가면 년주도 -1 (단, 음력 입력일 경우 년주는 이미 조정됨)
    const originalSajuMonth = sajuMonth;
    sajuMonth = (sajuMonth - 1 + 12) % 12;
    
    // 인월(1)→축월(0): 전년도로 넘어감 (입춘이 인월 시작)
    // 단, 음력 입력(isLunar=true)일 경우 sajuYear가 이미 음력 년도이므로 년주 조정하지 않음
    if (!isLunar && originalSajuMonth === 1) {
      adjustedYearSkyIndex = (yearSkyIndex - 1 + 10) % 10;
      adjustedYearEarthIndex = (yearEarthIndex - 1 + 12) % 12;
    }
  }
  
  // sajuMonth를 인월 기준 인덱스로 변환 (월간표는 인월 기준)
  // 0(축월) -> 11, 1(인월) -> 0, 2(묘월) -> 1...
  const monthEarthIndexForJiji = (sajuMonth + 11) % 12;
  
  // 전통 월주 천간 계산법 (갑기지년 병작수, 을경지년 무위두, ...)
  // 입춘 전월 간지 선택 시 조정된 년주 천간 사용
  let monthSkyStartIndex: number;
  if (adjustedYearSkyIndex === 0 || adjustedYearSkyIndex === 5) { // 甲년 또는 己년
    monthSkyStartIndex = 2; // 丙부터 시작 (인월=丙)
  } else if (adjustedYearSkyIndex === 1 || adjustedYearSkyIndex === 6) { // 乙년 또는 庚년
    monthSkyStartIndex = 4; // 戊부터 시작 (인월=戊)
  } else if (adjustedYearSkyIndex === 2 || adjustedYearSkyIndex === 7) { // 丙년 또는 辛년
    monthSkyStartIndex = 6; // 庚부터 시작 (인월=庚)
  } else if (adjustedYearSkyIndex === 3 || adjustedYearSkyIndex === 8) { // 丁년 또는 壬년
    monthSkyStartIndex = 8; // 壬부터 시작 (인월=壬)
  } else { // 戊년 또는 癸년
    monthSkyStartIndex = 0; // 甲부터 시작 (인월=甲)
  }
  
  const monthSkyIndex = (monthSkyStartIndex + monthEarthIndexForJiji) % 10;
  
  // 일주 계산 (API 데이터 우선 활용)
  let daySkyIndex: number;
  let dayEarthIndex: number;
  
  if (apiData?.solJeongja) {
    // API에서 일진 정보가 있는 경우 이를 활용
    const dayPillar = apiData.solJeongja;
    console.log(`API 일진 정보 사용: ${dayPillar}`);
    
    // 일진을 천간과 지지로 분리 (예: "경신" -> "경"(천간) + "신"(지지))
    if (dayPillar && dayPillar.length >= 2) {
      const daySky = dayPillar[0];
      const dayEarth = dayPillar[1];
      daySkyIndex = CHEONGAN.indexOf(daySky);
      dayEarthIndex = JIJI.indexOf(dayEarth);
      
      if (daySkyIndex === -1 || dayEarthIndex === -1) {
        console.warn(`API 일진 파싱 실패: ${dayPillar}, 기존 방식으로 폴백`);
        // 기존 방식으로 폴백
        const baseDate = new Date(2025, 7, 23);
        const daysDiff = Math.floor((sajuDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        const dayIndex = ((daysDiff % 60) + 60) % 60;
        daySkyIndex = dayIndex % 10;
        dayEarthIndex = dayIndex % 12;
      }
    } else {
      // API 데이터가 잘못된 경우 기존 방식 사용
      const baseDate = new Date(2025, 7, 23);
      const daysDiff = Math.floor((sajuDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayIndex = ((daysDiff % 60) + 60) % 60;
      daySkyIndex = dayIndex % 10;
      dayEarthIndex = dayIndex % 12;
    }
  } else {
    // API 데이터가 없는 경우 기존 방식 사용
    const baseDate = new Date(2025, 7, 23); // 2025년 8월 23일 갑자일
    const daysDiff = Math.floor((sajuDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayIndex = ((daysDiff % 60) + 60) % 60;
    daySkyIndex = dayIndex % 10;
    dayEarthIndex = dayIndex % 12;
  }
  
  // 시주 계산 (전통 시간 구간 기준 - 31분부터 시간 변경)
  let hourIndex: number;
  
  // 00:00-00:30 야자시, 00:31-01:30 자시, 01:31-03:30 축시, ... 순서대로 정확한 시간 구분
  if (timeInMinutes >= 0 && timeInMinutes <= 30) { // 00:00-00:30 (야자시)
    hourIndex = 12; // 夜子時
  } else if (timeInMinutes >= 31 && timeInMinutes <= 90) { // 00:31-01:30 (자시)
    hourIndex = 0; // 子時
  } else if (timeInMinutes >= 91 && timeInMinutes <= 210) { // 01:31-03:30 (축시)
    hourIndex = 1; // 丑時
  } else if (timeInMinutes >= 211 && timeInMinutes <= 330) { // 03:31-05:30 (인시)
    hourIndex = 2; // 寅時
  } else if (timeInMinutes >= 331 && timeInMinutes <= 450) { // 05:31-07:30 (묘시)
    hourIndex = 3; // 卯時
  } else if (timeInMinutes >= 451 && timeInMinutes <= 570) { // 07:31-09:30 (진시)
    hourIndex = 4; // 辰時
  } else if (timeInMinutes >= 571 && timeInMinutes <= 690) { // 09:31-11:30 (사시)
    hourIndex = 5; // 巳時
  } else if (timeInMinutes >= 691 && timeInMinutes <= 810) { // 11:31-13:30 (오시)
    hourIndex = 6; // 午時
  } else if (timeInMinutes >= 811 && timeInMinutes <= 930) { // 13:31-15:30 (미시)
    hourIndex = 7; // 未時
  } else if (timeInMinutes >= 931 && timeInMinutes <= 1050) { // 15:31-17:30 (신시)
    hourIndex = 8; // 申時
  } else if (timeInMinutes >= 1051 && timeInMinutes <= 1170) { // 17:31-19:30 (유시)
    hourIndex = 9; // 酉時
  } else if (timeInMinutes >= 1171 && timeInMinutes <= 1290) { // 19:31-21:30 (술시)
    hourIndex = 10; // 戌時
  } else if (timeInMinutes >= 1291 && timeInMinutes <= 1410) { // 21:31-23:30 (해시)
    hourIndex = 11; // 亥時
  } else if (timeInMinutes >= 1411) { // 23:31-00:30 (야자시)
    hourIndex = 12; // 夜子時 (특별 처리)
  } else {
    hourIndex = 0; // 기본값: 자시
  }
  
  // 시두법 적용 (일간을 기준으로 시간 천간 계산)
  const daySkyStem = daySkyIndex; // 일간의 천간 인덱스
  let hourSkyStartIndex: number;
  
  if (daySkyStem === 0 || daySkyStem === 5) { // 甲日 또는 己日
    hourSkyStartIndex = 0; // 甲子時부터 시작
  } else if (daySkyStem === 1 || daySkyStem === 6) { // 乙日 또는 庚日
    hourSkyStartIndex = 2; // 丙子時부터 시작
  } else if (daySkyStem === 2 || daySkyStem === 7) { // 丙日 또는 辛日
    hourSkyStartIndex = 4; // 戊子時부터 시작
  } else if (daySkyStem === 3 || daySkyStem === 8) { // 丁日 또는 壬日
    hourSkyStartIndex = 6; // 庚子時부터 시작
  } else { // 戊日 또는 癸日
    hourSkyStartIndex = 8; // 壬子時부터 시작
  }
  
  // 야자시 특별 처리: 해시 천간 + 1, 지지는 子
  let hourSkyIndex: number;
  let hourEarthIndex: number;
  
  if (hourIndex === 12) { // 야자시
    hourSkyIndex = (hourSkyStartIndex + 12) % 10; // 해시(11) 천간 + 1
    hourEarthIndex = 0; // 子
  } else {
    hourSkyIndex = (hourSkyStartIndex + hourIndex) % 10;
    hourEarthIndex = hourIndex;
  }
  
  // 절입일 전월 간지 적용 시 조정된 년주 사용
  const yearSky = CHEONGAN[adjustedYearSkyIndex];
  const yearEarth = JIJI[adjustedYearEarthIndex];
  const monthSky = CHEONGAN[monthSkyIndex];
  const monthEarth = MONTH_JIJI[monthEarthIndexForJiji]; // 월지는 MONTH_JIJI 사용 (인월부터 시작, 0=인, 11=축)
  const daySky = CHEONGAN[daySkyIndex];
  const dayEarth = JIJI[dayEarthIndex];
  
  // 생시 미상일 경우 시주를 빈 값으로 설정
  const hourSky = isBirthTimeUnknown ? "" : CHEONGAN[hourSkyIndex];
  const hourEarth = isBirthTimeUnknown ? "" : JIJI[hourEarthIndex];
  
  return {
    year: { sky: yearSky, earth: yearEarth },
    month: { sky: monthSky, earth: monthEarth },
    day: { sky: daySky, earth: dayEarth },
    hour: { sky: hourSky, earth: hourEarth },
    wuxing: {
      yearSky: CHEONGAN_WUXING[yearSky],
      yearEarth: JIJI_WUXING[yearEarth],
      monthSky: CHEONGAN_WUXING[monthSky],
      monthEarth: JIJI_WUXING[monthEarth],
      daySky: CHEONGAN_WUXING[daySky],
      dayEarth: JIJI_WUXING[dayEarth],
      hourSky: hourSky ? CHEONGAN_WUXING[hourSky] : '',
      hourEarth: hourEarth ? JIJI_WUXING[hourEarth] : '',
    }
  };
}

/**
 * 현재 날짜의 사주 계산
 */
export function getCurrentSaju(): SajuInfo {
  const now = new Date();
  return calculateSaju(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes()
  );
}

/**
 * 오행 색상 반환
 */
export function getWuXingColor(wuxing: WuXing | ''): string {
  if (!wuxing) return '';
  const colors = {
    "목": "text-green-600 dark:text-green-400",
    "화": "text-red-600 dark:text-red-400", 
    "토": "text-yellow-600 dark:text-yellow-400",
    "금": "text-gray-600 dark:text-gray-400",
    "수": "text-blue-600 dark:text-blue-400"
  };
  return colors[wuxing];
}

/**
 * 오행 배경색 반환
 */
export function getWuXingBgColor(wuxing: WuXing | ''): string {
  if (!wuxing) return '';
  const colors = {
    "목": "bg-green-100 dark:bg-green-900/20",
    "화": "bg-red-100 dark:bg-red-900/20",
    "토": "bg-yellow-100 dark:bg-yellow-900/20", 
    "금": "bg-gray-100 dark:bg-gray-900/20",
    "수": "bg-blue-100 dark:bg-blue-900/20"
  };
  return colors[wuxing];
}

/**
 * 클라이언트에서는 음력 변환이 지원되지 않습니다.
 * 서버에서 변환된 데이터를 사용하세요.
 */
export function convertLunarToSolar(year: number, month: number, day: number, isLeapMonth: boolean = false): Date {
  console.warn('Client-side lunar conversion is not supported. Use server-side conversion.');
  return new Date(year, month - 1, day);
}

/**
 * 클라이언트에서는 음력 변환이 지원되지 않습니다.
 * 서버에서 변환된 데이터를 사용하세요.
 */
export function convertSolarToLunar(date: Date): { year: number; month: number; day: number; isLeapMonth: boolean } {
  console.warn('Client-side lunar conversion is not supported. Use server-side conversion.');
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    isLeapMonth: false
  };
}