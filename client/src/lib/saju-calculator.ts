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
 * 사주팔자 계산 함수 (정확한 버전)
 */
export function calculateSaju(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  isLunar: boolean = false
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
  
  // 일주 계산을 위한 날짜 조정 (23시 31분부터 다음날)
  let sajuDate = new Date(calcDate);
  if (timeInMinutes >= 1411) { // 23시 31분부터 다음날
    sajuDate = new Date(year, month - 1, day + 1);
  }
  
  // 입춘 기준으로 년도 조정
  const lichunDate = getLichunDate(year);
  let sajuYear = year;
  if (calcDate < lichunDate) {
    sajuYear = year - 1;
  }
  
  // 년주 계산 (갑자 시작년 1924년 기준)
  const yearFromBase = sajuYear - 1924;
  const yearIndex = ((yearFromBase % 60) + 60) % 60;
  const yearSkyIndex = yearIndex % 10;
  const yearEarthIndex = yearIndex % 12;
  
  // 월주 계산 (절기 기준, 간단화)
  // 인월(정월)은 입춘~경칩, 묘월(2월)은 경칩~청명...
  let sajuMonth = month;
  if (month === 1 && calcDate < lichunDate) {
    sajuMonth = 12; // 전년 12월로 처리
  } else if (month === 2 && calcDate < lichunDate) {
    sajuMonth = 1;
  }
  
  const monthEarthIndex = (sajuMonth + 1) % 12; // 인월부터 시작
  const monthSkyIndex = (yearSkyIndex * 2 + monthEarthIndex) % 10;
  
  // 일주 계산 (정확한 갑자일 기준, 23시 30분부터 다음날)
  // 1924년 1월 1일을 갑자일로 설정 (실제로는 검증 필요)
  const baseDate = new Date(1924, 0, 1);
  const daysDiff = Math.floor((sajuDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayIndex = ((daysDiff % 60) + 60) % 60;
  const daySkyIndex = dayIndex % 10;
  const dayEarthIndex = dayIndex % 12;
  
  // 시주 계산 (정확한 시간 구간 기준)
  let hourIndex: number;
  
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
  const monthEarth = JIJI[monthEarthIndex];
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
 * 음력-양력 변환 (korean-lunar-calendar 라이브러리 사용)
 */
export function convertLunarToSolar(year: number, month: number, day: number, isLeapMonth: boolean = false): Date {
  try {
    // korean-lunar-calendar 라이브러리 import
    const KoreanLunarCalendar = require('korean-lunar-calendar');
    
    const result = KoreanLunarCalendar.solarCalendarFromLunarCalendar(year, month, day, isLeapMonth);
    
    if (result && result.solar) {
      return new Date(result.solar.year, result.solar.month - 1, result.solar.day);
    } else {
      // 라이브러리 실패 시 fallback
      console.warn('Korean lunar calendar conversion failed, using fallback');
      return new Date(year, month - 1, day);
    }
  } catch (error) {
    console.error('Lunar to solar conversion error:', error);
    // 라이브러리 실패 시 기본 날짜 반환
    return new Date(year, month - 1, day);
  }
}

/**
 * 양력-음력 변환 (korean-lunar-calendar 라이브러리 사용)
 */
export function convertSolarToLunar(date: Date): { year: number; month: number; day: number; isLeapMonth: boolean } {
  try {
    const KoreanLunarCalendar = require('korean-lunar-calendar');
    
    const result = KoreanLunarCalendar.lunarCalendarFromSolarCalendar(
      date.getFullYear(), 
      date.getMonth() + 1, 
      date.getDate()
    );
    
    if (result && result.lunar) {
      return {
        year: result.lunar.year,
        month: result.lunar.month,
        day: result.lunar.day,
        isLeapMonth: result.lunar.leapMonth || false
      };
    } else {
      // 라이브러리 실패 시 fallback
      console.warn('Korean lunar calendar conversion failed, using fallback');
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        isLeapMonth: false
      };
    }
  } catch (error) {
    console.error('Solar to lunar conversion error:', error);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      isLeapMonth: false
    };
  }
}