import { CHEONGAN, JIJI } from "@shared/schema";

// 60갑자 생성
export function generate60Ganji(): { sky: string; earth: string; label: string }[] {
  const ganji: { sky: string; earth: string; label: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const sky = CHEONGAN[i % 10];
    const earth = JIJI[i % 12];
    ganji.push({ sky, earth, label: `${sky}${earth}` });
  }
  return ganji;
}

// 월주 계산 (년주에 따른 가능한 월주 12개)
export function calculateMonthGanji(yearSky: string): { sky: string; earth: string; label: string }[] {
  // 월건표: 년주 천간에 따른 정월(인월)의 천간 결정
  const monthStartMap: { [key: string]: string } = {
    '甲': '丙', // 갑년·기년 -> 병인월부터
    '己': '丙',
    '乙': '戊', // 을년·경년 -> 무인월부터
    '庚': '戊',
    '丙': '庚', // 병년·신년 -> 경인월부터
    '辛': '庚',
    '丁': '壬', // 정년·임년 -> 임인월부터
    '壬': '壬',
    '戊': '甲', // 무년·계년 -> 갑인월부터
    '癸': '甲',
  };

  const startSky = monthStartMap[yearSky];
  const skyIndex = CHEONGAN.indexOf(startSky as any);
  
  const months: { sky: string; earth: string; label: string }[] = [];
  
  // 인월부터 12개월 (인묘진사오미신유술해자축)
  const monthEarths = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  
  for (let i = 0; i < 12; i++) {
    const currentSkyIndex = (skyIndex + i) % 10;
    const sky = CHEONGAN[currentSkyIndex];
    const earth = monthEarths[i];
    months.push({ sky, earth, label: `${sky}${earth}` });
  }
  
  return months;
}

// 시주 계산 (일주에 따른 가능한 시주 12개)
export function calculateHourGanji(daySky: string): { sky: string; earth: string; label: string }[] {
  // 시두법: 일주 천간에 따른 자시의 천간 결정
  const hourStartMap: { [key: string]: string } = {
    '甲': '甲', // 갑일·기일 -> 갑자시부터
    '己': '甲',
    '乙': '丙', // 을일·경일 -> 병자시부터
    '庚': '丙',
    '丙': '戊', // 병일·신일 -> 무자시부터
    '辛': '戊',
    '丁': '庚', // 정일·임일 -> 경자시부터
    '壬': '庚',
    '戊': '壬', // 무일·계일 -> 임자시부터
    '癸': '壬',
  };

  const startSky = hourStartMap[daySky];
  const skyIndex = CHEONGAN.indexOf(startSky as any);
  
  const hours: { sky: string; earth: string; label: string }[] = [];
  
  // 자시부터 12시진 (자축인묘진사오미신유술해)
  const hourEarths = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  for (let i = 0; i < 12; i++) {
    const currentSkyIndex = (skyIndex + i) % 10;
    const sky = CHEONGAN[currentSkyIndex];
    const earth = hourEarths[i];
    hours.push({ sky, earth, label: `${sky}${earth}` });
  }
  
  return hours;
}

// 60갑자에서 인덱스 찾기
export function findGanjiIndex(sky: string, earth: string): number {
  const skyIndex = CHEONGAN.indexOf(sky as any);
  const earthIndex = JIJI.indexOf(earth as any);
  
  if (skyIndex === -1 || earthIndex === -1) {
    return -1;
  }
  
  // 60갑자 순환 계산
  for (let i = 0; i < 60; i++) {
    if (i % 10 === skyIndex && i % 12 === earthIndex) {
      return i;
    }
  }
  
  return -1;
}
