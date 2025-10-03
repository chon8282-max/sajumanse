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

// 괴강살 간지 목록 (庚戌, 庚辰, 壬辰, 戊戌, 壬戌)
const GOEGANG_SAL_GANJI = ["庚戌", "庚辰", "壬辰", "戊戌", "壬戌"];

// 백호대살 간지 목록 (甲辰, 乙未, 丙戌, 戊辰, 丁丑, 壬戌, 癸丑)
const BAEKHO_DAESAL_GANJI = ["甲辰", "乙未", "丙戌", "戊辰", "丁丑", "壬戌", "癸丑"];

// 양인살 매핑 테이블 (일간 → 양인살 지지)
const YANGIN_SAL_MAP: Record<string, string> = {
  "甲": "卯",
  "丙": "午",
  "戊": "午",
  "庚": "酉",
  "壬": "子"
};

// 낙정관살 매핑 테이블 (일간 → 낙정관살 지지)
const NAKJEONG_GWANSAL_MAP: Record<string, string> = {
  "甲": "巳",
  "己": "巳",
  "乙": "子",
  "庚": "子",
  "丙": "申",
  "辛": "申",
  "丁": "戌",
  "壬": "戌",
  "戊": "卯",
  "癸": "卯"
};

// 효신살 간지 목록 (甲子, 乙亥, 丙寅, 丁卯, 戊午, 己巳, 庚辰, 庚戌, 辛丑, 辛未, 壬申, 癸酉)
const HYOSIN_SAL_GANJI = ["甲子", "乙亥", "丙寅", "丁卯", "戊午", "己巳", "庚辰", "庚戌", "辛丑", "辛未", "壬申", "癸酉"];

// 수액살 매핑 테이블 (월지 → 수액살 지지)
const SUAEK_SAL_MAP: Record<string, string> = {
  "寅": "寅", "卯": "寅", "辰": "寅",  // 인묘진 월생 = 인
  "巳": "辰", "午": "辰", "未": "辰",  // 사오미 월생 = 진
  "申": "酉", "酉": "酉", "戌": "酉",  // 신유술 월생 = 유
  "亥": "丑", "子": "丑", "丑": "丑"   // 해자축 월생 = 축
};

// 이별살 간지 목록 (갑인, 을묘, 을미, 병오, 무진, 무신, 무술, 기축, 경신, 신유, 임자)
const IBYEOL_SAL_GANJI = ["甲寅", "乙卯", "乙未", "丙午", "戊辰", "戊申", "戊戌", "己丑", "庚申", "辛酉", "壬子"];

// 농아살 매핑 테이블 (년지 → 농아살 시지)
const NONGA_SAL_MAP: Record<string, string> = {
  "寅": "卯", "午": "卯", "戌": "卯",  // 인오술 년생 = 묘시
  "申": "酉", "子": "酉", "辰": "酉",  // 신자진 년생 = 유시
  "亥": "子", "卯": "子", "未": "子",  // 해묘미 년생 = 자시
  "巳": "午", "酉": "午", "丑": "午"   // 사유축 년생 = 오시
};

// 고란살 간지 목록 (갑인, 을사, 정사, 무신, 신해)
const GORAN_SAL_GANJI = ["甲寅", "乙巳", "丁巳", "戊申", "辛亥"];

// 홍염살 매핑 테이블 (일간 → 홍염살 지지)
const HONGYEOM_SAL_MAP: Record<string, string[]> = {
  "甲": ["午"],
  "丙": ["午"],
  "丁": ["未"],
  "戊": ["辰"],
  "庚": ["申", "戌"],
  "辛": ["酉"],
  "壬": ["子"]
};

// 부벽살 매핑 테이블 (월지 → 부벽살 지지)
const BUBYEOK_SAL_MAP: Record<string, string> = {
  "子": "亥", "午": "亥", "卯": "亥", "酉": "亥",  // 자오묘유 월지 = 해
  "寅": "酉", "申": "酉", "巳": "酉", "亥": "酉",  // 인신사해 월지 = 유
  "辰": "丑", "戌": "丑", "丑": "丑", "未": "丑"   // 진술축미 월지 = 축
};

// 정록 매핑 테이블 (일간 → 정록 지지)
const JEONGROK_MAP: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
  "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子"
};

// 암록 매핑 테이블 (일간 → 암록 지지)
const AMROK_MAP: Record<string, string> = {
  "甲": "亥", "乙": "戌", "丙": "申", "丁": "午", "戊": "申",
  "己": "午", "庚": "巳", "辛": "辰", "壬": "寅", "癸": "丑"
};

// 문곡귀인 매핑 테이블 (일간 → 문곡귀인 지지)
const MUNGOK_GWIIN_MAP: Record<string, string> = {
  "甲": "亥", "乙": "子", "丙": "寅", "丁": "卯", "戊": "寅",
  "己": "卯", "庚": "巳", "辛": "午", "壬": "申", "癸": "酉"
};

// 학당귀인 매핑 테이블 (일간 → 학당귀인 지지)
const HAKDANG_GWIIN_MAP: Record<string, string> = {
  "甲": "亥", "乙": "午", "丙": "寅", "丁": "酉", "戊": "寅",
  "己": "酉", "庚": "巳", "辛": "子", "壬": "申", "癸": "卯"
};

// 금여성 매핑 테이블 (일간 → 금여성 지지)
const GEUMYEO_SEONG_MAP: Record<string, string> = {
  "甲": "辰", "乙": "巳", "丙": "未", "丁": "申", "戊": "未",
  "己": "申", "庚": "戌", "辛": "亥", "壬": "丑", "癸": "寅"
};

// 천주귀인 매핑 테이블 (일간 → 천주귀인 지지)
const CHEONJU_GWIIN_MAP: Record<string, string> = {
  "甲": "巳", "乙": "午", "丙": "巳", "丁": "午", "戊": "申",
  "己": "酉", "庚": "亥", "辛": "子", "壬": "寅", "癸": "卯"
};

// 관귀학관 매핑 테이블 (일간 → 관귀학관 지지)
const GWANGWI_HAKGWAN_MAP: Record<string, string> = {
  "甲": "巳", "乙": "巳", "丙": "申", "丁": "申", "戊": "亥",
  "己": "亥", "庚": "寅", "辛": "寅", "壬": "寅", "癸": "寅"
};

// 태극귀인 매핑 테이블 (일간 → 태극귀인 년지 목록)
const TAEKEUK_GWIIN_MAP: Record<string, string[]> = {
  "甲": ["子", "午"], "乙": ["子", "午"],
  "丙": ["酉", "寅"], "丁": ["酉", "寅"],
  "戊": ["辰", "戌", "丑", "未"], "己": ["辰", "戌", "丑", "未"],
  "庚": ["寅", "卯"], "辛": ["寅", "卯"],
  "壬": ["寅", "卯"], "癸": ["寅", "卯"]
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
    result.yearPillar.push("天德貴人");
  }
  if (allSkies[1] === cheondeokTarget || allEarths[1] === cheondeokTarget) {
    result.monthPillar.push("天德貴人");
  }
  if (allSkies[2] === cheondeokTarget || allEarths[2] === cheondeokTarget) {
    result.dayPillar.push("天德貴人");
  }
  if (allSkies[3] === cheondeokTarget || allEarths[3] === cheondeokTarget) {
    result.hourPillar.push("天德貴人");
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
    result.yearPillar.push("月德貴人");
  }
  if (monthSky === woldeokTarget) {
    result.monthPillar.push("月德貴人");
  }
  if (daySky === woldeokTarget) {
    result.dayPillar.push("月德貴人");
  }
  if (hourSky === woldeokTarget) {
    result.hourPillar.push("月德貴人");
  }

  return result;
}

/**
 * 괴강살(魁罡煞) 계산
 * 년월일시 어느 주든 庚戌, 庚辰, 壬辰, 戊戌, 壬戌 간지가 있을 때
 */
export function calculateGoegangSal(
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

  const yearGanji = yearSky + yearEarth;
  const monthGanji = monthSky + monthEarth;
  const dayGanji = daySky + dayEarth;
  const hourGanji = hourSky + hourEarth;

  if (GOEGANG_SAL_GANJI.includes(yearGanji)) {
    result.yearPillar.push("魁罡煞");
  }
  if (GOEGANG_SAL_GANJI.includes(monthGanji)) {
    result.monthPillar.push("魁罡煞");
  }
  if (GOEGANG_SAL_GANJI.includes(dayGanji)) {
    result.dayPillar.push("魁罡煞");
  }
  if (GOEGANG_SAL_GANJI.includes(hourGanji)) {
    result.hourPillar.push("魁罡煞");
  }

  return result;
}

/**
 * 백호대살(白虎大煞) 계산
 * 년월일시 어느 주든 甲辰, 乙未, 丙戌, 戊辰, 丁丑, 壬戌, 癸丑 간지가 있을 때
 */
export function calculateBaekhoDaesal(
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

  const yearGanji = yearSky + yearEarth;
  const monthGanji = monthSky + monthEarth;
  const dayGanji = daySky + dayEarth;
  const hourGanji = hourSky + hourEarth;

  if (BAEKHO_DAESAL_GANJI.includes(yearGanji)) {
    result.yearPillar.push("白虎大煞");
  }
  if (BAEKHO_DAESAL_GANJI.includes(monthGanji)) {
    result.monthPillar.push("白虎大煞");
  }
  if (BAEKHO_DAESAL_GANJI.includes(dayGanji)) {
    result.dayPillar.push("白虎大煞");
  }
  if (BAEKHO_DAESAL_GANJI.includes(hourGanji)) {
    result.hourPillar.push("白虎大煞");
  }

  return result;
}

/**
 * 양인살(羊刃煞) 계산
 * 일간을 기준으로 년월일시의 지지에서 양인살을 찾습니다.
 */
export function calculateYanginSal(
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

  // 일간에 해당하는 양인살 지지 찾기
  const yanginTarget = YANGIN_SAL_MAP[daySky];
  if (!yanginTarget) return result;

  // 각 주의 지지에서 양인살에 해당하는지 확인
  if (yearEarth === yanginTarget) {
    result.yearPillar.push("羊刃煞");
  }
  if (monthEarth === yanginTarget) {
    result.monthPillar.push("羊刃煞");
  }
  if (dayEarth === yanginTarget) {
    result.dayPillar.push("羊刃煞");
  }
  if (hourEarth === yanginTarget) {
    result.hourPillar.push("羊刃煞");
  }

  return result;
}

/**
 * 낙정관살(落井關殺) 계산
 * 일간을 기준으로 년월일시의 지지에서 낙정관살을 찾습니다.
 */
export function calculateNakjeongGwansal(
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

  // 일간에 해당하는 낙정관살 지지 찾기
  const nakjeongTarget = NAKJEONG_GWANSAL_MAP[daySky];
  if (!nakjeongTarget) return result;

  // 각 주의 지지에서 낙정관살에 해당하는지 확인
  if (yearEarth === nakjeongTarget) {
    result.yearPillar.push("落井關殺");
  }
  if (monthEarth === nakjeongTarget) {
    result.monthPillar.push("落井關殺");
  }
  if (dayEarth === nakjeongTarget) {
    result.dayPillar.push("落井關殺");
  }
  if (hourEarth === nakjeongTarget) {
    result.hourPillar.push("落井關殺");
  }

  return result;
}

/**
 * 효신살(梟神殺) 계산
 * 년월일시 어느 주든 특정 일주 간지가 있을 때
 */
export function calculateHyosinSal(
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

  const yearGanji = yearSky + yearEarth;
  const monthGanji = monthSky + monthEarth;
  const dayGanji = daySky + dayEarth;
  const hourGanji = hourSky + hourEarth;

  if (HYOSIN_SAL_GANJI.includes(yearGanji)) {
    result.yearPillar.push("梟神殺");
  }
  if (HYOSIN_SAL_GANJI.includes(monthGanji)) {
    result.monthPillar.push("梟神殺");
  }
  if (HYOSIN_SAL_GANJI.includes(dayGanji)) {
    result.dayPillar.push("梟神殺");
  }
  if (HYOSIN_SAL_GANJI.includes(hourGanji)) {
    result.hourPillar.push("梟神殺");
  }

  return result;
}

/**
 * 수액살(水厄殺) 계산
 * 월지를 기준으로 수액살을 찾습니다
 */
export function calculateSuaekSal(
  monthEarth: string,
  yearEarth: string,
  dayEarth: string,
  hourEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  const suaekTarget = SUAEK_SAL_MAP[monthEarth];
  if (!suaekTarget) return result;

  // 각 주의 지지에서 수액살에 해당하는지 확인
  if (yearEarth === suaekTarget) {
    result.yearPillar.push("水厄殺");
  }
  if (monthEarth === suaekTarget) {
    result.monthPillar.push("水厄殺");
  }
  if (dayEarth === suaekTarget) {
    result.dayPillar.push("水厄殺");
  }
  if (hourEarth === suaekTarget) {
    result.hourPillar.push("水厄殺");
  }

  return result;
}

/**
 * 이별살(離別殺) 계산
 * 일주 간지를 확인합니다
 */
export function calculateIbyeolSal(
  daySky: string,
  dayEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  const dayGanji = daySky + dayEarth;
  if (IBYEOL_SAL_GANJI.includes(dayGanji)) {
    result.dayPillar.push("離別殺");
  }

  return result;
}

/**
 * 농아살(聾兒殺) 계산
 * 년지를 기준으로 시지를 확인합니다
 */
export function calculateNongaSal(
  yearEarth: string,
  hourEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  const nongaTarget = NONGA_SAL_MAP[yearEarth];
  if (!nongaTarget) return result;

  // 시지가 농아살에 해당하는지 확인
  if (hourEarth === nongaTarget) {
    result.hourPillar.push("聾兒殺");
  }

  return result;
}

/**
 * 고란살(孤鸞殺) 계산
 * 일주 간지를 확인합니다
 */
export function calculateGoranSal(
  daySky: string,
  dayEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  const dayGanji = daySky + dayEarth;
  if (GORAN_SAL_GANJI.includes(dayGanji)) {
    result.dayPillar.push("孤鸞殺");
  }

  return result;
}

/**
 * 홍염살(紅艶殺) 계산
 * 일간을 기준으로 년월일시의 지지에서 홍염살을 찾습니다
 */
export function calculateHongyeomSal(
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

  const hongyeomTargets = HONGYEOM_SAL_MAP[daySky];
  if (!hongyeomTargets) return result;

  // 각 주의 지지에서 홍염살에 해당하는지 확인
  if (hongyeomTargets.includes(yearEarth)) {
    result.yearPillar.push("紅艶殺");
  }
  if (hongyeomTargets.includes(monthEarth)) {
    result.monthPillar.push("紅艶殺");
  }
  if (hongyeomTargets.includes(dayEarth)) {
    result.dayPillar.push("紅艶殺");
  }
  if (hongyeomTargets.includes(hourEarth)) {
    result.hourPillar.push("紅艶殺");
  }

  return result;
}

/**
 * 부벽살(釜劈殺) 계산
 * 월지를 기준으로 부벽살을 찾습니다
 */
export function calculateBubyeokSal(
  monthEarth: string,
  yearEarth: string,
  dayEarth: string,
  hourEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  const bubyeokTarget = BUBYEOK_SAL_MAP[monthEarth];
  if (!bubyeokTarget) return result;

  // 각 주의 지지에서 부벽살에 해당하는지 확인
  if (yearEarth === bubyeokTarget) {
    result.yearPillar.push("釜劈殺");
  }
  if (monthEarth === bubyeokTarget) {
    result.monthPillar.push("釜劈殺");
  }
  if (dayEarth === bubyeokTarget) {
    result.dayPillar.push("釜劈殺");
  }
  if (hourEarth === bubyeokTarget) {
    result.hourPillar.push("釜劈殺");
  }

  return result;
}

/**
 * 정록(正祿) 계산
 * 일간을 기준으로 정록 지지를 찾습니다
 */
export function calculateJeongrok(
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

  const jeongrokTarget = JEONGROK_MAP[daySky];
  if (!jeongrokTarget) return result;

  if (yearEarth === jeongrokTarget) {
    result.yearPillar.push("正祿");
  }
  if (monthEarth === jeongrokTarget) {
    result.monthPillar.push("正祿");
  }
  if (dayEarth === jeongrokTarget) {
    result.dayPillar.push("正祿");
  }
  if (hourEarth === jeongrokTarget) {
    result.hourPillar.push("正祿");
  }

  return result;
}

/**
 * 암록(暗祿) 계산
 * 일간을 기준으로 암록 지지를 찾습니다
 */
export function calculateAmrok(
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

  const amrokTarget = AMROK_MAP[daySky];
  if (!amrokTarget) return result;

  if (yearEarth === amrokTarget) {
    result.yearPillar.push("暗祿");
  }
  if (monthEarth === amrokTarget) {
    result.monthPillar.push("暗祿");
  }
  if (dayEarth === amrokTarget) {
    result.dayPillar.push("暗祿");
  }
  if (hourEarth === amrokTarget) {
    result.hourPillar.push("暗祿");
  }

  return result;
}

/**
 * 문곡귀인(文曲貴人) 계산
 * 일간을 기준으로 문곡귀인 지지를 찾습니다
 */
export function calculateMungokGwiin(
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

  const mungokTarget = MUNGOK_GWIIN_MAP[daySky];
  if (!mungokTarget) return result;

  if (yearEarth === mungokTarget) {
    result.yearPillar.push("文曲貴人");
  }
  if (monthEarth === mungokTarget) {
    result.monthPillar.push("文曲貴人");
  }
  if (dayEarth === mungokTarget) {
    result.dayPillar.push("文曲貴人");
  }
  if (hourEarth === mungokTarget) {
    result.hourPillar.push("文曲貴人");
  }

  return result;
}

/**
 * 학당귀인(學堂貴人) 계산
 * 일간을 기준으로 학당귀인 지지를 찾습니다
 */
export function calculateHakdangGwiin(
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

  const hakdangTarget = HAKDANG_GWIIN_MAP[daySky];
  if (!hakdangTarget) return result;

  if (yearEarth === hakdangTarget) {
    result.yearPillar.push("學堂貴人");
  }
  if (monthEarth === hakdangTarget) {
    result.monthPillar.push("學堂貴人");
  }
  if (dayEarth === hakdangTarget) {
    result.dayPillar.push("學堂貴人");
  }
  if (hourEarth === hakdangTarget) {
    result.hourPillar.push("學堂貴人");
  }

  return result;
}

/**
 * 금여성(金與星) 계산
 * 일간을 기준으로 금여성 지지를 찾습니다
 */
export function calculateGeumyeoSeong(
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

  const geumyeoTarget = GEUMYEO_SEONG_MAP[daySky];
  if (!geumyeoTarget) return result;

  if (yearEarth === geumyeoTarget) {
    result.yearPillar.push("金與星");
  }
  if (monthEarth === geumyeoTarget) {
    result.monthPillar.push("金與星");
  }
  if (dayEarth === geumyeoTarget) {
    result.dayPillar.push("金與星");
  }
  if (hourEarth === geumyeoTarget) {
    result.hourPillar.push("金與星");
  }

  return result;
}

/**
 * 천주귀인(天廚貴人) 계산
 * 일간을 기준으로 천주귀인 지지를 찾습니다
 */
export function calculateCheonjuGwiin(
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

  const cheonjuTarget = CHEONJU_GWIIN_MAP[daySky];
  if (!cheonjuTarget) return result;

  if (yearEarth === cheonjuTarget) {
    result.yearPillar.push("天廚貴人");
  }
  if (monthEarth === cheonjuTarget) {
    result.monthPillar.push("天廚貴人");
  }
  if (dayEarth === cheonjuTarget) {
    result.dayPillar.push("天廚貴人");
  }
  if (hourEarth === cheonjuTarget) {
    result.hourPillar.push("天廚貴人");
  }

  return result;
}

/**
 * 관귀학관(官貴學館) 계산
 * 일간을 기준으로 관귀학관 지지를 찾습니다
 */
export function calculateGwangwiHakgwan(
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

  const gwangwiTarget = GWANGWI_HAKGWAN_MAP[daySky];
  if (!gwangwiTarget) return result;

  if (yearEarth === gwangwiTarget) {
    result.yearPillar.push("官貴學館");
  }
  if (monthEarth === gwangwiTarget) {
    result.monthPillar.push("官貴學館");
  }
  if (dayEarth === gwangwiTarget) {
    result.dayPillar.push("官貴學館");
  }
  if (hourEarth === gwangwiTarget) {
    result.hourPillar.push("官貴學館");
  }

  return result;
}

/**
 * 태극귀인(太極貴人) 계산
 * 일간을 기준으로 년지에서 태극귀인을 찾습니다
 */
export function calculateTaekeukGwiin(
  daySky: string,
  yearEarth: string
): ShinSalResult {
  const result: ShinSalResult = {
    yearPillar: [],
    monthPillar: [],
    dayPillar: [],
    hourPillar: []
  };

  const taekeukTargets = TAEKEUK_GWIIN_MAP[daySky];
  if (!taekeukTargets) return result;

  // 년지만 확인
  if (taekeukTargets.includes(yearEarth)) {
    result.yearPillar.push("太極貴人");
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
 * 1행 신살 계산 (천덕귀인, 월덕귀인, 괴강살, 백호대살, 양인살, 낙정관살, 효신살)
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
  
  // 괴강살 계산
  const goegangSal = calculateGoegangSal(
    yearSky, monthSky, daySky, hourSky,
    yearEarth, monthEarth, dayEarth, hourEarth
  );
  
  // 백호대살 계산
  const baekhoDaesal = calculateBaekhoDaesal(
    yearSky, monthSky, daySky, hourSky,
    yearEarth, monthEarth, dayEarth, hourEarth
  );
  
  // 양인살 계산
  const yanginSal = calculateYanginSal(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 낙정관살 계산
  const nakjeongGwansal = calculateNakjeongGwansal(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 효신살 계산
  const hyosinSal = calculateHyosinSal(
    yearSky, monthSky, daySky, hourSky,
    yearEarth, monthEarth, dayEarth, hourEarth
  );
  
  // 수액살 계산
  const suaekSal = calculateSuaekSal(monthEarth, yearEarth, dayEarth, hourEarth);
  
  // 이별살 계산
  const ibyeolSal = calculateIbyeolSal(daySky, dayEarth);
  
  // 농아살 계산
  const nongaSal = calculateNongaSal(yearEarth, hourEarth);
  
  // 고란살 계산
  const goranSal = calculateGoranSal(daySky, dayEarth);
  
  // 홍염살 계산
  const hongyeomSal = calculateHongyeomSal(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 부벽살 계산
  const bubyeokSal = calculateBubyeokSal(monthEarth, yearEarth, dayEarth, hourEarth);
  
  // 정록 계산
  const jeongrok = calculateJeongrok(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 암록 계산
  const amrok = calculateAmrok(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 문곡귀인 계산
  const mungokGwiin = calculateMungokGwiin(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 학당귀인 계산
  const hakdangGwiin = calculateHakdangGwiin(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 금여성 계산
  const geumyeoSeong = calculateGeumyeoSeong(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 천주귀인 계산
  const cheonjuGwiin = calculateCheonjuGwiin(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 관귀학관 계산
  const gwangwiHakgwan = calculateGwangwiHakgwan(daySky, yearEarth, monthEarth, dayEarth, hourEarth);
  
  // 태극귀인 계산
  const taekeukGwiin = calculateTaekeukGwiin(daySky, yearEarth);
  
  // 모든 신살 결과를 합쳐서 반환
  let result = mergeShinSalResults(cheondeokGwiin, woldeokGwiin);
  result = mergeShinSalResults(result, goegangSal);
  result = mergeShinSalResults(result, baekhoDaesal);
  result = mergeShinSalResults(result, yanginSal);
  result = mergeShinSalResults(result, nakjeongGwansal);
  result = mergeShinSalResults(result, hyosinSal);
  result = mergeShinSalResults(result, suaekSal);
  result = mergeShinSalResults(result, ibyeolSal);
  result = mergeShinSalResults(result, nongaSal);
  result = mergeShinSalResults(result, goranSal);
  result = mergeShinSalResults(result, hongyeomSal);
  result = mergeShinSalResults(result, bubyeokSal);
  result = mergeShinSalResults(result, jeongrok);
  result = mergeShinSalResults(result, amrok);
  result = mergeShinSalResults(result, mungokGwiin);
  result = mergeShinSalResults(result, hakdangGwiin);
  result = mergeShinSalResults(result, geumyeoSeong);
  result = mergeShinSalResults(result, cheonjuGwiin);
  result = mergeShinSalResults(result, gwangwiHakgwan);
  result = mergeShinSalResults(result, taekeukGwiin);
  
  return result;
}

// 신살 한자-한글 변환 매핑
const SHINSAL_KOREAN_MAP: Record<string, string> = {
  "天德貴人": "천덕귀인",
  "月德貴人": "월덕귀인",
  "천을귀인": "천을귀인",
  "문창귀인": "문창귀인",
  "魁罡煞": "괴강살",
  "白虎大煞": "백호대살",
  "羊刃煞": "양인살",
  "落井關殺": "낙정관살",
  "梟神殺": "효신살",
  "水厄殺": "수액살",
  "離別殺": "이별살",
  "聾兒殺": "농아살",
  "孤鸞殺": "고란살",
  "紅艶殺": "홍염살",
  "釜劈殺": "부벽살",
  "正祿": "정록",
  "暗祿": "암록",
  "文曲貴人": "문곡귀인",
  "學堂貴人": "학당귀인",
  "金與星": "금여성",
  "天廚貴人": "천주귀인",
  "官貴學館": "관귀학관",
  "太極貴人": "태극귀인"
};

/**
 * 신살 표시용 문자열 생성
 * 신살이 없으면 빈 문자열 반환
 */
export function formatShinSal(shinSalList: string[], isKoreanMode: boolean = false): string {
  if (shinSalList.length === 0) {
    return "";
  }
  
  // 한글 모드일 때 한자를 한글로 변환
  const formattedList = isKoreanMode 
    ? shinSalList.map(shinsal => SHINSAL_KOREAN_MAP[shinsal] || shinsal)
    : shinSalList;
  
  // 신살이 여러 개인 경우 쉼표로 구분
  return formattedList.join(", ");
}

/**
 * 신살 배열 반환 (UI에서 개별 렌더링용)
 * 한글/한자 변환만 처리
 */
export function formatShinSalArray(shinSalList: string[], isKoreanMode: boolean = false): string[] {
  if (shinSalList.length === 0) {
    return [];
  }
  
  // 한글 모드일 때 한자를 한글로 변환
  return isKoreanMode 
    ? shinSalList.map(shinsal => SHINSAL_KOREAN_MAP[shinsal] || shinsal)
    : shinSalList;
}