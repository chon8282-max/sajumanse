import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Heart, Briefcase } from "lucide-react";
import { type WuXing, type SajuInfo } from "@shared/schema";
import { analyzeWuXingBalance, calculateFortuneScore, generateAdvice } from "@/lib/fortune-analyzer";

interface FortuneInfo {
  category: string;
  score: number;
  description: string;
  advice: string;
  icon: React.ReactNode;
  color: string;
}

interface FortuneCardProps {
  saju: SajuInfo;
  className?: string;
}

export default function FortuneCard({ saju, className = "" }: FortuneCardProps) {
  const wuxingBalance = analyzeWuXingBalance(saju);
  const fortuneScores = calculateFortuneScore(saju);
  const advice = generateAdvice(saju);
  
  const fortunes: FortuneInfo[] = [
    {
      category: "종합운",
      score: fortuneScores.overall,
      description: wuxingBalance.analysis,
      advice: advice.today,
      icon: <Star className="w-4 h-4" />,
      color: "bg-primary"
    },
    {
      category: "애정운", 
      score: fortuneScores.love,
      description: "인간관계에서의 조화와 발전이 기대됩니다.",
      advice: advice.love,
      icon: <Heart className="w-4 h-4" />,
      color: "bg-red-500"
    },
    {
      category: "사업운",
      score: fortuneScores.career,
      description: "직업적 성장과 발전의 기회가 있습니다.",
      advice: advice.career,
      icon: <Briefcase className="w-4 h-4" />,
      color: "bg-blue-500"
    },
    {
      category: "재물운",
      score: fortuneScores.wealth,
      description: "재정 관리와 투자에 신중함이 필요합니다.",
      advice: "꾸준한 저축과 계획적인 소비가 중요합니다.",
      icon: <TrendingUp className="w-4 h-4" />,
      color: "bg-green-500"
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card className={`p-4 ${className}`} data-testid="card-fortune">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold font-serif mb-2" data-testid="text-fortune-title">
            오늘의 운세
          </h3>
          <Badge variant="secondary" className="text-xs">
            {wuxingBalance.dominant}행 기준 ({wuxingBalance.balance})
          </Badge>
        </div>

        <div className="space-y-3">
          {fortunes.map((fortune, index) => (
            <div 
              key={index}
              className="p-3 border rounded-md hover-elevate cursor-pointer"
              onClick={() => console.log(`Fortune ${fortune.category} clicked`)}
              data-testid={`card-fortune-${index}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${fortune.color} text-white`}>
                    {fortune.icon}
                  </div>
                  <span className="font-medium">{fortune.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(fortune.score)}`}>
                    {fortune.score}점
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-1">
                {fortune.description}
              </p>
              
              <p className="text-xs text-primary font-medium">
                💡 {fortune.advice}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground mt-4">
          * 운세는 참고용이며, 개인의 노력이 더 중요합니다.
        </div>
      </div>
    </Card>
  );
}