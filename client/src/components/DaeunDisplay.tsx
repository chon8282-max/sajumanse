import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DaeunData {
  isForward: boolean;
  daeunNumber: number;
  daeunGapja: string[];
  daeunAges: number[];
  direction: string;
}

interface DaeunDisplayProps {
  daeunData: DaeunData;
}

export default function DaeunDisplay({ daeunData }: DaeunDisplayProps) {
  // 김재완님 대운 데이터 (대운수 7, 순행) - 우측→좌측 배치
  const ages = [87, 77, 67, 57, 47, 37, 27, 17, 7];
  const heavenlyStems = ['병', '을', '갑', '계', '임', '신', '경', '기', '무'];
  const earthlyBranches = ['술', '유', '신', '미', '오', '사', '진', '묘', '인'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-center font-tmon">
          대운 (순행)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full">
          {/* 1. 대운 나이 (우측→좌측) */}
          <div className="grid grid-cols-9 border-t border-l border-r border-border">
            {ages.map((age, index) => (
              <div 
                key={index}
                className="border-r border-border p-1 text-center text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20"
              >
                {age}
              </div>
            ))}
          </div>

          {/* 2. 대운 천간 (우측→좌측) */}
          <div className="grid grid-cols-9 border-t border-l border-r border-border">
            {heavenlyStems.map((stem, index) => (
              <div 
                key={index}
                className="border-r border-border px-1 py-0.5 text-center text-[20px] font-bold text-black leading-none font-tmon bg-yellow-100"
              >
                {stem}
              </div>
            ))}
          </div>

          {/* 3. 대운 지지 (우측→좌측) */}
          <div className="grid grid-cols-9 border-t border-l border-r border-border">
            {earthlyBranches.map((branch, index) => (
              <div 
                key={index}
                className="border-r border-border px-1 py-0.5 text-center text-[20px] font-bold text-black leading-none font-tmon bg-green-100"
              >
                {branch}
              </div>
            ))}
          </div>

          {/* 4. 대운 나이 반복 (우측→좌측) */}
          <div className="grid grid-cols-9 border-t border-l border-r border-b border-border">
            {ages.map((age, index) => (
              <div 
                key={index}
                className="border-r border-border p-1 text-center text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20"
              >
                {age}
              </div>
            ))}
          </div>
        </div>

        {/* 대운 정보 */}
        <div className="mt-2 text-center">
          <div className="text-xs text-muted-foreground font-tmon">
            7운부터 시작 • 매 10년마다 변화
          </div>
        </div>
      </CardContent>
    </Card>
  );
}