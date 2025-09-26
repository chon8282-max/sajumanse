import { Card } from "@/components/ui/card";
import { type SajuInfo } from "@shared/schema";
import { getWuXingColor, getWuXingBgColor } from "@/lib/saju-calculator";
import { getWuxingColor, getZodiacHourFromTime } from "@/lib/wuxing-colors";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Solar } from "lunar-javascript";

interface SajuTableProps {
  saju: SajuInfo;
  title?: string;
  showWuxing?: boolean;
}

export default function SajuTable({ saju, title = "사주팔자", showWuxing = true }: SajuTableProps) {
  const columns = [
    { label: "시주", data: saju.hour },
    { label: "일주", data: saju.day },
    { label: "월주", data: saju.month },
    { label: "년주", data: saju.year }
  ];

  // 현재 날짜 정보 생성
  const now = new Date();
  
  // 음력 변환
  const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lunar = solar.getLunar();
  const zodiacTime = getZodiacHourFromTime(now.getHours(), now.getMinutes());
  
  const combinedDateString = `(양)${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (음)${lunar.getYear()}년 ${lunar.getMonth()}월 ${lunar.getDay()}일) ${zodiacTime}生`;

  const wuxingData = [
    saju.wuxing.hourSky,
    saju.wuxing.daySky,
    saju.wuxing.monthSky,
    saju.wuxing.yearSky
  ];

  const wuxingEarthData = [
    saju.wuxing.hourEarth,
    saju.wuxing.dayEarth,
    saju.wuxing.monthEarth,
    saju.wuxing.yearEarth
  ];

  return (
    <Card className="p-4" data-testid="card-saju-table">
      <div className="text-center mb-4">
        <div className="space-y-1">
          <div className="text-[13px] font-serif">
            <span className="text-foreground font-semibold" data-testid="text-saju-title">현재 만세력</span>
          </div>
          <div className="text-[13px] font-serif text-blue-700 dark:text-blue-300" data-testid="text-solar-date">
            (양력) {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
          </div>
          <div className="text-[13px] font-serif text-blue-700 dark:text-blue-300" data-testid="text-lunar-date">
            (음력) {lunar.getYear()}년 {lunar.getMonth()}월 {lunar.getDay()}일 {zodiacTime}生
          </div>
        </div>
      </div>
      {/* 메인 사주 테이블 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {/* 레이블 행 */}
        {columns.map((col, index) => (
          <div key={index} className="text-center">
            <div className="text-sm text-muted-foreground font-medium mb-2" data-testid={`text-column-label-${index}`}>
              {col.label}
            </div>
          </div>
        ))}
        
        {/* 천간 행 */}
        {columns.map((col, index) => (
          <div key={`sky-${index}`} className="text-center">
            <div 
              className="py-3 px-2 rounded-md font-serif font-semibold border text-[40px] text-black pt-[2px] pb-[2px]"
              style={{ backgroundColor: getWuxingColor(col.data.sky) }}
              data-testid={`text-sky-${index}`}
            >
              {col.data.sky}
            </div>
          </div>
        ))}
        
        {/* 지지 행 */}
        {columns.map((col, index) => (
          <div key={`earth-${index}`} className="text-center">
            <div 
              className="py-3 px-2 rounded-md font-serif font-semibold border text-[40px] text-black pt-[2px] pb-[2px]"
              style={{ backgroundColor: getWuxingColor(col.data.earth) }}
              data-testid={`text-earth-${index}`}
            >
              {col.data.earth}
            </div>
          </div>
        ))}
      </div>
      {/* 오행 정보 */}
      {showWuxing && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <h3 className="text-sm font-medium mb-2 text-center" data-testid="text-wuxing-title">
            오행 분석
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">천간:</span>{" "}
              {wuxingData.map((w, i) => (
                <span key={i} className={`${getWuXingColor(w)} font-medium`}>
                  {w}{i < wuxingData.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
            <div>
              <span className="font-medium">지지:</span>{" "}
              {wuxingEarthData.map((w, i) => (
                <span key={i} className={`${getWuXingColor(w)} font-medium`}>
                  {w}{i < wuxingEarthData.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}