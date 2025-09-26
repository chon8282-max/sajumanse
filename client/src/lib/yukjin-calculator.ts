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

// 육친 관계 매핑 (일간 기준)
const YUKJIN_MAP: Record<string, Record<string, string>> = {
  // 甲일간 기준
  '甲': {
    '甲': '比肩', '乙': '劫財',
    '丙': '食神', '丁': '傷官', 
    '戊': '偏財', '己': '正財',
    '庚': '七殺', '辛': '正官',
    '壬': '偏印', '癸': '正印'
  },
  // 乙일간 기준  
  '乙': {
    '甲': '劫財', '乙': '比肩',
    '丙': '傷官', '丁': '食神',
    '戊': '正財', '己': '偏財', 
    '庚': '正官', '辛': '七殺',
    '壬': '正印', '癸': '偏印'
  },
  // 丙일간 기준
  '丙': {
    '甲': '偏印', '乙': '正印',
    '丙': '比肩', '丁': '劫財',
    '戊': '食神', '己': '傷官',
    '庚': '偏財', '辛': '正財',
    '壬': '七殺', '癸': '正官'
  },
  // 丁일간 기준
  '丁': {
    '甲': '正印', '乙': '偏印', 
    '丙': '劫財', '丁': '比肩',
    '戊': '傷官', '己': '食神',
    '庚': '正財', '辛': '偏財',
    '壬': '正官', '癸': '七殺'
  },
  // 戊일간 기준
  '戊': {
    '甲': '七殺', '乙': '正官',
    '丙': '偏印', '丁': '正印',
    '戊': '比肩', '己': '劫財',
    '庚': '食神', '辛': '傷官', 
    '壬': '偏財', '癸': '正財'
  },
  // 己일간 기준
  '己': {
    '甲': '正官', '乙': '七殺',
    '丙': '正印', '丁': '偏印',
    '戊': '劫財', '己': '比肩',
    '庚': '傷官', '辛': '食神',
    '壬': '正財', '癸': '偏財'
  },
  // 庚일간 기준  
  '庚': {
    '甲': '偏財', '乙': '正財',
    '丙': '七殺', '丁': '正官',
    '戊': '偏印', '己': '正印',
    '庚': '比肩', '辛': '劫財',
    '壬': '食神', '癸': '傷官'
  },
  // 辛일간 기준
  '辛': {
    '甲': '正財', '乙': '偏財',
    '丙': '正官', '丁': '七殺', 
    '戊': '正印', '己': '偏印',
    '庚': '劫財', '辛': '比肩',
    '壬': '傷官', '癸': '食神'
  },
  // 壬일간 기준
  '壬': {
    '甲': '食神', '乙': '傷官',
    '丙': '偏財', '丁': '正財',
    '戊': '七殺', '己': '正官',
    '庚': '偏印', '辛': '正印',
    '壬': '比肩', '癸': '劫財'
  },
  // 癸일간 기준
  '癸': {
    '甲': '傷官', '乙': '食神',
    '丙': '正財', '丁': '偏財',
    '戊': '正官', '己': '七殺',
    '庚': '正印', '辛': '偏印',
    '壬': '劫財', '癸': '比肩'
  }
};

/**
 * 육친 관계 계산
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
 * 사주의 모든 육친 관계 계산
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