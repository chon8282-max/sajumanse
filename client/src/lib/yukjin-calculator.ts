// 육친 계산 로직
// 첨부된 육친법 이미지를 바탕으로 구현

// 천간의 오행 속성
const HEAVENLY_STEM_WUXING: Record<string, string> = {
  '甲': '목양', '乙': '목음',
  '丙': '화양', '丁': '화음', 
  '戊': '토양', '己': '토음',
  '庚': '금양', '辛': '금음',
  '壬': '수양', '癸': '수음'
};

// 지지별 장간 (藏干) - 각 지지에 숨어있는 천간들
export const EARTHLY_BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['壬', '癸'],      // 자 = 임계
  '丑': ['癸', '辛', '己'], // 축 = 계신기
  '寅': ['戊', '丙', '甲'], // 인 = 무병갑
  '卯': ['甲', '乙'],      // 묘 = 갑을
  '辰': ['乙', '癸', '戊'], // 진 = 을계무
  '巳': ['戊', '庚', '丙'], // 사 = 무경병
  '午': ['丙', '己', '丁'], // 오 = 병기정
  '未': ['丁', '乙', '己'], // 미 = 정을기
  '申': ['戊', '壬', '庚'], // 신 = 무임경
  '酉': ['庚', '辛'],      // 유 = 경신
  '戌': ['辛', '丁', '戊'], // 술 = 신정무
  '亥': ['戊', '甲', '壬']  // 해 = 무갑임
};

// 육친 관계 매핑 (일간 기준)
const YUKJIN_MAP: Record<string, Record<string, string>> = {
  // 甲일간 기준
  '甲': {
    '甲': '比肩', '乙': '劫財',
    '丙': '食神', '丁': '傷官', 
    '戊': '偏財', '己': '正財',
    '庚': '偏官', '辛': '正官',
    '壬': '偏印', '癸': '正印'
  },
  // 乙일간 기준  
  '乙': {
    '甲': '劫財', '乙': '比肩',
    '丙': '傷官', '丁': '食神',
    '戊': '正財', '己': '偏財', 
    '庚': '正官', '辛': '偏官',
    '壬': '正印', '癸': '偏印'
  },
  // 丙일간 기준
  '丙': {
    '甲': '偏印', '乙': '正印',
    '丙': '比肩', '丁': '劫財',
    '戊': '食神', '己': '傷官',
    '庚': '偏財', '辛': '正財',
    '壬': '偏官', '癸': '正官'
  },
  // 丁일간 기준
  '丁': {
    '甲': '正印', '乙': '偏印', 
    '丙': '劫財', '丁': '比肩',
    '戊': '傷官', '己': '食神',
    '庚': '正財', '辛': '偏財',
    '壬': '正官', '癸': '偏官'
  },
  // 戊일간 기준
  '戊': {
    '甲': '偏官', '乙': '正官',
    '丙': '偏印', '丁': '正印',
    '戊': '比肩', '己': '劫財',
    '庚': '食神', '辛': '傷官', 
    '壬': '偏財', '癸': '正財'
  },
  // 己일간 기준
  '己': {
    '甲': '正官', '乙': '偏官',
    '丙': '正印', '丁': '偏印',
    '戊': '劫財', '己': '比肩',
    '庚': '傷官', '辛': '食神',
    '壬': '正財', '癸': '偏財'
  },
  // 庚일간 기준  
  '庚': {
    '甲': '偏財', '乙': '正財',
    '丙': '偏官', '丁': '正官',
    '戊': '偏印', '己': '正印',
    '庚': '比肩', '辛': '劫財',
    '壬': '食神', '癸': '傷官'
  },
  // 辛일간 기준
  '辛': {
    '甲': '正財', '乙': '偏財',
    '丙': '正官', '丁': '偏官', 
    '戊': '正印', '己': '偏印',
    '庚': '劫財', '辛': '比肩',
    '壬': '傷官', '癸': '食神'
  },
  // 壬일간 기준
  '壬': {
    '甲': '食神', '乙': '傷官',
    '丙': '偏財', '丁': '正財',
    '戊': '偏官', '己': '正官',
    '庚': '偏印', '辛': '正印',
    '壬': '比肩', '癸': '劫財'
  },
  // 癸일간 기준
  '癸': {
    '甲': '傷官', '乙': '食神',
    '丙': '正財', '丁': '偏財',
    '戊': '正官', '己': '偏官',
    '庚': '正印', '辛': '偏印',
    '壬': '劫財', '癸': '比肩'
  }
};

/**
 * 육친 관계 계산 (천간 기준)
 * @param dayHeavenlyStem 일간 (기준점)
 * @param targetHeavenlyStem 대상 천간
 * @returns 육친 관계
 */
export function calculateYukjin(dayHeavenlyStem: string, targetHeavenlyStem: string): string {
  if (!dayHeavenlyStem || !targetHeavenlyStem) {
    return '육친';
  }
  
  const yukjinMap = YUKJIN_MAP[dayHeavenlyStem];
  if (!yukjinMap) {
    return '육친';
  }
  
  return yukjinMap[targetHeavenlyStem] || '육친';
}

/**
 * 지지 육친 관계 계산 (지지의 주기를 이용)
 * @param dayHeavenlyStem 일간 (기준점)
 * @param targetEarthlyBranch 대상 지지
 * @returns 육친 관계
 */
export function calculateEarthlyBranchYukjin(dayHeavenlyStem: string, targetEarthlyBranch: string): string {
  if (!dayHeavenlyStem || !targetEarthlyBranch) {
    return '육친';
  }
  
  // 지지의 본기(마지막 장간) 찾기
  const hiddenStems = EARTHLY_BRANCH_HIDDEN_STEMS[targetEarthlyBranch];
  if (!hiddenStems || hiddenStems.length === 0) {
    return '육친';
  }
  
  // 본기(마지막 장간)를 이용하여 육친 계산
  const primaryHiddenStem = hiddenStems[hiddenStems.length - 1];
  return calculateYukjin(dayHeavenlyStem, primaryHiddenStem);
}

/**
 * 사주의 모든 육친 관계 계산 (천간 기준)
 * @param daySky 일간
 * @param hourSky 시간
 * @param monthSky 월간
 * @param yearSky 년간
 * @returns 각 기둥의 육친 관계
 */
export function calculateAllYukjin(daySky: string, hourSky: string, monthSky: string, yearSky: string) {
  return {
    hour: calculateYukjin(daySky, hourSky),
    day: '일간', // 일간은 항상 기준점이므로 '일간'으로 표시
    month: calculateYukjin(daySky, monthSky), 
    year: calculateYukjin(daySky, yearSky)
  };
}

/**
 * 사주의 모든 지지 육친 관계 계산 (지지 기준)
 * @param daySky 일간
 * @param hourEarth 시지
 * @param dayEarth 일지 
 * @param monthEarth 월지
 * @param yearEarth 년지
 * @returns 각 지지의 육친 관계
 */
export function calculateAllEarthlyBranchYukjin(daySky: string, hourEarth: string, dayEarth: string, monthEarth: string, yearEarth: string) {
  return {
    hour: calculateEarthlyBranchYukjin(daySky, hourEarth),
    day: calculateEarthlyBranchYukjin(daySky, dayEarth), // 일지 육친 추가!
    month: calculateEarthlyBranchYukjin(daySky, monthEarth),
    year: calculateEarthlyBranchYukjin(daySky, yearEarth)
  };
}

/**
 * 사주 결과의 전체 육친 계산 (천간 + 지지)
 * @param sajuData 사주 데이터
 * @returns 천간과 지지의 육친 관계
 */
export function calculateCompleteYukjin(sajuData: any) {
  const heavenlyYukjin = calculateAllYukjin(
    sajuData.daySky, 
    sajuData.hourSky, 
    sajuData.monthSky, 
    sajuData.yearSky
  );
  
  const earthlyYukjin = calculateAllEarthlyBranchYukjin(
    sajuData.daySky,
    sajuData.hourEarth,
    sajuData.dayEarth, 
    sajuData.monthEarth,
    sajuData.yearEarth
  );
  
  return {
    heavenly: heavenlyYukjin,
    earthly: earthlyYukjin
  };
}