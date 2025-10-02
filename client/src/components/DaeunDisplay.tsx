import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaeunPeriod } from "@/lib/daeun-calculator";
import { getWuxingColor } from "@/lib/wuxing-colors";

interface DaeunData {
  isForward: boolean;
  daeunNumber: number;
  daeunGapja: string[];
  daeunAges: number[];
  daeunPeriods: DaeunPeriod[];
  direction: string;
}

interface DaeunDisplayProps {
  daeunData: DaeunData;
  focusedDaeun?: DaeunPeriod | null;
  onDaeunSelect?: (daeun: DaeunPeriod) => void;
}

export default function DaeunDisplay({ daeunData, focusedDaeun, onDaeunSelect }: DaeunDisplayProps) {
  // 실제 대운 데이터 사용 - 우측→좌측 배치 (역순)
  const ages = [...daeunData.daeunAges].reverse();
  const gapjaReversed = [...daeunData.daeunGapja].reverse();
  const periodsReversed = [...daeunData.daeunPeriods].reverse();
  
  // 그리드 컬럼 수 설정 (조건부)
  const getGridCols = (count: number) => {
    if (count <= 8) return "grid-cols-8";
    if (count <= 9) return "grid-cols-9";
    return "grid-cols-10"; // 10개 이상은 10컬럼으로 고정
  };
  const gridCols = getGridCols(ages.length);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-center font-tmon">
          大運 ({daeunData.direction})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full">
          {/* 1. 대운 나이 (우측→좌측) */}
          <div className={`grid ${gridCols} border-t border-l border-r border-border`}>
            {ages.map((age, index) => {
              const period = periodsReversed[index];
              const isCurrentDaeun = focusedDaeun && period.startAge === focusedDaeun.startAge;
              return (
                <div 
                  key={index}
                  className={`border-r border-border p-1 text-center text-[11px] font-medium cursor-pointer transition-colors ${
                    isCurrentDaeun 
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold'
                      : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  }`}
                  onClick={() => onDaeunSelect && onDaeunSelect(period)}
                  data-testid={`button-daeun-age-${age}`}
                >
                  {age}
                </div>
              );
            })}
          </div>

          {/* 2. 대운 천간 (우측→좌측) */}
          <div className={`grid ${gridCols} border-t border-l border-r border-border`}>
            {gapjaReversed.map((gapja, index) => {
              const sky = gapja.charAt(0);
              const period = periodsReversed[index];
              const isCurrentDaeun = focusedDaeun && period.startAge === focusedDaeun.startAge;
              return (
                <div 
                  key={index}
                  className={`border-r border-border px-1 py-0.5 text-center text-[20px] font-bold leading-none cursor-pointer transition-colors ${
                    isCurrentDaeun ? 'text-red-700 dark:text-red-300' : 'text-black'
                  }`}
                  style={{ 
                    backgroundColor: isCurrentDaeun 
                      ? 'rgba(239, 68, 68, 0.2)' 
                      : getWuxingColor(sky),
                    fontFamily: "'ChosunGs', sans-serif"
                  }}
                  onClick={() => onDaeunSelect && onDaeunSelect(period)}
                  data-testid={`button-daeun-sky-${sky}`}
                >
                  {sky}
                </div>
              );
            })}
          </div>

          {/* 3. 대운 지지 (우측→좌측) */}
          <div className={`grid ${gridCols} border-t border-l border-r border-border`}>
            {gapjaReversed.map((gapja, index) => {
              const earth = gapja.charAt(1);
              const period = periodsReversed[index];
              const isCurrentDaeun = focusedDaeun && period.startAge === focusedDaeun.startAge;
              return (
                <div 
                  key={index}
                  className={`border-r border-border px-1 py-0.5 text-center text-[20px] font-bold leading-none cursor-pointer transition-colors ${
                    isCurrentDaeun ? 'text-red-700 dark:text-red-300' : 'text-black'
                  }`}
                  style={{ 
                    backgroundColor: isCurrentDaeun 
                      ? 'rgba(239, 68, 68, 0.2)' 
                      : getWuxingColor(earth),
                    fontFamily: "'ChosunGs', sans-serif"
                  }}
                  onClick={() => onDaeunSelect && onDaeunSelect(period)}
                  data-testid={`button-daeun-earth-${earth}`}
                >
                  {earth}
                </div>
              );
            })}
          </div>

          {/* 4. 대운 나이 반복 (우측→좌측) */}
          <div className={`grid ${gridCols} border-t border-l border-r border-b border-border`}>
            {ages.map((age, index) => {
              const period = periodsReversed[index];
              const isCurrentDaeun = focusedDaeun && period.startAge === focusedDaeun.startAge;
              return (
                <div 
                  key={index}
                  className={`border-r border-border p-1 text-center text-[11px] font-medium cursor-pointer transition-colors ${
                    isCurrentDaeun 
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold'
                      : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  }`}
                  onClick={() => onDaeunSelect && onDaeunSelect(period)}
                  data-testid={`button-daeun-age-bottom-${age}`}
                >
                  {age}
                </div>
              );
            })}
          </div>
        </div>

        {/* 대운 정보 */}
        <div className="mt-2 text-center">
          <div className="text-xs text-muted-foreground font-tmon">
            {daeunData.daeunNumber}운부터 시작 • 매 10년마다 변화
            {focusedDaeun && (
              <div className="text-red-600 dark:text-red-400 font-medium mt-1">
                현재: {focusedDaeun.startAge}~{focusedDaeun.endAge}세 {focusedDaeun.gapja}대운
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}