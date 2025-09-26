import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWuxingColor } from "@/lib/wuxing-colors";

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
  const { daeunGapja, daeunAges, direction } = daeunData;

  // 간지를 천간과 지지로 분리
  const separateGapja = (gapja: string) => {
    return {
      sky: gapja.charAt(0),
      earth: gapja.charAt(1)
    };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-center font-tmon">
          대운 ({direction})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full">
          {/* 1. 대운 나이 (우측→좌측) */}
          <div className="grid grid-cols-10 border-t border-l border-r border-border">
            {daeunAges.map((age, index) => (
              <div 
                key={index}
                className="border-r border-border p-1 text-center text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20"
              >
                {age}
              </div>
            ))}
          </div>

          {/* 2. 대운 천간 (우측→좌측) */}
          <div className="grid grid-cols-10 border-t border-l border-r border-border">
            {daeunGapja.map((gapja, index) => {
              const { sky } = separateGapja(gapja);
              return (
                <div 
                  key={index}
                  className="border-r border-border px-1 py-0.5 text-center text-[20px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(sky) }}
                >
                  {sky}
                </div>
              );
            })}
          </div>

          {/* 3. 대운 지지 (우측→좌측) */}
          <div className="grid grid-cols-10 border-t border-l border-r border-b border-border">
            {daeunGapja.map((gapja, index) => {
              const { earth } = separateGapja(gapja);
              return (
                <div 
                  key={index}
                  className="border-r border-border px-1 py-0.5 text-center text-[20px] font-bold text-black leading-none font-tmon"
                  style={{ backgroundColor: getWuxingColor(earth) }}
                >
                  {earth}
                </div>
              );
            })}
          </div>
        </div>

        {/* 대운 정보 */}
        <div className="mt-2 text-center">
          <div className="text-xs text-muted-foreground font-tmon">
            {daeunData.daeunNumber}운부터 시작 • 매 10년마다 변화
          </div>
        </div>
      </CardContent>
    </Card>
  );
}