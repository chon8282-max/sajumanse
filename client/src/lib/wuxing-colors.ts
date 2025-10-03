// 오행 색상 분류 함수 (한자 기준)
export function getWuxingColor(character: string | null): string {
  if (!character) return "#ffffff";
  
  // 甲乙寅卯辰 = #5ea01c (목 - Wood)
  if (["甲", "乙", "寅", "卯", "辰"].includes(character)) {
    return "#5ea01c";
  }
  // 丙丁巳午未 = #c13533 (화 - Fire)
  if (["丙", "丁", "巳", "午", "未"].includes(character)) {
    return "#c13533";
  }
  // 戊己 = #e6ca0f (토 - Earth)
  if (["戊", "己"].includes(character)) {
    return "#e6ca0f";
  }
  // 庚辛申酉戌 = #fefcfd (금 - Metal)
  if (["庚", "辛", "申", "酉", "戌"].includes(character)) {
    return "#fefcfd";
  }
  // 壬癸亥子丑 = #555555 (수 - Water)
  if (["壬", "癸", "亥", "子", "丑"].includes(character)) {
    return "#555555";
  }
  
  return "#ffffff"; // 기본값
}

// 오행별 글자 색상 반환
export function getWuxingTextColor(character: string | null): string {
  if (!character) return "#000000";
  
  // 甲乙寅卯辰 = 글자색 #ffffff
  if (["甲", "乙", "寅", "卯", "辰"].includes(character)) {
    return "#ffffff";
  }
  // 丙丁巳午未 = 글자색 #ffffff
  if (["丙", "丁", "巳", "午", "未"].includes(character)) {
    return "#ffffff";
  }
  // 戊己 = 글자색 #ffffff
  if (["戊", "己"].includes(character)) {
    return "#ffffff";
  }
  // 庚辛申酉戌 = 글자색 #141312
  if (["庚", "辛", "申", "酉", "戌"].includes(character)) {
    return "#141312";
  }
  // 壬癸亥子丑 = 글자색 #ffffff
  if (["壬", "癸", "亥", "子", "丑"].includes(character)) {
    return "#ffffff";
  }
  
  return "#000000"; // 기본값
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
  '子': ['壬', '癸'],
  '丑': ['癸', '辛', '己'],
  '寅': ['戊', '丙', '甲'],
  '卯': ['甲', '乙'],
  '辰': ['乙', '癸', '戊'],
  '巳': ['戊', '庚', '丙'],
  '午': ['丙', '己', '丁'],
  '未': ['丁', '乙', '己'],
  '申': ['戊', '壬', '庚'],
  '酉': ['庚', '辛'],
  '戌': ['辛', '丁', '戊'],
  '亥': ['戊', '甲', '壬']
};

// 지지에 해당하는 지장간 반환
export function getJijanggan(jiji: string): string[] {
  return JIJANGGAN_MAPPING[jiji] || [];
}