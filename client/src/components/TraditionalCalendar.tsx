import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { generateCalendarMonth, getCalendarInfo, CalendarDayData } from "@/lib/calendar-calculator";
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

  const calendarInfo = useMemo(() => getCalendarInfo(currentYear, currentMonth), [currentYear, currentMonth]);
  const calendarData = useMemo(() => generateCalendarMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const { data: solarTermsData } = useQuery({
    queryKey: [`/local-solar-terms-range`, currentYear],
    queryFn: async () => {
      const res = await fetch('/data/solar-terms.json');
      const allTerms = await res.json();
      return { success: true, data: allTerms };
    },
    staleTime: 1000 * 60 * 60 * 24,
  });

  const solarTerms: SolarTermInfo[] = useMemo(() => {
    if (!solarTermsData?.success) return [];
    const allTerms: SolarTermInfo[] = solarTermsData.data.map((term: { name: string; date: string }) => {
      const utcDate = new Date(term.date);
      const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
      return {
        name: term.name,
        date: kstDate,
        dateString: kstDate.toLocaleDateString('ko-KR', { timeZone: 'UTC', month: '2-digit', day: '2-digit' }).replace('. ', '/').replace('.', ''),
        timeString: kstDate.toLocaleTimeString('ko-KR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false })
      };
    });
    return allTerms.filter((term: SolarTermInfo) => {
      return term.date.getUTCFullYear() === currentYear && term.date.getUTCMonth() + 1 === currentMonth;
    });
  }, [solarTermsData, currentYear, currentMonth]);

  const enrichedCalendarData = useMemo(() => {
    return calendarData.map(week => week.map(dayData => {
      if (!dayData.isCurrentMonth) return dayData;
      try {
        const solar = Solar.fromYmd(currentYear, currentMonth, dayData.solarDay);
        const lunar = solar.getLunar();
        return { ...dayData, lunarYear: lunar.getYear(), lunarMonth: lunar.getMonth(), lunarDay: lunar.getDay(), isLunarFirst: lunar.getDay() === 1 };
      } catch {
        return dayData;
      }
    }));
  }, [calendarData, currentYear, currentMonth]);

  const handlePrevMonth = () => { if (currentMonth === 1) { setCurrentYear(p => p - 1); setCurrentMonth(12); } else setCurrentMonth(p => p - 1); };
  const handleNextMonth = () => { if (currentMonth === 12) { setCurrentYear(p => p + 1); setCurrentMonth(1); } else setCurrentMonth(p => p + 1); };
  const handlePrevYear = () => setCurrentYear(p => p - 1);
  const handleNextYear = () => setCurrentYear(p => p + 1);
  const handleToday = () => { setCurrentYear(new Date().getFullYear()); setCurrentMonth(new Date().getMonth() + 1); };

  const renderDayCell = (dayData: CalendarDayData) => {
    const isToday = dayData.isToday;
    const isLunarFirst = dayData.isLunarFirst;
    const isSunday = dayData.dayOfWeek === 0;
    const isSaturday = dayData.dayOfWeek === 6;
    const solarTerm = solarTerms.find(term => term.date.getUTCDate() === dayData.solarDay && dayData.isCurrentMonth);

    return (
      <div
        key={`${dayData.solarDate.getTime()}`}
        style={{ borderRight: '0.5px solid #4a4a4a', borderTop: '0.5px solid #4a4a4a' }}
        className={`relative min-h-[60px] flex flex-col items-center pt-0 pb-0
          ${!dayData.isCurrentMonth ? 'bg-gray-50' : ''}
          ${dayData.isCurrentMonth && isSunday ? 'bg-red-50' : ''}
          ${dayData.isCurrentMonth && isSaturday ? 'bg-blue-50' : ''}
          ${dayData.isCurrentMonth && !isSunday && !isSaturday ? 'bg-white' : ''}
          ${isToday ? '!bg-indigo-50' : ''}
        `}
        data-testid={`calendar-day-${dayData.solarDay}`}
      >
        {/* 윗줄: 날짜 + 간지 나란히 */}
        <div className="flex items-end gap-0">
          {/* 양력 날짜 */}
          <div className={`flex items-center justify-center rounded-full text-[15px] font-bold
            ${isToday ? 'bg-indigo-500 text-white' : ''}
            ${!isToday && isSunday ? 'text-red-400' : ''}
            ${!isToday && isSaturday ? 'text-indigo-400' : ''}
            ${!isToday && !isSunday && !isSaturday && dayData.isCurrentMonth ? 'text-gray-800' : ''}
            ${!dayData.isCurrentMonth ? 'text-gray-300' : ''}
          `}>
            {dayData.solarDay}
          </div>

          {/* 간지 (천간/지지 세로로) */}
          {dayData.lunarDayGanji && (
            <div className="flex flex-col items-center leading-none">
              <span className="text-[12px] text-gray-800 font-bold">{dayData.lunarDayGanji.sky}</span>
              <span className="text-[12px] text-gray-800 font-bold">{dayData.lunarDayGanji.earth}</span>
            </div>
          )}
        </div>

        {/* 음력 날짜 */}
        {dayData.lunarDay && (
          <div className={`text-[14px] leading-tight font-bold mt-0
            ${isLunarFirst ? 'text-red-500' : 'text-blue-900'}
          `}>
            {dayData.lunarMonth}/{dayData.lunarDay}
          </div>
        )}

        {/* 절기 */}
        {solarTerm && (
          <div className="absolute top-0.5 right-0.5 text-[10px] text-emerald-600 font-bold">
            {solarTerm.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto" data-testid="traditional-calendar">
      <Card className="overflow-hidden shadow-sm" style={{ border: '0.5px solid #4a4a4a' }}>
        <CardHeader className="p-0">
          <div className="px-4 py-3 bg-white">
            {/* 년월 + 간지 표시 */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                {calendarInfo.yearGanji[0]}{calendarInfo.yearGanji[1]}년
              </div>
              <div className="text-lg font-bold text-gray-800">
                {currentYear}년 {currentMonth}월
              </div>
              <div className="text-sm font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                {calendarInfo.monthGanji[0]}{calendarInfo.monthGanji[1]}월
              </div>
            </div>

            {/* 네비게이션 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={handlePrevYear} data-testid="button-prev-year"
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  <ChevronsLeft className="w-3.5 h-3.5" /><span>년</span>
                </button>
                <button onClick={handlePrevMonth} data-testid="button-prev-month"
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" /><span>월</span>
                </button>
              </div>

              <button onClick={handleToday}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-all">
                오늘
              </button>

              <div className="flex items-center gap-1.5">
                <button onClick={handleNextMonth} data-testid="button-next-month"
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  <span>월</span><ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleNextYear} data-testid="button-next-year"
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                  <span>년</span><ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7" style={{ borderTop: '0.5px solid #4a4a4a', borderLeft: '0.5px solid #4a4a4a' }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} style={{ borderRight: '0.5px solid #4a4a4a' }}
                className={`text-center text-base font-semibold py-2
                  ${index === 0 ? 'text-red-400' : ''}
                  ${index === 6 ? 'text-blue-400' : ''}
                  ${index !== 0 && index !== 6 ? 'text-gray-500' : ''}
                `}>{day}</div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-7" style={{ borderLeft: '0.5px solid #4a4a4a', borderBottom: '0.5px solid #4a4a4a' }}>
            {enrichedCalendarData.flat().map(dayData => renderDayCell(dayData))}
          </div>

          {solarTerms.length > 0 && (
            <div className="px-4 py-3 bg-gray-50" style={{ borderTop: '0.5px solid #4a4a4a' }}>
              <div className="flex gap-6 justify-center">
                {solarTerms.map((term, index) => (
                  <div key={index} className="text-center text-sm">
                    <span className="font-bold text-emerald-600">{term.name}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-600">{term.dateString} {term.timeString}</span>
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