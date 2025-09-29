// 천간, 지지 한자를 이미지로 매핑하는 유틸리티

// 천간 이미지 imports - 사용자 제공 새 이미지
import gapImage from "@assets/갑_1_1759150993898.jpg";
import eulImage from "@assets/을_1_1759150993897.jpg";
import byeongImage from "@assets/병_1_1759150993896.jpg";
import jeongImage from "@assets/정_1_1759150993897.jpg";
import muImage from "@assets/묘_1_1759150993896.jpg"; // 무 이미지가 없어서 묘 이미지 사용 (임시)
import giImage from "@assets/기_1_1759150993896.jpg";
import gyeongImage from "@assets/경_1_1759150993898.jpg";
import sinImage from "@assets/辛_1_1759150993896.jpg";
import imImage from "@assets/임_1_1759150993897.jpg";
import gyeImage from "@assets/계_1_1759150993895.jpg";

// 지지 한자 이미지 imports (기존)
import jaChineseImage from "@assets/자_1759096365548.jpg";
import chukChineseImage from "@assets/축_1759096365544.jpg";
import inChineseImage from "@assets/인_1759096365545.jpg";
import myoChineseImage from "@assets/묘_1759096365545.jpg";
import jinChineseImage from "@assets/진_1759096365545.jpg";
import saChineseImage from "@assets/사_1759096365546.jpg";
import oChineseImage from "@assets/오_1759096365546.jpg";
import miChineseImage from "@assets/미_1759096365547.jpg";
import sinChineseImage from "@assets/申_1759096365547.jpg";
import yuChineseImage from "@assets/유_1759096365547.jpg";
import sulChineseImage from "@assets/술_1759096365548.jpg";
import haeChineseImage from "@assets/해_1759096365548.jpg";

// 지지 한글 이미지 imports (새로 제공받은)
import jaKoreanImage from "@assets/자_1_1759151414394.jpg";
import chukKoreanImage from "@assets/축_1_1759151414395.jpg";
import inKoreanImage from "@assets/인_1_1759151414394.jpg";
import myoKoreanImage from "@assets/묘_1_1759151414392.jpg";
import jinKoreanImage from "@assets/진_1_1759151414395.jpg";
import saKoreanImage from "@assets/사_1_1759151414392.jpg";
import oKoreanImage from "@assets/오_1_1759151414393.jpg";
import miKoreanImage from "@assets/미_1_1759151414392.jpg";
import sinKoreanImage from "@assets/申_1_1759151414393.jpg";
import yuKoreanImage from "@assets/유_1_1759151414394.jpg";
import sulKoreanImage from "@assets/술_1_1759151414393.jpg";
import haeKoreanImage from "@assets/해_1_1759151414391.jpg";

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

// 지지 한자 이미지 매핑 (기본 모드)
const JIJI_CHINESE_IMAGES: Record<string, string> = {
  '子': jaChineseImage,
  '丑': chukChineseImage,
  '寅': inChineseImage,
  '卯': myoChineseImage,
  '辰': jinChineseImage,
  '巳': saChineseImage,
  '午': oChineseImage,
  '未': miChineseImage,
  '申': sinChineseImage,
  '酉': yuChineseImage,
  '戌': sulChineseImage,
  '亥': haeChineseImage
};

// 지지 한글 이미지 매핑 (한글 토글 모드)
const JIJI_KOREAN_IMAGES: Record<string, string> = {
  '子': jaKoreanImage,
  '丑': chukKoreanImage,
  '寅': inKoreanImage,
  '卯': myoKoreanImage,
  '辰': jinKoreanImage,
  '巳': saKoreanImage,
  '午': oKoreanImage,
  '未': miKoreanImage,
  '申': sinKoreanImage,
  '酉': yuKoreanImage,
  '戌': sulKoreanImage,
  '亥': haeKoreanImage
};

/**
 * 천간 한자에 해당하는 이미지 경로를 반환
 */
export function getCheonganImage(character: string): string | null {
  return CHEONGAN_IMAGES[character] || null;
}

/**
 * 지지 한자에 해당하는 이미지 경로를 반환
 */
export function getJijiImage(character: string, isKoreanMode: boolean = false): string | null {
  if (isKoreanMode) {
    return JIJI_KOREAN_IMAGES[character] || null;
  } else {
    return JIJI_CHINESE_IMAGES[character] || null;
  }
}

/**
 * 해당 한자가 천간인지 확인
 */
export function isCheongan(character: string): boolean {
  return character in CHEONGAN_IMAGES;
}

/**
 * 해당 한자가 지지인지 확인
 */
export function isJiji(character: string): boolean {
  return character in JIJI_CHINESE_IMAGES;
}

/**
 * 천간 리스트 반환
 */
export function getCheonganList(): string[] {
  return Object.keys(CHEONGAN_IMAGES);
}

/**
 * 지지 리스트 반환
 */
export function getJijiList(): string[] {
  return Object.keys(JIJI_CHINESE_IMAGES);
}