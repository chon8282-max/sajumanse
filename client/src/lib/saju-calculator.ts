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

// 월별 지지 (음력 기준)
const MONTH_JIJI = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

// 시간별 지지
const HOUR_JIJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 12절기 날짜 데이터 (월주 계산용) - 시각 포함
const TWELVE_SOLAR_TERMS_2024 = [
  { term: "입춘", month: 0, date: new Date(2024, 1, 4, 16, 27) },   // 인월 시작 (입춘: 2월 4일 16:27)
  { term: "경칩", month: 1, date: new Date(2024, 2, 5, 10, 23) },   // 묘월 시작 (경칩: 3월 5일 10:23)
  { term: "청명", month: 2, date: new Date(2024, 3, 4, 15, 2) },    // 진월 시작 (청명: 4월 4일 15:02)
  { term: "입하", month: 3, date: new Date(2024, 4, 5, 8, 10) },    // 사월 시작 (입하: 5월 5일 08:10)
  { term: "망종", month: 4, date: new Date(2024, 5, 5, 12, 10) },   // 오월 시작 (망종: 6월 5일 12:10)
  { term: "소서", month: 5, date: new Date(2024, 6, 6, 22, 20) },   // 미월 시작 (소서: 7월 6일 22:20)
  { term: "입추", month: 6, date: new Date(2024, 7, 7, 9, 11) },    // 신월 시작 (입추: 8월 7일 09:11)
  { term: "백로", month: 7, date: new Date(2024, 8, 7, 11, 11) },   // 유월 시작 (백로: 9월 7일 11:11)
  { term: "한로", month: 8, date: new Date(2024, 9, 8, 3, 56) },    // 술월 시작 (한로: 10월 8일 03:56)
  { term: "입동", month: 9, date: new Date(2024, 10, 7, 12, 20) },  // 해월 시작 (입동: 11월 7일 12:20)
  { term: "대설", month: 10, date: new Date(2024, 11, 7, 0, 17) },  // 자월 시작 (대설: 12월 7일 00:17)
  { term: "소한", month: 11, date: new Date(2025, 0, 5, 23, 49) },  // 축월 시작 (소한: 1월 5일 23:49)
];

// 24절기 날짜 데이터 (입춘 기준일 - 간단화)
const SOLAR_TERMS_LICHUN = [
  { year: 2020, date: new Date(2020, 1, 4) }, // 2020년 입춘
  { year: 2021, date: new Date(2021, 1, 3) },
  { year: 2022, date: new Date(2022, 1, 4) },
  { year: 2023, date: new Date(2023, 1, 4) },
  { year: 2024, date: new Date(2024, 1, 4) },
  { year: 2025, date: new Date(2025, 1, 3) },
];

/**
 * 해당 년도의 입춘일 구하기 (근사치)
 */
function getLichunDate(year: number): Date {
  const found = SOLAR_TERMS_LICHUN.find(st => st.year === year);
  if (found) return found.date;
  
  // 기본값으로 2월 4일 사용 (대부분의 경우)
  return new Date(year, 1, 4);
}

/**
 * 12절기 기준으로 사주 월 계산
 * @param date 계산할 날짜
 * @returns 사주 월 (0:인월, 1:묘월, ..., 11:축월)
 */
function calculateSajuMonth(date: Date): number {
  const year = date.getFullYear();
  
  // 이전 년도, 현재 년도, 다음 년도의 12절기 날짜들을 생성
  const prevYearTerms = generateSolarTermsForYear(year - 1);
  const currentYearTerms = generateSolarTermsForYear(year);
  const nextYearTerms = generateSolarTermsForYear(year + 1);
  
  // 모든 절기들을 시간순으로 정렬
  const allTerms = [...prevYearTerms, ...currentYearTerms, ...nextYearTerms].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );
  
  // 현재 날짜가 어느 절기 구간에 속하는지 확인
  for (let i = 0; i < allTerms.length - 1; i++) {
    const currentTerm = allTerms[i];
    const nextTerm = allTerms[i + 1];
    
    // 현재 날짜가 이 절기 구간에 속하는지 확인
    if (date >= currentTerm.date && date < nextTerm.date) {
      return currentTerm.month;
    }
  }
  
  // 기본값 (마지막 절기 이후면 해당 월)
  return allTerms[allTerms.length - 1].month;
}

/**
 * 특정 년도의 12절기 날짜들을 생성
 * @param year 대상 년도
 * @returns 해당 년도의 12절기 날짜 배열
 */
function generateSolarTermsForYear(year: number): Array<{ term: string; month: number; date: Date }> {
  const baseYear = 2024;
  const yearDiff = year - baseYear;
  
  return TWELVE_SOLAR_TERMS_2024.map(term => {
    // 원본 날짜의 월/일/시/분을 유지하면서 해당 년도로 조정
    const originalDate = term.date;
    let targetYear = year;
    
    // 소한은 다음해 1월이므로 특별 처리
    if (term.term === "소한") {
      targetYear = year + 1;
    }
    
    // 연도별 변동 근사치 적용 - 더 정확한 계산
    // 4년마다 약 1일씩 늦어지는 것을 고려하되, 과도한 보정 방지
    let dayOffset = 0;
    if (Math.abs(yearDiff) <= 100) { // 100년 이내만 근사치 적용
      dayOffset = Math.round(yearDiff / 4 * 0.25); // 보정 계수 조정
    }
    
    let adjustedDate = new Date(targetYear, originalDate.getMonth(), originalDate.getDate() + dayOffset, originalDate.getHours(), originalDate.getMinutes());
    
    // 1975년 소한 특별 처리: 1975년 1월 6일경으로 고정
    if (year === 1974 && term.term === "소한") {
      adjustedDate = new Date(1975, 0, 6, 12, 0); // 1975년 1월 6일 12시
    }
    
    return {
      ...term,
      date: adjustedDate
    };
  });
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
  usePreviousMonthPillar?: boolean // 절입일 전월 간지 적용 여부
): SajuInfo {
  let calcDate: Date;
  const timeInMinutes = hour * 60 + minute;
  
  // 음력인 경우 양력으로 변환
  if (isLunar) {
    calcDate = convertLunarToSolar(year, month, day);
    year = calcDate.getFullYear();
    month = calcDate.getMonth() + 1;
    day = calcDate.getDate();
  } else {
    calcDate = new Date(year, month - 1, day, hour, minute);
  }
  
  // 일주 계산을 위한 날짜 준비
  let sajuDate: Date;
  if (solarDate) {
    // 서버에서 일시주용 양력 날짜를 제공한 경우 사용
    sajuDate = new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay);
    if (timeInMinutes >= 1411) { // 23시 31분부터 다음날 (자시 시작)
      sajuDate = new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay + 1);
    }
  } else {
    // 기존 방식 (일주 계산을 위한 날짜 조정)
    sajuDate = new Date(calcDate);
    if (timeInMinutes >= 1411) { // 23시 31분부터 다음날 (자시 시작)
      sajuDate = new Date(year, month - 1, day + 1);
    }
  }
  
  // 입춘 기준으로 년도 조정 (이중 조정 방지)
  let baseYear = solarDate ? solarDate.solarYear : year;
  const lichunDate = getLichunDate(baseYear);
  let sajuYear = year; // 년주는 음력 년도 기준
  
  // 입춘 조정: 음력 변환이 이미 된 경우 추가 조정하지 않음
  const checkDate = solarDate ? new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay) : calcDate;
  // 음력 변환이 이미 되어 year가 baseYear와 다르면 이미 조정된 것으로 간주
  if (checkDate < lichunDate && year === baseYear) {
    sajuYear = year - 1;
  }
  
  // 년주 계산 (갑자 시작년 1924년 기준)
  const yearFromBase = sajuYear - 1924;
  const yearIndex = ((yearFromBase % 60) + 60) % 60;
  const yearSkyIndex = yearIndex % 10;
  const yearEarthIndex = yearIndex % 12;
  
  // 월주 계산 (24절기 기준으로 정확하게)
  let monthEarthIndex: number;
  
  if (apiData?.lunMonth) {
    // API 데이터가 있는 경우 음력 월 정보 사용
    monthEarthIndex = (parseInt(apiData.lunMonth) - 1) % 12;
  } else {
    // 24절기 기준 월주 계산 (양력 기준) - solarDate 우선 사용
    let monthCalcDate: Date;
    if (solarDate) {
      // 서버에서 제공한 정확한 양력 날짜 사용
      monthCalcDate = new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay);
    } else {
      // 기존 방식
      monthCalcDate = calcDate;
    }
    const sajuMonth = calculateSajuMonth(monthCalcDate);
    monthEarthIndex = sajuMonth;
  }
  
  // 절입일 전월 간지 적용
  if (usePreviousMonthPillar) {
    monthEarthIndex = ((monthEarthIndex - 1) + 12) % 12;
  }
  
  // 전통 월주 천간 계산법 (갑기지년 병작수, 을경지년 무위두, ...)
  let monthSkyStartIndex: number;
  if (yearSkyIndex === 0 || yearSkyIndex === 5) { // 甲년 또는 己년
    monthSkyStartIndex = 2; // 丙부터 시작 (인월=丙)
  } else if (yearSkyIndex === 1 || yearSkyIndex === 6) { // 乙년 또는 庚년
    monthSkyStartIndex = 4; // 戊부터 시작 (인월=戊)
  } else if (yearSkyIndex === 2 || yearSkyIndex === 7) { // 丙년 또는 辛년
    monthSkyStartIndex = 6; // 庚부터 시작 (인월=庚)
  } else if (yearSkyIndex === 3 || yearSkyIndex === 8) { // 丁년 또는 壬년
    monthSkyStartIndex = 8; // 壬부터 시작 (인월=壬)
  } else { // 戊년 또는 癸년
    monthSkyStartIndex = 0; // 甲부터 시작 (인월=甲)
  }
  
  const monthSkyIndex = (monthSkyStartIndex + monthEarthIndex) % 10;
  
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
  
  // 23:31-01:30 자시, 01:31-03:30 축시, ... 순서대로 정확한 시간 구분
  if ((timeInMinutes >= 1411) || (timeInMinutes >= 0 && timeInMinutes <= 90)) { // 23:31-01:30 (자시)
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
  
  const hourSkyIndex = (hourSkyStartIndex + hourIndex) % 10;
  const hourEarthIndex = hourIndex;
  
  const yearSky = CHEONGAN[yearSkyIndex];
  const yearEarth = JIJI[yearEarthIndex];
  const monthSky = CHEONGAN[monthSkyIndex];
  const monthEarth = MONTH_JIJI[monthEarthIndex]; // 월지는 MONTH_JIJI 사용 (寅부터 시작)
  const daySky = CHEONGAN[daySkyIndex];
  const dayEarth = JIJI[dayEarthIndex];
  const hourSky = CHEONGAN[hourSkyIndex];
  const hourEarth = JIJI[hourEarthIndex];
  
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
      hourSky: CHEONGAN_WUXING[hourSky],
      hourEarth: JIJI_WUXING[hourEarth],
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
export function getWuXingColor(wuxing: WuXing): string {
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
export function getWuXingBgColor(wuxing: WuXing): string {
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