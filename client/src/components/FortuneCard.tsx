import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Heart, Briefcase } from "lucide-react";
import { type WuXing } from "@shared/schema";

interface FortuneInfo {
  category: string;
  score: number;
  description: string;
  advice: string;
  icon: React.ReactNode;
  color: string;
}

interface FortuneCardProps {
  dominantElement: WuXing;
  className?: string;
}

export default function FortuneCard({ dominantElement, className = "" }: FortuneCardProps) {
  // todo: remove mock functionality
  const getFortuneByElement = (element: WuXing): FortuneInfo[] => {
    const baseAdvice = {
      "목": "성장과 발전의 기운이 강합니다.",
      "화": "열정적이고 활동적인 에너지가 있습니다.", 
      "토": "안정적이고 신중한 접근이 필요합니다.",
      "금": "강인하고 결단력 있는 기운입니다.",
      "수": "유연하고 적응력이 뛰어납니다."
    };

    return [
      {
        category: "종합운",
        score: Math.floor(Math.random() * 40) + 60, // 60-99
        description: baseAdvice[element],
        advice: "오늘은 긍정적인 마음가짐으로 하루를 시작하세요.",
        icon: <Star className="w-4 h-4" />,
        color: "bg-primary"
      },
      {
        category: "애정운", 
        score: Math.floor(Math.random() * 40) + 60,
        description: "인간관계에서 좋은 기운이 감돕니다.",
        advice: "소중한 사람들과의 시간을 늘려보세요.",
        icon: <Heart className="w-4 h-4" />,
        color: "bg-red-500"
      },
      {
        category: "사업운",
        score: Math.floor(Math.random() * 40) + 60,
        description: "새로운 기회가 찾아올 수 있습니다.",
        advice: "신중한 판단과 계획적인 접근이 중요합니다.",
        icon: <Briefcase className="w-4 h-4" />,
        color: "bg-blue-500"
      },
      {
        category: "재물운",
        score: Math.floor(Math.random() * 40) + 60,
        description: "안정적인 관리가 필요한 시기입니다.",
        advice: "무리한 투자보다는 꾸준한 저축을 추천합니다.",
        icon: <TrendingUp className="w-4 h-4" />,
        color: "bg-green-500"
      }
    ];
  };

  const fortunes = getFortuneByElement(dominantElement);

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
            {dominantElement}행 기준
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