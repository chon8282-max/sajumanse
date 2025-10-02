// 천간, 지지 한자를 이미지로 매핑하는 유틸리티
// 파일 용량 최적화를 위해 이미지 대신 텍스트만 사용

/**
 * 천간 한자에 해당하는 이미지 경로를 반환
 * 현재는 텍스트만 사용하므로 항상 null 반환
 */
export function getCheonganImage(character: string, isKoreanMode: boolean = false): string | null {
  return null;
}

/**
 * 지지 한자에 해당하는 이미지 경로를 반환
 * 현재는 텍스트만 사용하므로 항상 null 반환
 */
export function getJijiImage(character: string, isKoreanMode: boolean = false): string | null {
  return null;
}

/**
 * 해당 한자가 천간인지 확인
 */
export function isCheongan(character: string): boolean {
  const cheonganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  return cheonganList.includes(character);
}

/**
 * 해당 한자가 지지인지 확인
 */
export function isJiji(character: string): boolean {
  const jijiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return jijiList.includes(character);
}

/**
 * 천간 리스트 반환
 */
export function getCheonganList(): string[] {
  return ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
}

/**
 * 지지 리스트 반환
 */
export function getJijiList(): string[] {
  return ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
}
