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

// 12절기 날짜 데이터 (월주 계산용, UTC 저장)
// month: 0=축월, 1=인월, 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월, 7=신월, 8=유월, 9=술월, 10=해월, 11=자월
// KST → UTC 변환: -9시간
const TWELVE_SOLAR_TERMS_2024 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(2024, 0, 5, 20, 9)) },     // KST 2024-01-06 05:09
  { term: "입춘", month: 1, date: new Date(Date.UTC(2024, 1, 4, 7, 27)) },     // KST 2024-02-04 16:27
  { term: "경칩", month: 2, date: new Date(Date.UTC(2024, 2, 5, 1, 23)) },     // KST 2024-03-05 10:23
  { term: "청명", month: 3, date: new Date(Date.UTC(2024, 3, 4, 6, 2)) },      // KST 2024-04-04 15:02
  { term: "입하", month: 4, date: new Date(Date.UTC(2024, 4, 4, 23, 10)) },    // KST 2024-05-05 08:10
  { term: "망종", month: 5, date: new Date(Date.UTC(2024, 5, 5, 3, 10)) },     // KST 2024-06-05 12:10
  { term: "소서", month: 6, date: new Date(Date.UTC(2024, 6, 6, 13, 20)) },    // KST 2024-07-06 22:20
  { term: "입추", month: 7, date: new Date(Date.UTC(2024, 7, 7, 0, 11)) },     // KST 2024-08-07 09:11
  { term: "백로", month: 8, date: new Date(Date.UTC(2024, 8, 7, 2, 11)) },     // KST 2024-09-07 11:11
  { term: "한로", month: 9, date: new Date(Date.UTC(2024, 9, 7, 18, 56)) },    // KST 2024-10-08 03:56
  { term: "입동", month: 10, date: new Date(Date.UTC(2024, 10, 7, 3, 20)) },   // KST 2024-11-07 12:20
  { term: "대설", month: 11, date: new Date(Date.UTC(2024, 11, 6, 15, 17)) },  // KST 2024-12-07 00:17
];

// 1963년 12절기 정확한 시각 (사용자 제공, UTC 저장)
// month: 0=축월, 1=인월, 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월, 7=신월, 8=유월, 9=술월, 10=해월, 11=자월
// KST → UTC 변환: -9시간
const TWELVE_SOLAR_TERMS_1963 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(1963, 0, 6, 2, 0)) },    // KST 1963-01-06 11:00
  { term: "입춘", month: 1, date: new Date(Date.UTC(1963, 1, 4, 13, 8)) },   // KST 1963-02-04 22:08
  { term: "경칩", month: 2, date: new Date(Date.UTC(1963, 2, 6, 7, 0)) },    // KST 1963-03-06 16:00
  { term: "청명", month: 3, date: new Date(Date.UTC(1963, 3, 5, 12, 0)) },   // KST 1963-04-05 21:00
  { term: "입하", month: 4, date: new Date(Date.UTC(1963, 4, 6, 5, 0)) },    // KST 1963-05-06 14:00
  { term: "망종", month: 5, date: new Date(Date.UTC(1963, 5, 6, 9, 0)) },    // KST 1963-06-06 18:00
  { term: "소서", month: 6, date: new Date(Date.UTC(1963, 6, 7, 19, 0)) },   // KST 1963-07-08 04:00
  { term: "입추", month: 7, date: new Date(Date.UTC(1963, 7, 8, 6, 0)) },    // KST 1963-08-08 15:00
  { term: "백로", month: 8, date: new Date(Date.UTC(1963, 8, 8, 8, 0)) },    // KST 1963-09-08 17:00
  { term: "한로", month: 9, date: new Date(Date.UTC(1963, 9, 9, 0, 0)) },    // KST 1963-10-09 09:00
  { term: "입동", month: 10, date: new Date(Date.UTC(1963, 10, 8, 3, 0)) },  // KST 1963-11-08 12:00
  { term: "대설", month: 11, date: new Date(Date.UTC(1963, 11, 7, 20, 0)) }, // KST 1963-12-08 05:00
];

// 1965년 12절기 정확한 시각 (KASI DB 기반, UTC 저장)
// month: 0=축월, 1=인월, 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월, 7=신월, 8=유월, 9=술월, 10=해월, 11=자월
// KST → UTC 변환: -9시간
const TWELVE_SOLAR_TERMS_1965 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(1965, 0, 5, 13, 2)) },   // KST 1965-01-05 22:02
  { term: "입춘", month: 1, date: new Date(Date.UTC(1965, 1, 4, 0, 46)) },   // KST 1965-02-04 09:46
  { term: "경칩", month: 2, date: new Date(Date.UTC(1965, 2, 5, 19, 1)) },   // KST 1965-03-06 04:01
  { term: "청명", month: 3, date: new Date(Date.UTC(1965, 3, 5, 0, 7)) },    // KST 1965-04-05 09:07
  { term: "입하", month: 4, date: new Date(Date.UTC(1965, 4, 5, 17, 42)) },  // KST 1965-05-06 02:42
  { term: "망종", month: 5, date: new Date(Date.UTC(1965, 5, 5, 22, 2)) },   // KST 1965-06-06 07:02
  { term: "소서", month: 6, date: new Date(Date.UTC(1965, 6, 7, 8, 21)) },   // KST 1965-07-07 17:21
  { term: "입추", month: 7, date: new Date(Date.UTC(1965, 7, 7, 18, 5)) },   // KST 1965-08-08 03:05
  { term: "백로", month: 8, date: new Date(Date.UTC(1965, 8, 7, 20, 48)) },  // KST 1965-09-08 05:48
  { term: "한로", month: 9, date: new Date(Date.UTC(1965, 9, 8, 12, 11)) },  // KST 1965-10-08 21:11
  { term: "입동", month: 10, date: new Date(Date.UTC(1965, 10, 7, 15, 7)) }, // KST 1965-11-08 00:07
  { term: "대설", month: 11, date: new Date(Date.UTC(1965, 11, 7, 7, 46)) }, // KST 1965-12-07 16:46
];

// 1949년 12절기 정확한 시각 (KASI DB 기반, UTC 저장)
// month: 0=축월, 1=인월, 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월, 7=신월, 8=유월, 9=술월, 10=해월, 11=자월
// KST → UTC 변환: -9시간 (예: KST 12:23 → UTC 03:23)
const TWELVE_SOLAR_TERMS_1949 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(1949, 0, 5, 15, 41)) },  // KST 1949-01-06 00:41
  { term: "입춘", month: 1, date: new Date(Date.UTC(1949, 1, 4, 3, 23)) },   // KST 1949-02-04 12:23
  { term: "경칩", month: 2, date: new Date(Date.UTC(1949, 2, 5, 21, 39)) },  // KST 1949-03-06 06:39
  { term: "청명", month: 3, date: new Date(Date.UTC(1949, 3, 5, 2, 52)) },   // KST 1949-04-05 11:52
  { term: "입하", month: 4, date: new Date(Date.UTC(1949, 4, 5, 20, 37)) },  // KST 1949-05-06 05:37
  { term: "망종", month: 5, date: new Date(Date.UTC(1949, 5, 6, 1, 7)) },    // KST 1949-06-06 10:07
  { term: "소서", month: 6, date: new Date(Date.UTC(1949, 6, 7, 11, 32)) },  // KST 1949-07-07 20:32
  { term: "입추", month: 7, date: new Date(Date.UTC(1949, 7, 7, 21, 15)) },  // KST 1949-08-08 06:15
  { term: "백로", month: 8, date: new Date(Date.UTC(1949, 8, 7, 23, 54)) },  // KST 1949-09-08 08:54
  { term: "한로", month: 9, date: new Date(Date.UTC(1949, 9, 8, 15, 11)) },  // KST 1949-10-09 00:11
  { term: "입동", month: 10, date: new Date(Date.UTC(1949, 10, 7, 18, 0)) }, // KST 1949-11-08 03:00
  { term: "대설", month: 11, date: new Date(Date.UTC(1949, 11, 7, 10, 33)) },// KST 1949-12-07 19:33
];

// 1950년 12절기 정확한 시각 (bebeyam.com 기반, UTC 저장)
// month: 0=축월, 1=인월, 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월, 7=신월, 8=유월, 9=술월, 10=해월, 11=자월
// KST → UTC 변환: -9시간
const TWELVE_SOLAR_TERMS_1950 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(1950, 0, 5, 20, 30)) },  // KST 1950-01-06 05:30
  { term: "입춘", month: 1, date: new Date(Date.UTC(1950, 1, 4, 9, 22)) },   // KST 1950-02-04 18:22
  { term: "경칩", month: 2, date: new Date(Date.UTC(1950, 2, 6, 2, 0)) },    // KST 1950-03-06 11:00
  { term: "청명", month: 3, date: new Date(Date.UTC(1950, 3, 5, 7, 0)) },    // KST 1950-04-05 16:00
  { term: "입하", month: 4, date: new Date(Date.UTC(1950, 4, 6, 0, 0)) },    // KST 1950-05-06 09:00
  { term: "망종", month: 5, date: new Date(Date.UTC(1950, 5, 6, 4, 0)) },    // KST 1950-06-06 13:00
  { term: "소서", month: 6, date: new Date(Date.UTC(1950, 6, 7, 14, 0)) },   // KST 1950-07-07 23:00
  { term: "입추", month: 7, date: new Date(Date.UTC(1950, 7, 8, 1, 0)) },    // KST 1950-08-08 10:00
  { term: "백로", month: 8, date: new Date(Date.UTC(1950, 8, 8, 3, 0)) },    // KST 1950-09-08 12:00
  { term: "한로", month: 9, date: new Date(Date.UTC(1950, 9, 8, 19, 0)) },   // KST 1950-10-09 04:00
  { term: "입동", month: 10, date: new Date(Date.UTC(1950, 10, 7, 22, 0)) }, // KST 1950-11-08 07:00
  { term: "대설", month: 11, date: new Date(Date.UTC(1950, 11, 7, 15, 0)) }, // KST 1950-12-08 00:00
];

// 2025년 12절기 정확한 시각 (DB 기반, UTC 저장)
// month: 0=축월, 1=인월, 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월, 7=신월, 8=유월, 9=술월, 10=해월, 11=자월
// KST → UTC 변환: -9시간
const TWELVE_SOLAR_TERMS_2025 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(2025, 0, 5, 2, 33)) },    // KST 2025-01-05 11:33
  { term: "입춘", month: 1, date: new Date(Date.UTC(2025, 1, 3, 14, 10)) },   // KST 2025-02-03 23:10
  { term: "경칩", month: 2, date: new Date(Date.UTC(2025, 2, 5, 8, 7)) },     // KST 2025-03-05 17:07
  { term: "청명", month: 3, date: new Date(Date.UTC(2025, 3, 4, 12, 49)) },   // KST 2025-04-04 21:49
  { term: "입하", month: 4, date: new Date(Date.UTC(2025, 4, 5, 5, 57)) },    // KST 2025-05-05 14:57
  { term: "망종", month: 5, date: new Date(Date.UTC(2025, 5, 5, 9, 57)) },    // KST 2025-06-05 18:57
  { term: "소서", month: 6, date: new Date(Date.UTC(2025, 6, 6, 20, 5)) },    // KST 2025-07-07 05:05
  { term: "입추", month: 7, date: new Date(Date.UTC(2025, 7, 7, 5, 52)) },    // KST 2025-08-07 14:52
  { term: "백로", month: 8, date: new Date(Date.UTC(2025, 8, 7, 8, 52)) },    // KST 2025-09-07 17:52
  { term: "한로", month: 9, date: new Date(Date.UTC(2025, 9, 8, 0, 41)) },    // KST 2025-10-08 09:41
  { term: "입동", month: 10, date: new Date(Date.UTC(2025, 10, 7, 4, 4)) },   // KST 2025-11-07 13:04
  { term: "대설", month: 11, date: new Date(Date.UTC(2025, 11, 6, 21, 5)) },  // KST 2025-12-07 06:05
];

// 24절기 날짜 데이터 (입춘 기준일, UTC 저장)
// KST → UTC 변환: -9시간
const SOLAR_TERMS_LICHUN = [
  { year: 1963, date: new Date(Date.UTC(1963, 1, 4, 13, 8)) },    // KST 1963-02-04 22:08
  { year: 1988, date: new Date(Date.UTC(1988, 1, 4, 14, 43)) },   // KST 1988-02-04 23:43
  { year: 2020, date: new Date(Date.UTC(2020, 1, 3, 15, 0)) },    // KST 2020-02-04 00:00 (근사)
  { year: 2021, date: new Date(Date.UTC(2021, 1, 2, 15, 0)) },    // KST 2021-02-03 00:00 (근사)
  { year: 2022, date: new Date(Date.UTC(2022, 1, 3, 15, 0)) },    // KST 2022-02-04 00:00 (근사)
  { year: 2023, date: new Date(Date.UTC(2023, 1, 3, 15, 0)) },    // KST 2023-02-04 00:00 (근사)
  { year: 2024, date: new Date(Date.UTC(2024, 1, 4, 7, 27)) },    // KST 2024-02-04 16:27
  { year: 2025, date: new Date(Date.UTC(2025, 1, 3, 14, 10)) },   // KST 2025-02-03 23:10
];

/**
 * 해당 년도의 입춘일 구하기 (근사치)
 */
function getLichunDate(year: number): Date {
  const found = SOLAR_TERMS_LICHUN.find(st => st.year === year);
  if (found) return found.date;
  
  // 기본값으로 2월 4일 00:00 KST 사용 (UTC로 저장: -9시간)
  // KST 00:00 → UTC 15:00 (전날)
  return new Date(Date.UTC(year, 1, 3, 15, 0));
}

/**
 * 12절기 기준으로 사주 월 계산
 * @param date 계산할 날짜 (시/분 포함)
 * @param solarTerms DB에서 가져온 절기 데이터 (서버에서만 사용)
 * @returns 사주 월 (0:축월, 1:인월, 2:묘월..., 11:자월)
 */
function calculateSajuMonth(date: Date, solarTerms?: Array<{ name: string; date: Date; month: number }>): number {
  const year = date.getFullYear();
  
  // DB 절기 데이터가 있으면 우선 사용 (서버에서만 전달됨)
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
  
  // DB 데이터가 없으면 기존 방식 사용 (클라이언트 또는 fallback)
  console.log(`⚠ DB 절기 없음, 하드코딩된 절기 사용 (fallback)`);
  
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

// 1988년 12절기 정확한 시각 (DB 기반, UTC 저장)
// KST → UTC 변환: -9시간
const TWELVE_SOLAR_TERMS_1988 = [
  { term: "소한", month: 0, date: new Date(Date.UTC(1988, 0, 6, 3, 4)) },     // KST 1988-01-06 12:04
  { term: "입춘", month: 1, date: new Date(Date.UTC(1988, 1, 4, 14, 43)) },   // KST 1988-02-04 23:43
  { term: "경칩", month: 2, date: new Date(Date.UTC(1988, 2, 5, 8, 47)) },    // KST 1988-03-05 17:47
  { term: "청명", month: 3, date: new Date(Date.UTC(1988, 3, 4, 13, 39)) },   // KST 1988-04-04 22:39
  { term: "입하", month: 4, date: new Date(Date.UTC(1988, 4, 5, 7, 2)) },     // KST 1988-05-05 16:02
  { term: "망종", month: 5, date: new Date(Date.UTC(1988, 5, 5, 11, 15)) },   // KST 1988-06-05 20:15
  { term: "소서", month: 6, date: new Date(Date.UTC(1988, 6, 6, 21, 33)) },   // KST 1988-07-07 06:33
  { term: "입추", month: 7, date: new Date(Date.UTC(1988, 7, 7, 7, 20)) },    // KST 1988-08-07 16:20
  { term: "백로", month: 8, date: new Date(Date.UTC(1988, 8, 7, 10, 12)) },   // KST 1988-09-07 19:12
  { term: "한로", month: 9, date: new Date(Date.UTC(1988, 9, 8, 1, 44)) },    // KST 1988-10-08 10:44
  { term: "입동", month: 10, date: new Date(Date.UTC(1988, 10, 7, 4, 49)) },  // KST 1988-11-07 13:49
  { term: "대설", month: 11, date: new Date(Date.UTC(1988, 11, 6, 21, 34)) }, // KST 1988-12-07 06:34
];

/**
 * 특정 년도의 12절기 날짜들을 생성
 * @param year 대상 년도
 * @returns 해당 년도의 12절기 날짜 배열
 */
function generateSolarTermsForYear(year: number): Array<{ term: string; month: number; date: Date }> {
  // 1949년은 정확한 KASI DB 데이터 사용
  if (year === 1949) {
    return TWELVE_SOLAR_TERMS_1949;
  }
  
  // 1950년은 정확한 데이터 사용 (bebeyam.com 기반)
  if (year === 1950) {
    return TWELVE_SOLAR_TERMS_1950;
  }
  
  // 1963년은 정확한 데이터 사용 (사용자 제공)
  if (year === 1963) {
    return TWELVE_SOLAR_TERMS_1963;
  }
  
  // 1965년은 정확한 KASI DB 데이터 사용
  if (year === 1965) {
    return TWELVE_SOLAR_TERMS_1965;
  }
  
  // 1988년은 정확한 DB 데이터 사용
  if (year === 1988) {
    return TWELVE_SOLAR_TERMS_1988;
  }
  
  // 2024년은 정확한 데이터 사용
  if (year === 2024) {
    return TWELVE_SOLAR_TERMS_2024;
  }
  
  // 2025년은 정확한 DB 데이터 사용
  if (year === 2025) {
    return TWELVE_SOLAR_TERMS_2025;
  }
  
  // 2024년 데이터를 기준으로 근사치 생성
  const baseYear = 2024;
  const yearDiff = year - baseYear;
  
  // 월별 절기 근사치 (month: 0=축월~11=자월)
  const solarTermsTemplate = [
    { term: "소한", month: 0, baseMonth: 0, baseDay: 6 },   // 1월 6일
    { term: "입춘", month: 1, baseMonth: 1, baseDay: 4 },   // 2월 4일
    { term: "경칩", month: 2, baseMonth: 2, baseDay: 5 },   // 3월 5일
    { term: "청명", month: 3, baseMonth: 3, baseDay: 4 },   // 4월 4일
    { term: "입하", month: 4, baseMonth: 4, baseDay: 5 },   // 5월 5일
    { term: "망종", month: 5, baseMonth: 5, baseDay: 5 },   // 6월 5일
    { term: "소서", month: 6, baseMonth: 6, baseDay: 7 },   // 7월 7일
    { term: "입추", month: 7, baseMonth: 7, baseDay: 7 },   // 8월 7일
    { term: "백로", month: 8, baseMonth: 8, baseDay: 7 },   // 9월 7일
    { term: "한로", month: 9, baseMonth: 9, baseDay: 8 },   // 10월 8일
    { term: "입동", month: 10, baseMonth: 10, baseDay: 7 }, // 11월 7일
    { term: "대설", month: 11, baseMonth: 11, baseDay: 7 }, // 12월 7일
  ];
  
  return solarTermsTemplate.map(template => {
    // 연도별 변동 근사치 (4년에 하루씩 변동)
    const dayOffset = Math.floor(yearDiff / 4);
    const adjustedDay = template.baseDay + dayOffset;
    
    return {
      term: template.term,
      month: template.month,
      // UTC 저장: KST 12:00 → UTC 03:00
      date: new Date(Date.UTC(year, template.baseMonth, adjustedDay, 3, 0))
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
  
  // 입춘 기준으로 년도 조정 (이중 조정 방지)
  let baseYear = solarDate ? solarDate.solarYear : year;
  const lichunDate = getLichunDate(baseYear);
  let sajuYear = year; // 년주는 음력 년도 기준
  let isLichunAdjusted = false; // 입춘 조정 여부 추적
  
  // 음력 변환 시 년도가 바뀐 경우 이미 조정된 것으로 간주
  if (year !== baseYear) {
    isLichunAdjusted = true;
  }
  
  // 입춘 조정: 음력 변환이 이미 된 경우 추가 조정하지 않음
  // 시간까지 포함하여 정확한 비교
  const checkDate = solarDate 
    ? new Date(solarDate.solarYear, solarDate.solarMonth - 1, solarDate.solarDay, hour || 12, minute || 0)
    : calcDate;
  // 음력 변환이 이미 되어 year가 baseYear와 다르면 이미 조정된 것으로 간주
  if (checkDate < lichunDate && year === baseYear) {
    sajuYear = year - 1;
    isLichunAdjusted = true;
  } else {
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