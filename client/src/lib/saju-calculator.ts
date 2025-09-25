import { CHEONGAN, JIJI, type SajuInfo, type WuXing } from "@shared/schema";

// 천간의 오행 매핑
const CHEONGAN_WUXING: Record<string, WuXing> = {
  "갑": "목", "을": "목",
  "병": "화", "정": "화", 
  "무": "토", "기": "토",
  "경": "금", "신": "금",
  "임": "수", "계": "수"
};

// 지지의 오행 매핑
const JIJI_WUXING: Record<string, WuXing> = {
  "자": "수", "축": "토", "인": "목", "묘": "목",
  "진": "토", "사": "화", "오": "화", "미": "토",
  "신": "금", "유": "금", "술": "토", "해": "수"
};

// 월별 지지 (음력 기준)
const MONTH_JIJI = ["인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "자", "축"];

// 시간별 지지
const HOUR_JIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

/**
 * 사주팔자 계산 함수
 */
export function calculateSaju(
  year: number,
  month: number,
  day: number,
  hour: number,
  isLunar: boolean = false
): SajuInfo {
  // 기본적인 사주 계산 (간단한 알고리즘)
  // 실제로는 더 복잡한 계산이 필요하지만, 데모용으로 단순화
  
  // 년주 계산 (갑자년을 1984년으로 가정)
  const yearIndex = (year - 1984) % 60;
  const yearSkyIndex = yearIndex % 10;
  const yearEarthIndex = yearIndex % 12;
  
  // 월주 계산
  const monthSkyIndex = (yearSkyIndex * 2 + month - 1) % 10;
  const monthEarthIndex = (month - 1) % 12;
  
  // 일주 계산 (단순화된 계산)
  const dayIndex = Math.floor((year * 365.25 + month * 30.44 + day) % 60);
  const daySkyIndex = dayIndex % 10;
  const dayEarthIndex = dayIndex % 12;
  
  // 시주 계산
  const hourSkyIndex = (daySkyIndex * 2 + Math.floor(hour / 2)) % 10;
  const hourEarthIndex = Math.floor(hour / 2) % 12;
  
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
    now.getHours()
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
 * 음력-양력 변환 (간단한 근사치)
 * 실제로는 정확한 음력 변환 라이브러리가 필요
 */
export function convertLunarToSolar(year: number, month: number, day: number): Date {
  // 간단한 근사치 계산 (실제로는 복잡한 계산 필요)
  const lunarDate = new Date(year, month - 1, day);
  lunarDate.setDate(lunarDate.getDate() + 11); // 대략 11일 정도 차이
  return lunarDate;
}