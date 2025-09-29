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

// 천덕귀인 매핑 테이블 (월지 → 찾을 천간 또는 지지)
const CHEONDEOK_GWIIN_MAP: Record<string, string> = {
  "子": "巳",
  "丑": "庚", 
  "寅": "丁",
  "卯": "申",
  "辰": "壬",
  "巳": "辛",
  "午": "亥",
  "未": "甲",
  "申": "癸",
  "酉": "寅",
  "戌": "丙",
  "亥": "乙"
};

// 월덕귀인 매핑 테이블 (월지 → 찾을 천간)
const WOLDEOK_GWIIN_MAP: Record<string, string> = {
  // 신월,자월,진월(申子辰) → 임(壬)
  "申": "壬",
  "子": "壬", 
  "辰": "壬",
  // 사월,유월,축월(巳酉丑) → 경(庚)
  "巳": "庚",
  "酉": "庚",
  "丑": "庚",
  // 인월,오월,술월(寅午戌) → 병(丙)
  "寅": "丙",
  "午": "丙",
  "戌": "丙",
  // 해월,묘월,미월(亥卯未) → 갑(甲)
  "亥": "甲",
  "卯": "甲",
  "未": "甲"
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
 * 천덕귀인(天德貴人) 계산
 * 월지를 기준으로 천간이나 지지를 찾습니다.
 */
export function calculateCheondeokGwiin(
  yearSky: string,
  monthSky: string,
  daySky: string,
  hourSky: string,
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

  // 월지에 해당하는 천덕귀인 찾기
  const cheondeokTarget = CHEONDEOK_GWIIN_MAP[monthEarth];
  if (!cheondeokTarget) return result;

  // 천간과 지지 모두에서 찾기
  const allSkies = [yearSky, monthSky, daySky, hourSky];
  const allEarths = [yearEarth, monthEarth, dayEarth, hourEarth];
  
  // 각 주에서 천덕귀인에 해당하는 천간이나 지지가 있는지 확인
  if (allSkies[0] === cheondeokTarget || allEarths[0] === cheondeokTarget) {
    result.yearPillar.push("천덕귀인");
  }
  if (allSkies[1] === cheondeokTarget || allEarths[1] === cheondeokTarget) {
    result.monthPillar.push("천덕귀인");
  }
  if (allSkies[2] === cheondeokTarget || allEarths[2] === cheondeokTarget) {
    result.dayPillar.push("천덕귀인");
  }
  if (allSkies[3] === cheondeokTarget || allEarths[3] === cheondeokTarget) {
    result.hourPillar.push("천덕귀인");
  }

  return result;
}

/**
 * 월덕귀인(月德貴人) 계산
 * 월지를 기준으로 천간을 찾습니다.
 */
export function calculateWoldeokGwiin(
  yearSky: string,
  monthSky: string,
  daySky: string,
  hourSky: string,
  monthEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  // 월지에 해당하는 월덕귀인 천간 찾기
  const woldeokTarget = WOLDEOK_GWIIN_MAP[monthEarth];
  if (!woldeokTarget) return result;

  // 각 주의 천간에서 월덕귀인에 해당하는지 확인
  if (yearSky === woldeokTarget) {
    result.yearPillar.push("월덕귀인");
  }
  if (monthSky === woldeokTarget) {
    result.monthPillar.push("월덕귀인");
  }
  if (daySky === woldeokTarget) {
    result.dayPillar.push("월덕귀인");
  }
  if (hourSky === woldeokTarget) {
    result.hourPillar.push("월덕귀인");
  }

  return result;
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
 * 1행 신살 계산 (천덕귀인, 월덕귀인)
 * 월지를 기준으로 천간을 찾는 신살들
 */
export function calculateFirstRowShinSal(
  yearSky: string,
  monthSky: string,
  daySky: string,
  hourSky: string,
  yearEarth: string,
  monthEarth: string,
  dayEarth: string,
  hourEarth: string
): ShinSalResult {
  // 천덕귀인 계산
  const cheondeokGwiin = calculateCheondeokGwiin(
    yearSky, monthSky, daySky, hourSky,
    yearEarth, monthEarth, dayEarth, hourEarth
  );
  
  // 월덕귀인 계산
  const woldeokGwiin = calculateWoldeokGwiin(
    yearSky, monthSky, daySky, hourSky, monthEarth
  );
  
  // 두 신살 결과를 합쳐서 반환
  return mergeShinSalResults(cheondeokGwiin, woldeokGwiin);
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