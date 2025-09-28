// 천간, 지지 한자를 이미지로 매핑하는 유틸리티

// 천간 이미지 imports
import gapImage from "@assets/갑_1759096342037.jpg";
import eulImage from "@assets/을_1759096342037.jpg";
import byeongImage from "@assets/병_1759096342036.jpg";
import jeongImage from "@assets/정_1759096342036.jpg";
import muImage from "@assets/무_1759096342037.jpg";
import giImage from "@assets/기_1759096342037.jpg";
import gyeongImage from "@assets/경_1759099520975.jpg";
import sinImage from "@assets/辛_1759099520975.jpg";
import imImage from "@assets/임_1759096342038.jpg";
import gyeImage from "@assets/계_1759096342036.jpg";

// 지지 이미지 imports
import jaImage from "@assets/자_1759096365548.jpg";
import chukImage from "@assets/축_1759096365544.jpg";
import inImage from "@assets/인_1759096365545.jpg";
import myoImage from "@assets/묘_1759096365545.jpg";
import jinImage from "@assets/진_1759096365545.jpg";
import saImage from "@assets/사_1759096365546.jpg";
import oImage from "@assets/오_1759096365546.jpg";
import miImage from "@assets/미_1759096365547.jpg";
import sinJijiImage from "@assets/申_1759099520976.jpg";
import yuImage from "@assets/유_1759099520976.jpg";
import sulImage from "@assets/술_1759099520974.jpg";
import haeImage from "@assets/해_1759096365548.jpg";

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

// 지지 이미지 매핑
const JIJI_IMAGES: Record<string, string> = {
  '子': jaImage,
  '丑': chukImage,
  '寅': inImage,
  '卯': myoImage,
  '辰': jinImage,
  '巳': saImage,
  '午': oImage,
  '未': miImage,
  '申': sinJijiImage,
  '酉': yuImage,
  '戌': sulImage,
  '亥': haeImage
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
export function getJijiImage(character: string): string | null {
  return JIJI_IMAGES[character] || null;
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
  return character in JIJI_IMAGES;
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
  return Object.keys(JIJI_IMAGES);
}