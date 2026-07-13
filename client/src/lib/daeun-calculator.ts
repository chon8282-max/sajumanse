// 대운 계산 로직 (정밀법 / 절장법)
// 절기의 실제 시각을 이용해 대운수를 정밀 계산

import { getSolarTermsForYear } from "@/lib/solar-terms-data";

const CHEONGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const JIJI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const SIXTY_GAPJA: string[] = [];
for (let i = 0; i < 60; i++) {
  SIXTY_GAPJA.push(CHEONGAN[i % 10] + JIJI[i % 12]);
}

const YANG_YEARS = ['甲', '丙', '戊', '庚', '壬'];

function isYangYear(yearSky: string): boolean {
  return YANG_YEARS.includes(yearSky);
}

export function isDaeunForward(gender: string, yearSky: string): boolean {
  const isYang = isYangYear(yearSky);
  if (gender === '남자') return isYang;      // 양남 순행, 음남 역행
  return !isYang;                             // 양녀 역행, 음녀 순행
}

export function generateDaeunGapja(monthSky: string, monthEarth: string, isForward: boolean): string[] {
  if (!monthSky || !monthEarth) {
    console.warn('generateDaeunGapja: monthSky/monthEarth 없음:', { monthSky, monthEarth });
    monthSky = monthSky || '丁';
    monthEarth = monthEarth || '丑';
  }
  const monthGapja = monthSky + monthEarth;
  const currentIndex = SIXTY_GAPJA.indexOf(monthGapja);
  if (currentIndex === -1) {
    throw new Error(`Invalid month gapja: ${monthGapja}`);
  }
  const daeunList: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const targetIndex = isForward
      ? (currentIndex + i) % 60
      : (currentIndex - i + 60) % 60;
    daeunList.push(SIXTY_GAPJA[targetIndex]);
  }
  return daeunList;
}

/**
 * 정밀 대운수 계산 (절장법)
 * 순행: 출생시각 → 다음 절입시각까지의 실제 시간
 * 역행: 이전 절입시각 → 출생시각까지의 실제 시간
 * 3일(72시간) = 대운 1
 */
export async function calculateDaeunNumberPrecise(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour: number,
  birthMinute: number,
  isForward: boolean
): Promise<number> {
  // 출생 시각 (KST)
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay, birthHour, birthMinute);

  // 전년/당년/다음년 12절기 모두 모아서 시각순 정렬
  const [prev, curr, next] = await Promise.all([
    getSolarTermsForYear(birthYear - 1),
    getSolarTermsForYear(birthYear),
    getSolarTermsForYear(birthYear + 1),
  ]);

  const TERM_NAMES = ['입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설','소한'];

  const terms = [...prev, ...curr, ...next]
    .filter(t => TERM_NAMES.includes(t.name))
    .map(t => ({ name: t.name, date: new Date(t.date) }))  // date는 KST 시각
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let diffMs: number;

  if (isForward) {
    // 다음 절입 시각 찾기
    const nextTerm = terms.find(t => t.date.getTime() > birthDate.getTime());
    if (!nextTerm) return 3;
    diffMs = nextTerm.date.getTime() - birthDate.getTime();
  } else {
    // 이전 절입 시각 찾기 (출생 시각 이하 중 가장 늦은 것)
    const prevTerms = terms.filter(t => t.date.getTime() <= birthDate.getTime());
    const prevTerm = prevTerms[prevTerms.length - 1];
    if (!prevTerm) return 3;
    diffMs = birthDate.getTime() - prevTerm.date.getTime();
  }

  // 3일 = 대운 1. 일수로 환산 후 /3
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const daeunRaw = diffDays / 3;

  // 반올림 (전통: 소수점 0.5 이상 올림 / 3일=1년, 1일=4개월 개념의 반올림)
  const daeunNumber = Math.round(daeunRaw);

  return Math.max(1, Math.min(10, daeunNumber === 0 ? 1 : daeunNumber));
}

export function calculateDaeunAges(daeunNumber: number): number[] {
  const ages: number[] = [];
  for (let i = 0; i < 10; i++) ages.push(daeunNumber + i * 10);
  return ages;
}

export interface DaeunPeriod {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  gapja: string;
  sky: string;
  earth: string;
}

function calculateActualGanjiYear(birthYear: number, yearSky?: string, yearEarth?: string): number {
  if (!yearSky || !yearEarth) return birthYear;
  const skyIndex = CHEONGAN.indexOf(yearSky);
  const earthIndex = JIJI.indexOf(yearEarth);
  if (skyIndex === -1 || earthIndex === -1) return birthYear;
  let ganjiIndex = -1;
  for (let i = 0; i < 60; i++) {
    if (i % 10 === skyIndex && i % 12 === earthIndex) { ganjiIndex = i; break; }
  }
  if (ganjiIndex === -1) return birthYear;
  const baseYear = 1924;
  let targetYear = birthYear;
  for (let offset = -5; offset <= 5; offset++) {
    const testYear = birthYear + offset;
    const testCyclePosition = (((testYear - baseYear) % 60) + 60) % 60;
    if (testCyclePosition === ganjiIndex) { targetYear = testYear; break; }
  }
  return targetYear;
}

export function calculateCurrentAge(birthYear: number, birthMonth: number, birthDay: number, yearSky?: string, yearEarth?: string): number {
  const actualGanjiYear = calculateActualGanjiYear(birthYear, yearSky, yearEarth);
  const currentYear = new Date().getFullYear();
  return currentYear - actualGanjiYear + 1;
}

export function calculateDaeunPeriods(birthYear: number, daeunAges: number[], daeunGapja: string[]): DaeunPeriod[] {
  return daeunAges.map((startAge, index) => {
    const endAge = index < daeunAges.length - 1 ? daeunAges[index + 1] - 1 : startAge + 9;
    const startYear = birthYear + startAge;
    const endYear = birthYear + endAge;
    const gapja = daeunGapja[index];
    return {
      startAge, endAge, startYear, endYear, gapja,
      sky: gapja.charAt(0), earth: gapja.charAt(1),
    };
  });
}

export function findCurrentDaeun(currentAge: number, daeunPeriods: DaeunPeriod[]): DaeunPeriod | null {
  return daeunPeriods.find(p => currentAge >= p.startAge && currentAge <= p.endAge) || null;
}

/**
 * 완전한 대운 정보 계산 (정밀법, async)
 * @param sajuData record (birthHour/birthTime 필요)
 * @param birthHour 출생 시 (0-23), 모르면 12
 * @param birthMinute 출생 분, 기본 0
 */
export async function calculateCompleteDaeun(
  sajuData: any,
  birthHour: number = 12,
  birthMinute: number = 0
) {
  const actualGanjiYear = calculateActualGanjiYear(sajuData.birthYear, sajuData.yearSky, sajuData.yearEarth);

  if (!sajuData.gender || !sajuData.yearSky) {
    console.warn('calculateCompleteDaeun: 필수 데이터 없음');
    const defaultAges = [7, 17, 27, 37, 47, 57, 67, 77, 87, 97];
    const defaultGapja = ['戊寅','己卯','庚辰','辛巳','壬午','癸未','甲申','乙酉','丙戌','丁亥'];
    return {
      isForward: true,
      daeunNumber: 7,
      daeunGapja: defaultGapja,
      daeunAges: defaultAges,
      daeunPeriods: calculateDaeunPeriods(actualGanjiYear, defaultAges, defaultGapja),
      direction: '순행',
    };
  }

  const isForward = isDaeunForward(sajuData.gender, sajuData.yearSky);
  const daeunGapja = generateDaeunGapja(sajuData.monthSky, sajuData.monthEarth, isForward);

  const daeunNumber = await calculateDaeunNumberPrecise(
    sajuData.birthYear,
    sajuData.birthMonth,
    sajuData.birthDay,
    birthHour,
    birthMinute,
    isForward
  );

  const daeunAges = calculateDaeunAges(daeunNumber);
  const daeunPeriods = calculateDaeunPeriods(actualGanjiYear, daeunAges, daeunGapja);

  console.log(`✅ 대운(정밀): ${isForward ? '순행' : '역행'}, 대운수=${daeunNumber}`);

  return {
    isForward,
    daeunNumber,
    daeunGapja,
    daeunAges,
    daeunPeriods,
    direction: isForward ? '순행' : '역행',
  };
}