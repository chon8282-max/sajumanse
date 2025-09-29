import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateCalendarMonth, getCalendarInfo, CalendarDayData } from "@/lib/calendar-calculator";
import { CHINESE_TO_KOREAN_MAP } from "@shared/schema";

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

  // 음력 데이터 조회
  const { data: lunarData } = useQuery({
    queryKey: [`/api/lunar-solar/month`, currentYear, currentMonth],
    queryFn: async () => {
      const promises = [];
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      
      // 해당 월의 모든 날짜에 대해 음력 데이터 조회
      for (let day = 1; day <= lastDay.getDate(); day++) {
        promises.push(
          apiRequest("POST", "/api/lunar-solar/convert/lunar", {
            solYear: currentYear,
            solMonth: currentMonth,
            solDay: day
          }).then(res => res.json())
        );
      }
      
      return Promise.all(promises);
    },
  });

  // 절기 데이터 조회 - 전체 년도의 24절기 가져오기
  const { data: solarTermsData } = useQuery({
    queryKey: [`/api/solar-terms`, currentYear],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/solar-terms/${currentYear}`);
      return response.json();
    },
  });

  // 현재 월의 절기만 필터링하여 표시
  const solarTerms: SolarTermInfo[] = useMemo(() => {
    if (!solarTermsData?.success) return [];
    
    const allTerms = solarTermsData.data.map((term: any) => ({
      name: term.name,
      date: new Date(term.date),
      dateString: new Date(term.date).toLocaleDateString('ko-KR', { 
        month: '2-digit', 
        day: '2-digit' 
      }).replace('. ', '/').replace('.', ''),
      timeString: new Date(term.date).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    }));
    
    // 현재 월의 절기만 반환
    return allTerms.filter(term => {
      const termMonth = term.date.getMonth() + 1;
      return termMonth === currentMonth;
    });
  }, [solarTermsData, currentMonth]);

  // 달력 데이터와 음력 데이터 결합
  const enrichedCalendarData = useMemo(() => {
    if (!lunarData) return calendarData;

    return calendarData.map(week => 
      week.map(dayData => {
        if (!dayData.isCurrentMonth) return dayData;
        
        const lunarInfo = lunarData.find((data: any) => 
          data.success && data.data && data.data.solDay === dayData.solarDay
        );
        
        if (lunarInfo?.data) {
          const lunar = lunarInfo.data;
          return {
            ...dayData,
            lunarYear: lunar.lunYear,
            lunarMonth: lunar.lunMonth,
            lunarDay: lunar.lunDay,
            isLunarFirst: lunar.lunDay === 1
          };
        }
        
        return dayData;
      })
    );
  }, [calendarData, lunarData]);

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
    
    // 절기 확인
    const solarTerm = solarTerms.find(term => 
      term.date.getDate() === dayData.solarDay && dayData.isCurrentMonth
    );

    return (
      <div 
        key={`${dayData.solarDate.getTime()}`}
        className={`
          relative min-h-[60px] p-1 border border-gray-200 
          ${dayData.isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-50'}
          ${isToday ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}
        `}
        data-testid={`calendar-day-${dayData.solarDay}`}
      >
        {/* 양력 날짜 */}
        <div className={`
          text-lg font-bold mb-1
          ${isSunday ? 'text-red-500' : ''}
          ${isSaturday ? 'text-blue-500' : ''}
          ${!dayData.isCurrentMonth ? 'text-gray-400' : 'text-gray-800'}
        `}>
          {dayData.solarDay}
        </div>
        
        {/* 음력 날짜 */}
        {dayData.lunarDay && (
          <div className={`
            text-xs mb-1
            ${isLunarFirst ? 'font-bold text-red-600' : 'text-gray-600'}
          `}>
            {dayData.lunarMonth}/{dayData.lunarDay}
          </div>
        )}
        
        {/* 일간지 */}
        {dayData.lunarDayGanji && (
          <div className="text-xs text-blue-600">
            {CHINESE_TO_KOREAN_MAP[dayData.lunarDayGanji.sky] || dayData.lunarDayGanji.sky}
            {CHINESE_TO_KOREAN_MAP[dayData.lunarDayGanji.earth] || dayData.lunarDayGanji.earth}
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
    <div className="w-full max-w-4xl mx-auto p-4" data-testid="traditional-calendar">
      <Card>
        <CardHeader className="pb-4">
          {/* 1열: 년도간지(왼쪽) | 양력달력(가운데) | 월간지(오른쪽) */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-bold text-blue-800">
              {CHINESE_TO_KOREAN_MAP[calendarInfo.yearGanji[0]] || calendarInfo.yearGanji[0]}
              {CHINESE_TO_KOREAN_MAP[calendarInfo.yearGanji[1]] || calendarInfo.yearGanji[1]}년
            </div>
            
            <div className="text-xl font-bold">
              양력 {currentYear}년 {currentMonth}월
            </div>
            
            <div className="text-xl font-bold text-green-800">
              {CHINESE_TO_KOREAN_MAP[calendarInfo.monthGanji[0]] || calendarInfo.monthGanji[0]}
              {CHINESE_TO_KOREAN_MAP[calendarInfo.monthGanji[1]] || calendarInfo.monthGanji[1]}월
            </div>
          </div>

          {/* 2열: 과거 이동(왼쪽) | 미래 이동(오른쪽) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevYear} data-testid="button-prev-year">
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-1">년</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={handlePrevMonth} data-testid="button-prev-month">
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-1">월</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleNextMonth} data-testid="button-next-month">
                <span className="mr-1">월</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleNextYear} data-testid="button-next-year">
                <span className="mr-1">년</span>
                <ChevronRight className="w-4 h-4" />
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
                  text-center font-bold py-2 border bg-gray-100
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
                    <span className="text-gray-600">: {term.dateString} {term.timeString}</span>
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