// 12운성(十二運星) 계산
// 일간을 기준으로 지지의 12운성을 판단

export type TwelveUnseong = '長生' | '沐浴' | '冠帶' | '建祿' | '帝旺' | '衰' | '病' | '死' | '墓' | '絕' | '胎' | '養' | '';

const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const TWELVE_UNSEONG_ORDER = ['長生', '沐浴', '冠帶', '建祿', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'] as const;

// 각 천간별 長生 지지 (시작점)
const JANGSEONG_START: Record<string, string> = {
  '甲': '亥',
  '乙': '午',
  '丙': '寅',
  '丁': '酉',
  '戊': '寅',
  '己': '酉',
  '庚': '巳',
  '辛': '子',
  '壬': '申',
  '癸': '卯'
};

// 양간(陽干)과 음간(陰干)
const YANG_GAN = ['甲', '丙', '戊', '庚', '壬'];
const YIN_GAN = ['乙', '丁', '己', '辛', '癸'];

/**
 * 12운성 계산
 * @param daySky - 일간 (日干)
 * @param earthBranch - 지지 (地支)
 * @returns 12운성 한자
 */
export function calculateTwelveUnseong(daySky: string, earthBranch: string): TwelveUnseong {
  if (!daySky || !earthBranch) return '';
  
  const jangseongBranch = JANGSEONG_START[daySky];
  if (!jangseongBranch) return '';
  
  const jangseongIndex = EARTHLY_BRANCHES.indexOf(jangseongBranch as any);
  const currentIndex = EARTHLY_BRANCHES.indexOf(earthBranch as any);
  
  if (jangseongIndex === -1 || currentIndex === -1) return '';
  
  let steps: number;
  
  // 양간은 순행(順行), 음간은 역행(逆行)
  if (YANG_GAN.includes(daySky)) {
    // 순행: 長生 → 沐浴 → 冠帶 → ... (지지 정방향)
    steps = (currentIndex - jangseongIndex + 12) % 12;
    return TWELVE_UNSEONG_ORDER[steps] as TwelveUnseong;
  } else {
    // 역행: 長生 → 沐浴 → 冠帶 → ... (지지 역방향, 12운성은 정방향)
    // 예: 辛 長生=子, 子→亥→戌→酉(역행)일 때 長生→沐浴→冠帶→建祿 적용
    steps = (jangseongIndex - currentIndex + 12) % 12;
    return TWELVE_UNSEONG_ORDER[steps] as TwelveUnseong;
  }
}

/**
 * 12운성 설명
 */
export const TWELVE_UNSEONG_DESCRIPTIONS: Record<TwelveUnseong, string> = {
  '長生': '새로운 시작, 탄생, 성장의 시작',
  '沐浴': '목욕, 정화, 변화의 시기',
  '冠帶': '성년, 사회 진출, 책임감',
  '建祿': '왕성한 활동, 재물 획득',
  '帝旺': '최고의 전성기, 권력',
  '衰': '쇠퇴의 시작, 안정 추구',
  '病': '질병, 고난, 시련',
  '死': '끝, 마무리, 소멸',
  '墓': '무덤, 저장, 잠재력',
  '絕': '단절, 극한, 새로운 전환점',
  '胎': '태아, 준비, 잉태',
  '養': '양육, 성장 준비, 배움',
  '': ''
};
