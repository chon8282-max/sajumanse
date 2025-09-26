// 대운 계산 로직
// 한국 전통 사주학의 대운 산출 방식 구현

// 60갑자 순서 (천간과 지지의 조합)
const CHEONGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const JIJI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 60갑자 전체 목록 생성
const SIXTY_GAPJA: string[] = [];
for (let i = 0; i < 60; i++) {
  const cheongan = CHEONGAN[i % 10];
  const jiji = JIJI[i % 12];
  SIXTY_GAPJA.push(cheongan + jiji);
}

// 양년(陽年) 천간: 甲丙戊庚壬
const YANG_YEARS = ['甲', '丙', '戊', '庚', '壬'];

// 음년(陰年) 천간: 乙丁己辛癸  
const YIN_YEARS = ['乙', '丁', '己', '辛', '癸'];

/**
 * 년간이 양년인지 음년인지 판단
 * @param yearSky 년간
 * @returns true if 양년, false if 음년
 */
function isYangYear(yearSky: string): boolean {
  return YANG_YEARS.includes(yearSky);
}

/**
 * 대운 순행/역행 판단
 * @param gender 성별 ('남자' | '여자')
 * @param yearSky 년간
 * @returns true if 순행, false if 역행
 */
export function isDaeunForward(gender: string, yearSky: string): boolean {
  const isYang = isYangYear(yearSky);
  
  if (gender === '남자') {
    // 양년 남자 = 순행, 음년 남자 = 역행
    return isYang;
  } else {
    // 양년 여자 = 역행, 음년 여자 = 순행
    return !isYang;
  }
}

/**
 * 월주를 기준으로 대운 간지 10개 생성
 * @param monthSky 월간
 * @param monthEarth 월지  
 * @param isForward 순행 여부
 * @returns 대운 간지 배열 (10개)
 */
export function generateDaeunGapja(monthSky: string, monthEarth: string, isForward: boolean): string[] {
  const monthGapja = monthSky + monthEarth;
  const currentIndex = SIXTY_GAPJA.indexOf(monthGapja);
  
  if (currentIndex === -1) {
    throw new Error(`Invalid month gapja: ${monthGapja}`);
  }
  
  const daeunList: string[] = [];
  
  for (let i = 1; i <= 10; i++) {
    let targetIndex;
    
    if (isForward) {
      // 순행: 다음 간지들
      targetIndex = (currentIndex + i) % 60;
    } else {
      // 역행: 이전 간지들  
      targetIndex = (currentIndex - i + 60) % 60;
    }
    
    daeunList.push(SIXTY_GAPJA[targetIndex]);
  }
  
  return daeunList;
}

/**
 * 절기별 절입일 정보 (대략적)
 * 실제로는 매년 변동되지만 기본값 사용
 */
const SOLAR_TERMS = [
  { name: '입춘', month: 2, day: 4 },
  { name: '경칩', month: 3, day: 6 },
  { name: '청명', month: 4, day: 5 },
  { name: '입하', month: 5, day: 6 },
  { name: '망종', month: 6, day: 6 },
  { name: '소서', month: 7, day: 7 },
  { name: '입추', month: 8, day: 8 },
  { name: '백로', month: 9, day: 8 },
  { name: '한로', month: 10, day: 8 },
  { name: '입동', month: 11, day: 7 },
  { name: '대설', month: 12, day: 7 },
  { name: '소한', month: 1, day: 6 }
];

/**
 * 대운수 계산
 * @param birthYear 생년
 * @param birthMonth 생월  
 * @param birthDay 생일
 * @param gender 성별
 * @param yearSky 년간
 * @returns 대운수 (1-10)
 */
export function calculateDaeunNumber(
  birthYear: number,
  birthMonth: number, 
  birthDay: number,
  gender: string,
  yearSky: string
): number {
  const isForward = isDaeunForward(gender, yearSky);
  
  // 해당 월의 절기 찾기
  let solarTerm;
  if (birthMonth === 1) {
    solarTerm = SOLAR_TERMS.find(term => term.month === 1); // 소한
  } else {
    solarTerm = SOLAR_TERMS.find(term => term.month === birthMonth);
  }
  
  if (!solarTerm) {
    // 기본값으로 대운수 3 반환
    return 3;
  }
  
  let daysDiff: number;
  
  if (isForward) {
    // 미래절: 태어난 날부터 다음 절입일까지 남은 일수
    if (birthDay <= solarTerm.day) {
      daysDiff = solarTerm.day - birthDay;
    } else {
      // 다음 달 절기까지
      const nextMonth = birthMonth === 12 ? 1 : birthMonth + 1;
      const nextSolarTerm = SOLAR_TERMS.find(term => term.month === nextMonth);
      if (nextSolarTerm) {
        const daysInMonth = new Date(birthYear, birthMonth, 0).getDate();
        daysDiff = (daysInMonth - birthDay) + nextSolarTerm.day;
      } else {
        daysDiff = 15; // 기본값
      }
    }
  } else {
    // 과거절: 태어난 날로부터 절입일까지 지나온 일수
    if (birthDay >= solarTerm.day) {
      daysDiff = birthDay - solarTerm.day;
    } else {
      // 이전 달 절기부터
      const prevMonth = birthMonth === 1 ? 12 : birthMonth - 1;
      const prevSolarTerm = SOLAR_TERMS.find(term => term.month === prevMonth);
      if (prevSolarTerm) {
        const daysInPrevMonth = new Date(birthYear, prevMonth, 0).getDate();
        daysDiff = (daysInPrevMonth - prevSolarTerm.day) + birthDay;
      } else {
        daysDiff = 15; // 기본값
      }
    }
  }
  
  // 대운수 계산: 일수 ÷ 3
  const baseDaeun = Math.floor(daysDiff / 3);
  const remainder = daysDiff % 3;
  
  // 나머지가 2 이상이면 반올림
  const finalDaeun = remainder >= 2 ? baseDaeun + 1 : baseDaeun;
  
  // 1-10 범위로 제한
  return Math.max(1, Math.min(10, finalDaeun));
}

/**
 * 대운 나이 계산 (10년 주기)
 * @param daeunNumber 대운수
 * @returns 대운 나이 배열 (10개)
 */
export function calculateDaeunAges(daeunNumber: number): number[] {
  const ages: number[] = [];
  for (let i = 0; i < 10; i++) {
    ages.push(daeunNumber + (i * 10));
  }
  return ages;
}

/**
 * 완전한 대운 정보 계산
 * @param sajuData 사주 데이터
 * @returns 대운 정보
 */
export function calculateCompleteDaeun(sajuData: any) {
  const isForward = isDaeunForward(sajuData.gender, sajuData.yearSky);
  const daeunGapja = generateDaeunGapja(sajuData.monthSky, sajuData.monthEarth, isForward);
  const daeunNumber = calculateDaeunNumber(
    sajuData.birthYear,
    sajuData.birthMonth, 
    sajuData.birthDay,
    sajuData.gender,
    sajuData.yearSky
  );
  const daeunAges = calculateDaeunAges(daeunNumber);
  
  return {
    isForward,
    daeunNumber,
    daeunGapja,
    daeunAges,
    direction: isForward ? '순행' : '역행'
  };
}