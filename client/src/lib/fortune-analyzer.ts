import { type SajuInfo, type WuXing } from "@shared/schema";

// 오행 상생상극 관계
const WUXING_RELATIONS = {
  // 상생 관계 (도움)
  generate: {
    "목": "화", // 목생화
    "화": "토", // 화생토
    "토": "금", // 토생금
    "금": "수", // 금생수
    "수": "목", // 수생목
  },
  // 상극 관계 (충돌)
  overcome: {
    "목": "토", // 목극토
    "화": "금", // 화극금
    "토": "수", // 토극수
    "금": "목", // 금극목
    "수": "화", // 수극화
  }
} as const;

/**
 * 오행 밸런스 분석
 */
export function analyzeWuXingBalance(saju: SajuInfo): {
  dominant: WuXing;
  counts: Record<WuXing, number>;
  balance: "균형" | "편중" | "부족";
  analysis: string;
} {
  // 안전성 체크: saju 또는 wuxing이 undefined인 경우 처리
  if (!saju || !saju.wuxing) {
    return {
      dominant: "목",
      counts: { "목": 0, "화": 0, "토": 0, "금": 0, "수": 0 },
      balance: "부족",
      analysis: "사주 정보가 없어 분석할 수 없습니다."
    };
  }
  
  const elements = [
    saju.wuxing.yearSky, saju.wuxing.yearEarth,
    saju.wuxing.monthSky, saju.wuxing.monthEarth,
    saju.wuxing.daySky, saju.wuxing.dayEarth,
    saju.wuxing.hourSky, saju.wuxing.hourEarth,
  ];

  const counts: Record<WuXing, number> = {
    "목": 0, "화": 0, "토": 0, "금": 0, "수": 0
  };

  elements.forEach(element => {
    counts[element]++;
  });

  // 가장 많은 오행
  const dominant = Object.entries(counts).reduce((a, b) => 
    counts[a[0] as WuXing] > counts[b[0] as WuXing] ? a : b
  )[0] as WuXing;

  // 밸런스 판단
  const maxCount = Math.max(...Object.values(counts));
  const minCount = Math.min(...Object.values(counts));
  const nonZeroCounts = Object.values(counts).filter(c => c > 0).length;

  let balance: "균형" | "편중" | "부족";
  let analysis: string;

  if (maxCount >= 4) {
    balance = "편중";
    analysis = `${dominant}행이 매우 강하여 다른 오행과의 균형이 필요합니다.`;
  } else if (nonZeroCounts >= 4 && maxCount - minCount <= 2) {
    balance = "균형";
    analysis = "오행이 비교적 고른 분포를 보여 안정적인 기운을 가지고 있습니다.";
  } else if (nonZeroCounts <= 2) {
    balance = "부족";
    analysis = "일부 오행이 부족하여 보완이 필요할 수 있습니다.";
  } else {
    balance = "편중";
    analysis = `${dominant}행이 강한 편이지만 조화로운 발전이 가능합니다.`;
  }

  return { dominant, counts, balance, analysis };
}

/**
 * 일주 기준 성격 분석
 */
export function analyzeDayPillar(saju: SajuInfo): {
  personality: string;
  strengths: string[];
  weaknesses: string[];
  advice: string;
} {
  const daySky = saju.day.sky;
  const dayEarth = saju.day.earth;

  // 일간(천간) 기준 성격 분석
  const skyPersonality: Record<string, {
    personality: string;
    strengths: string[];
    weaknesses: string[];
    advice: string;
  }> = {
    "갑": {
      personality: "강직하고 리더십이 있는 성격",
      strengths: ["정직함", "추진력", "책임감"],
      weaknesses: ["고집", "융통성 부족", "성급함"],
      advice: "타인의 의견에 귀 기울이고 인내심을 기르세요."
    },
    "을": {
      personality: "부드럽고 적응력이 좋은 성격",
      strengths: ["섬세함", "배려심", "협조성"],
      weaknesses: ["우유부단", "의존성", "스트레스 민감"],
      advice: "자신의 의견을 명확히 표현하는 연습을 하세요."
    },
    "병": {
      personality: "밝고 열정적인 성격",
      strengths: ["활동력", "사교성", "창의성"],
      weaknesses: ["성급함", "변덕", "집중력 부족"],
      advice: "꾸준함과 인내심을 기르는 것이 중요합니다."
    },
    "정": {
      personality: "차분하고 신중한 성격",
      strengths: ["침착함", "분석력", "예술성"],
      weaknesses: ["소극성", "걱정", "완벽주의"],
      advice: "자신감을 가지고 적극적으로 행동해보세요."
    },
    "무": {
      personality: "안정적이고 믿음직한 성격",
      strengths: ["신뢰성", "포용력", "실용성"],
      weaknesses: ["고집", "변화 거부", "둔함"],
      advice: "새로운 변화에 열린 마음을 가지세요."
    },
    "기": {
      personality: "온화하고 배려심 많은 성격",
      strengths: ["친화력", "중재력", "안정감"],
      weaknesses: ["우유부단", "걱정", "소극성"],
      advice: "결단력을 기르고 자신의 의견을 당당히 표현하세요."
    },
    "경": {
      personality: "날카롭고 정의로운 성격",
      strengths: ["정확성", "의지력", "판단력"],
      weaknesses: ["날카로움", "비판적", "외로움"],
      advice: "타인에 대한 관용과 부드러움을 기르세요."
    },
    "신": {
      personality: "세련되고 감각적인 성격",
      strengths: ["심미안", "직관력", "순발력"],
      weaknesses: ["변덕", "예민함", "불안함"],
      advice: "마음의 안정을 찾고 꾸준함을 유지하세요."
    },
    "임": {
      personality: "지혜롭고 포용력 있는 성격",
      strengths: ["지혜", "적응력", "포용력"],
      weaknesses: ["우유부단", "게으름", "현실도피"],
      advice: "목표를 명확히 하고 꾸준히 노력하세요."
    },
    "계": {
      personality: "섬세하고 직관적인 성격",
      strengths: ["감수성", "창의성", "공감능력"],
      weaknesses: ["예민함", "의존성", "변덕"],
      advice: "자립심을 기르고 감정 조절을 연습하세요."
    }
  };

  return skyPersonality[daySky] || {
    personality: "균형잡힌 성격",
    strengths: ["안정성", "적응력"],
    weaknesses: ["특별함 부족"],
    advice: "자신만의 특별한 장점을 찾아 개발하세요."
  };
}

/**
 * 종합 운세 점수 계산
 */
export function calculateFortuneScore(saju: SajuInfo): {
  overall: number;
  love: number;
  career: number;
  wealth: number;
  health: number;
} {
  const wuxingBalance = analyzeWuXingBalance(saju);
  
  // 기본 점수 (60-85점 범위)
  let baseScore = 60;
  
  // 오행 균형에 따른 보정
  if (wuxingBalance.balance === "균형") {
    baseScore += 20;
  } else if (wuxingBalance.balance === "편중") {
    baseScore += 15;
  } else {
    baseScore += 10;
  }
  
  // 일간에 따른 미세 조정
  const dayVariation = Math.abs(saju.year.sky.charCodeAt(0) - saju.day.sky.charCodeAt(0)) % 10;
  const adjustment = (dayVariation - 5) * 2;
  
  const overall = Math.min(99, Math.max(60, baseScore + adjustment));
  
  return {
    overall,
    love: Math.min(99, Math.max(55, overall + (Math.random() * 10 - 5))),
    career: Math.min(99, Math.max(55, overall + (Math.random() * 10 - 5))),
    wealth: Math.min(99, Math.max(55, overall + (Math.random() * 10 - 5))),
    health: Math.min(99, Math.max(55, overall + (Math.random() * 10 - 5)))
  };
}

/**
 * 맞춤형 조언 생성
 */
export function generateAdvice(saju: SajuInfo): {
  today: string;
  thisWeek: string;
  thisMonth: string;
  career: string;
  love: string;
  health: string;
} {
  const wuxingBalance = analyzeWuXingBalance(saju);
  const personality = analyzeDayPillar(saju);
  
  const advice = {
    today: `${wuxingBalance.dominant}행의 기운이 강한 오늘, ${personality.advice}`,
    thisWeek: `이번 주는 ${wuxingBalance.balance === "균형" ? "안정적인" : "변화가 있는"} 한 주가 될 것입니다. 꾸준한 노력이 중요합니다.`,
    thisMonth: `${wuxingBalance.dominant}행의 영향으로 ${wuxingBalance.analysis}`,
    career: personality.strengths.includes("추진력") || personality.strengths.includes("리더십") 
      ? "리더십을 발휘할 기회가 있습니다. 적극적으로 도전해보세요."
      : "협력과 소통을 통해 좋은 성과를 얻을 수 있습니다.",
    love: personality.strengths.includes("배려심") || personality.strengths.includes("친화력")
      ? "진심어린 소통으로 관계가 더욱 깊어질 것입니다."
      : "상대방의 입장에서 생각해보는 시간을 가져보세요.",
    health: wuxingBalance.balance === "균형" 
      ? "전반적으로 건강한 상태입니다. 현재 상태를 유지하세요."
      : "스트레스 관리와 규칙적인 생활 패턴이 중요합니다."
  };
  
  return advice;
}