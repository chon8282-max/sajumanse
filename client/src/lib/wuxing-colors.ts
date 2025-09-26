// 오행 색상 분류 함수 (한자 기준)
export function getWuxingColor(character: string | null): string {
  if (!character) return "#ffffff";
  
  // 갑을인묘=8cf8a0 (목 - Wood)
  if (["甲", "乙", "寅", "卯"].includes(character)) {
    return "#8cf8a0";
  }
  // 병정사오=f8c0c9 (화 - Fire)
  if (["丙", "丁", "巳", "午"].includes(character)) {
    return "#f8c0c9";
  }
  // 무기진미술축=fbf5b3 (토 - Earth)
  if (["戊", "己", "辰", "未", "戌", "丑"].includes(character)) {
    return "#fbf5b3";
  }
  // 경신신유=ffffff (금 - Metal)
  if (["庚", "辛", "申", "酉"].includes(character)) {
    return "#ffffff";
  }
  // 임계해자=cbcbca (수 - Water)
  if (["壬", "癸", "亥", "子"].includes(character)) {
    return "#cbcbca";
  }
  
  return "#ffffff"; // 기본값
}

// 시간대별 십이지 매핑 (31분 기준)
export function getZodiacHourFromTime(hour: number, minute: number): string {
  // 시간 범위별로 정확하게 매핑
  // 23:31~01:30 -> 子時
  if ((hour === 23 && minute >= 31) || hour === 0 || (hour === 1 && minute <= 30)) {
    return '子時';
  }
  // 01:31~03:30 -> 丑時
  if ((hour === 1 && minute >= 31) || hour === 2 || (hour === 3 && minute <= 30)) {
    return '丑時';
  }
  // 03:31~05:30 -> 寅時
  if ((hour === 3 && minute >= 31) || hour === 4 || (hour === 5 && minute <= 30)) {
    return '寅時';
  }
  // 05:31~07:30 -> 卯時
  if ((hour === 5 && minute >= 31) || hour === 6 || (hour === 7 && minute <= 30)) {
    return '卯時';
  }
  // 07:31~09:30 -> 辰時
  if ((hour === 7 && minute >= 31) || hour === 8 || (hour === 9 && minute <= 30)) {
    return '辰時';
  }
  // 09:31~11:30 -> 巳時
  if ((hour === 9 && minute >= 31) || hour === 10 || (hour === 11 && minute <= 30)) {
    return '巳時';
  }
  // 11:31~13:30 -> 午時
  if ((hour === 11 && minute >= 31) || hour === 12 || (hour === 13 && minute <= 30)) {
    return '午時';
  }
  // 13:31~15:30 -> 未時
  if ((hour === 13 && minute >= 31) || hour === 14 || (hour === 15 && minute <= 30)) {
    return '未時';
  }
  // 15:31~17:30 -> 申時
  if ((hour === 15 && minute >= 31) || hour === 16 || (hour === 17 && minute <= 30)) {
    return '申時';
  }
  // 17:31~19:30 -> 酉時
  if ((hour === 17 && minute >= 31) || hour === 18 || (hour === 19 && minute <= 30)) {
    return '酉時';
  }
  // 19:31~21:30 -> 戌時
  if ((hour === 19 && minute >= 31) || hour === 20 || (hour === 21 && minute <= 30)) {
    return '戌時';
  }
  // 21:31~23:30 -> 亥時
  if ((hour === 21 && minute >= 31) || hour === 22 || (hour === 23 && minute <= 30)) {
    return '亥時';
  }
  
  // 기본값 (혹시 빠뜨린 경우)
  return '子時';
}

// 지장간 매핑 (십이지지별 지장간)
export const JIJANGGAN_MAPPING: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '戊', '庚'],
  '午': ['丁', '己'],
  '未': ['己', '乙', '丁'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

// 지지에 해당하는 지장간 반환
export function getJijanggan(jiji: string): string[] {
  return JIJANGGAN_MAPPING[jiji] || [];
}