// 천간 한자를 이미지로 매핑하는 유틸리티

// 천간 이미지 매핑
const CHEONGAN_IMAGES: Record<string, string> = {
  '甲': '/assets/갑_1759040922198.jpg',
  '乙': '/assets/을_1759040922202.jpg',
  '丙': '/assets/병_1759040922202.jpg',
  '丁': '/assets/정_1759040922201.jpg',
  '戊': '/assets/무_1759040922201.jpg',
  '己': '/assets/기_1759040922201.jpg',
  '庚': '/assets/경_1759040922200.jpg',
  '辛': '/assets/신_1759040922200.jpg',
  '壬': '/assets/임_1759040922199.jpg',
  '癸': '/assets/계_1759040922199.jpg'
};

/**
 * 천간 한자에 해당하는 이미지 경로를 반환
 */
export function getCheonganImage(character: string): string | null {
  return CHEONGAN_IMAGES[character] || null;
}

/**
 * 해당 한자가 천간인지 확인
 */
export function isCheongan(character: string): boolean {
  return character in CHEONGAN_IMAGES;
}

/**
 * 천간 리스트 반환
 */
export function getCheonganList(): string[] {
  return Object.keys(CHEONGAN_IMAGES);
}