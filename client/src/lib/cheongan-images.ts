// 천간 한자를 이미지로 매핑하는 유틸리티

// 이미지 imports
import gapImage from "@assets/갑_1759040922198.jpg";
import eulImage from "@assets/을_1759040922202.jpg";
import byeongImage from "@assets/병_1759040922202.jpg";
import jeongImage from "@assets/정_1759040922201.jpg";
import muImage from "@assets/무_1759040922201.jpg";
import giImage from "@assets/기_1759040922201.jpg";
import gyeongImage from "@assets/경_1759040922200.jpg";
import sinImage from "@assets/신_1759040922200.jpg";
import imImage from "@assets/임_1759040922199.jpg";
import gyeImage from "@assets/계_1759040922199.jpg";

// 천간 이미지 매핑
const CHEONGAN_IMAGES: Record<string, string> = {
  '甲': gapImage,
  '乙': eulImage,
  '丙': byeongImage,
  '丁': jeongImage,
  '戊': muImage,
  '己': giImage,
  '庚': gyeongImage,
  '辛': sinImage,
  '壬': imImage,
  '癸': gyeImage
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