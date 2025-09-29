/**
 * 신살(神殺) 계산 함수들
 * 전통 사주학의 다양한 신살을 계산합니다.
 */

import { CHEONGAN, JIJI } from "@shared/schema";

// 천을귀인 매핑 테이블
const CHEONUL_GWIIN_MAP: Record<string, string[]> = {
  "甲": ["丑", "未"],
  "戊": ["丑", "未"],
  "庚": ["丑", "未"],
  "乙": ["子", "申"],
  "己": ["子", "申"],
  "丙": ["亥", "酉"],
  "丁": ["亥", "酉"],
  "辛": ["午", "寅"],
  "壬": ["巳", "卯"],
  "癸": ["巳", "卯"]
};

// 문창귀인 매핑 테이블
const MUNCHANG_GWIIN_MAP: Record<string, string[]> = {
  "甲": ["巳", "午"],
  "乙": ["巳", "午"],
  "丙": ["申", "酉"],
  "丁": ["申", "酉"],
  "戊": ["申", "酉"],
  "己": ["申", "酉"],
  "庚": ["亥", "子"],
  "辛": ["亥", "子"],
  "壬": ["寅", "卯"],
  "癸": ["寅", "卯"]
};

export interface ShinSalResult {
  yearPillar: string[];
  monthPillar: string[];
  dayPillar: string[];
  hourPillar: string[];
}

/**
 * 천을귀인(天乙貴人) 계산
 * 일간을 기준으로 년주, 월주, 일주, 시주의 지지에서 천을귀인을 찾습니다.
 */
export function calculateCheonulGwiin(
  daySky: string,
  yearEarth: string,
  monthEarth: string,
  dayEarth: string,
  hourEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  // 일간에 해당하는 천을귀인 지지 목록 가져오기
  const cheonulGwiinEarths = CHEONUL_GWIIN_MAP[daySky] || [];

  // 각 주의 지지가 천을귀인에 해당하는지 확인
  if (cheonulGwiinEarths.includes(yearEarth)) {
    result.yearPillar.push("천을귀인");
  }
  
  if (cheonulGwiinEarths.includes(monthEarth)) {
    result.monthPillar.push("천을귀인");
  }
  
  if (cheonulGwiinEarths.includes(dayEarth)) {
    result.dayPillar.push("천을귀인");
  }
  
  if (cheonulGwiinEarths.includes(hourEarth)) {
    result.hourPillar.push("천을귀인");
  }

  return result;
}

/**
 * 문창귀인(文昌貴人) 계산
 * 일간을 기준으로 년주, 월주, 일주, 시주의 지지에서 문창귀인을 찾습니다.
 */
export function calculateMunchangGwiin(
  daySky: string,
  yearEarth: string,
  monthEarth: string,
  dayEarth: string,
  hourEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  // 일간에 해당하는 문창귀인 지지 목록 가져오기
  const munchangGwiinEarths = MUNCHANG_GWIIN_MAP[daySky] || [];

  // 각 주의 지지가 문창귀인에 해당하는지 확인
  if (munchangGwiinEarths.includes(yearEarth)) {
    result.yearPillar.push("문창귀인");
  }
  
  if (munchangGwiinEarths.includes(monthEarth)) {
    result.monthPillar.push("문창귀인");
  }
  
  if (munchangGwiinEarths.includes(dayEarth)) {
    result.dayPillar.push("문창귀인");
  }
  
  if (munchangGwiinEarths.includes(hourEarth)) {
    result.hourPillar.push("문창귀인");
  }

  return result;
}

/**
 * 여러 신살 결과를 합치는 유틸리티 함수
 */
function mergeShinSalResults(result1: ShinSalResult, result2: ShinSalResult): ShinSalResult {
  return {
    yearPillar: [...result1.yearPillar, ...result2.yearPillar],
    monthPillar: [...result1.monthPillar, ...result2.monthPillar],
    dayPillar: [...result1.dayPillar, ...result2.dayPillar],
    hourPillar: [...result1.hourPillar, ...result2.hourPillar]
  };
}

/**
 * 모든 신살 계산 (천을귀인, 문창귀인 포함)
 * 여러 신살이 동시에 나타날 수 있습니다.
 */
export function calculateAllShinSal(
  daySky: string,
  yearEarth: string,
  monthEarth: string,
  dayEarth: string,
  hourEarth: string
): ShinSalResult {
  // 천을귀인 계산
  const cheonulGwiin = calculateCheonulGwiin(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 문창귀인 계산
  const munchangGwiin = calculateMunchangGwiin(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 두 신살 결과를 합쳐서 반환
  return mergeShinSalResults(cheonulGwiin, munchangGwiin);
}

/**
 * 신살 표시용 문자열 생성
 * 신살이 없으면 빈 문자열 반환
 */
export function formatShinSal(shinSalList: string[]): string {
  if (shinSalList.length === 0) {
    return "";
  }
  
  // 신살이 여러 개인 경우 쉼표로 구분
  return shinSalList.join(", ");
}