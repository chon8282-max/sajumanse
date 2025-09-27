import { 
  type SajuInfo, 
  type DaeunSegment, 
  type SaeunInfo, 
  type WolunInfo, 
  type FortuneCalculationResult 
} from "@shared/schema";

// 서버/클라이언트 공용 함수들을 shared 모듈에서 가져오기
export {
  determineDaeunDirection,
  calculateDaeunGanji,
  calculateDaeunNumber,
  createDaeunSegments,
  calculateFullFortune
} from "@shared/fortune-calculator";

/**
 * 서버 API를 통한 정확한 대운수 계산 요청
 * @param birthDate 생년월일
 * @param gender 성별
 * @param yearSky 태어난 년의 천간
 * @returns 대운수 계산 결과 Promise
 */
export async function calculatePreciseDaeunNumberClient(
  birthDate: Date,
  gender: string,
  yearSky: string
): Promise<{
  daeunNumber: number;
  direction: "순행" | "역행";
  daysFromTerm: number;
  calculationMethod: "미래절" | "과거절";
}> {
  const response = await fetch('/api/fortune/daeun-number', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      birthDate: birthDate.toISOString(),
      gender,
      yearSky
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to calculate precise daeun number');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to calculate precise daeun number');
  }
  
  return result.data;
}

/**
 * 세운(년운) 계산
 * @param startYear 세운 시작년도
 * @param targetYear 계산할 년도
 * @returns 세운 정보
 */
export function calculateSaeun(startYear: number, targetYear: number): SaeunInfo {
  // 갑자부터 시작하는 60갑자 순서로 계산
  const gapjaIndex = (targetYear - startYear) % 60;
  
  // 간단한 구현 - 실제로는 더 복잡한 계산 필요
  return {
    year: targetYear,
    ganji: {
      sky: "甲", // 실제 계산 필요
      earth: "子" // 실제 계산 필요
    },
    description: `${targetYear}년 세운`
  };
}

/**
 * 월운 계산
 * @param year 년도
 * @param month 월
 * @returns 월운 정보
 */
export function calculateWolun(year: number, month: number): WolunInfo {
  // 월운 간지 계산 로직 (간단한 구현)
  return {
    year,
    month,
    ganji: {
      sky: "甲", // 실제 계산 필요
      earth: "寅" // 실제 계산 필요
    },
    description: `${year}년 ${month}월 월운`
  };
}

/**
 * 특정 나이의 대운 찾기
 * @param daeunList 대운 목록
 * @param age 나이
 * @returns 해당 나이의 대운 정보
 */
export function findDaeunByAge(daeunList: DaeunSegment[], age: number): DaeunSegment | undefined {
  return daeunList.find(daeun => age >= daeun.startAge && age <= daeun.endAge);
}

/**
 * 현재 나이 계산
 * @param birthDate 생년월일
 * @returns 현재 나이
 */
export function calculateCurrentAge(birthDate: Date): number {
  const today = new Date();
  const birthYear = birthDate.getFullYear();
  const currentYear = today.getFullYear();
  
  // 한국식 나이 계산 (태어난 해를 1세로 계산)
  return currentYear - birthYear + 1;
}

/**
 * 미래 특정 년도의 나이 계산
 * @param birthDate 생년월일
 * @param targetYear 계산할 년도
 * @returns 해당 년도의 나이
 */
export function calculateAgeAtYear(birthDate: Date, targetYear: number): number {
  const birthYear = birthDate.getFullYear();
  return targetYear - birthYear + 1;
}