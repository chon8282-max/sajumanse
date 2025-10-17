import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateCalendarMonth, getCalendarInfo, CalendarDayData } from "@/lib/calendar-calculator";
import { CHINESE_TO_KOREAN_MAP } from "@shared/schema";
import { Solar } from 'lunar-javascript';

interface SolarTermInfo {
  name: string;
  date: Date;
  dateString: string;
  timeString: string;
}

interface TraditionalCalendarProps {
  initialYear?: number;
  initialMonth?: number;
}

export default function TraditionalCalendar({ 
  initialYear = new Date().getFullYear(), 
  initialMonth = new Date().getMonth() + 1 
}: TraditionalCalendarProps) {
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // 달력 정보 계산
  const calendarInfo = useMemo(() => 
    getCalendarInfo(currentYear, currentMonth), 
    [currentYear, currentMonth]
  );

  // 달력 데이터 생성
  const calendarData = useMemo(() => 
    generateCalendarMonth(currentYear, currentMonth), 
    [currentYear, currentMonth]
  );

  // 절기 데이터 조회 - 현재년도 ±2년 미리 로드
  const { data: solarTermsData } = useQuery({
    queryKey: [`/api/solar-terms-range`, currentYear],
    queryFn: async () => {
      const years = [currentYear - 1, currentYear, currentYear + 1];
      const promises = years.map(year => 
        apiRequest("GET", `/api/solar-terms/${year}`).then(res => res.json())
      );
      const results = await Promise.all(promises);
      
      // 모든 연도의 절기 데이터 병합
      const allTerms = results.flatMap(result => 
        result.success ? result.data : []
      );
      
      return { success: true, data: allTerms };
    },
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });

  // 현재 월의 절기만 필터링하여 표시 (KST 기준)
  const solarTerms: SolarTermInfo[] = useMemo(() => {
    if (!solarTermsData?.success) return [];
    
    const allTerms: SolarTermInfo[] = solarTermsData.data.map((term: { name: string; date: string }) => {
      const utcDate = new Date(term.date);
      // UTC를 KST로 변환 (UTC + 9시간)
      const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
      
      return {
        name: term.name,
        date: kstDate,
        dateString: kstDate.toLocaleDateString('ko-KR', { 
          timeZone: 'UTC',
          month: '2-digit', 
          day: '2-digit' 
        }).replace('. ', '/').replace('.', ''),
        timeString: kstDate.toLocaleTimeString('ko-KR', { 
          timeZone: 'UTC',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      };
    });
    
    // 현재 월의 절기만 반환 (KST 기준)
    return allTerms.filter((term: SolarTermInfo) => {
      const termMonth = term.date.getUTCMonth() + 1;
      const termYear = term.date.getUTCFullYear();
      return termYear === currentYear && termMonth === currentMonth;
    });
  }, [solarTermsData, currentYear, currentMonth]);

  // 달력 데이터와 음력 데이터 결합 (lunar-javascript로 직접 계산)
  const enrichedCalendarData = useMemo(() => {
    return calendarData.map(week => 
      week.map(dayData => {
        if (!dayData.isCurrentMonth) return dayData;
        
        try {
          // lunar-javascript로 음력 계산 (즉시 계산, API 호출 없음)
          const solar = Solar.fromYmd(currentYear, currentMonth, dayData.solarDay);
          const lunar = solar.getLunar();
          
          return {
            ...dayData,
            lunarYear: lunar.getYear(),
            lunarMonth: lunar.getMonth(),
            lunarDay: lunar.getDay(),
            isLunarFirst: lunar.getDay() === 1
          };
        } catch (error) {
          console.error(`음력 변환 오류: ${currentYear}-${currentMonth}-${dayData.solarDay}`, error);
          return dayData;
        }
      })
    );
  }, [calendarData, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handlePrevYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(prev => prev + 1);
  };

  const renderDayCell = (dayData: CalendarDayData) => {
    const isToday = dayData.isToday;
    const isLunarFirst = dayData.isLunarFirst;
    const isSunday = dayData.dayOfWeek === 0;
    const isSaturday = dayData.dayOfWeek === 6;
    
    // 절기 확인 (KST 기준 날짜 비교)
    const solarTerm = solarTerms.find(term => {
      // term.date는 이미 KST로 변환된 Date 객체
      const termDay = term.date.getUTCDate(); // KST Date의 UTC 메서드로 날짜 추출
      return termDay === dayData.solarDay && dayData.isCurrentMonth;
    });

    return (
      <div 
        key={`${dayData.solarDate.getTime()}`}
        className={`
          relative min-h-[50px] p-0.5 border border-gray-200 
          ${dayData.isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-50'}
          ${isToday ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}
        `}
        data-testid={`calendar-day-${dayData.solarDay}`}
      >
        {/* 양력 날짜 */}
        <div className={`
          text-base font-bold mb-0
          ${isSunday ? 'text-red-500' : ''}
          ${isSaturday ? 'text-blue-500' : ''}
          ${!dayData.isCurrentMonth ? 'text-gray-400' : 'text-gray-800'}
        `}>
          {dayData.solarDay}
        </div>
        
        {/* 음력 날짜 */}
        {dayData.lunarDay && (
          <div className={`
            text-xs mb-0
            ${isLunarFirst ? 'font-bold text-red-600' : 'text-gray-600'}
          `}>
            {dayData.lunarMonth}/{dayData.lunarDay}
          </div>
        )}
        
        {/* 일간지 */}
        {dayData.lunarDayGanji && (
          <div className="text-xs text-blue-600">
            {dayData.lunarDayGanji.sky}{dayData.lunarDayGanji.earth}
          </div>
        )}
        
        {/* 절기 */}
        {solarTerm && (
          <div className="absolute top-1 right-1 text-xs text-green-600 font-bold">
            {solarTerm.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto pl-[0px] pr-[0px] pt-[0px] pb-[0px]" data-testid="traditional-calendar">
      <Card>
        <CardHeader className="pb-1 pl-[0px] pr-[0px]">
          {/* 1열: 년도간지(왼쪽) | 역학달력(가운데) | 월간지(오른쪽) */}
          <div className="flex items-center justify-between mt-[-8px] mb-[-8px] pl-[14px] pr-[14px] text-[15px]">
            <div className="text-base font-bold text-blue-800">
              {calendarInfo.yearGanji[0]}{calendarInfo.yearGanji[1]}년
            </div>
            
            <div className="text-base font-bold">
              {currentYear}년 {currentMonth}월
            </div>
            
            <div className="text-base font-bold text-green-800">
              {calendarInfo.monthGanji[0]}{calendarInfo.monthGanji[1]}월
            </div>
          </div>

          {/* 2열: 과거 이동(왼쪽) | 미래 이동(오른쪽) */}
          <div className="flex items-center justify-between mb-1 pl-[14px] pr-[14px]">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevYear} 
                data-testid="button-prev-year" 
                className="h-8 w-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 ml-[-12px]" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth} 
                data-testid="button-prev-month" 
                className="h-8 w-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth} 
                data-testid="button-next-month" 
                className="h-8 w-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextYear} 
                data-testid="button-next-year" 
                className="h-8 w-8 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <ChevronRight className="w-4 h-4 ml-[-12px]" />
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-0">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div 
                key={day} 
                className={`
                  text-center font-bold py-1 border bg-gray-100
                  ${index === 0 ? 'text-red-500' : ''}
                  ${index === 6 ? 'text-blue-500' : ''}
                `}
              >
                {day}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-0">
            {enrichedCalendarData.flat().map(dayData => renderDayCell(dayData))}
          </div>
          
          {/* 절기 정보 하단 표시 */}
          {solarTerms.length > 0 && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex gap-8 justify-center text-sm">
                {solarTerms.map((term, index) => (
                  <div key={index} className="text-center">
                    <span className="font-bold text-blue-600">{term.name}</span>
                    <span className="text-gray-600">: </span>
                    <span className="font-bold text-gray-600">{term.dateString}</span>
                    <span className="text-gray-600"> {term.timeString}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}