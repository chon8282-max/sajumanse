import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import CurrentTimeTable from "@/components/CurrentTimeTable";
import { calculateSaju } from "@/lib/saju-calculator";
import { getSolarTermsForCalculation } from "@/lib/solar-terms-data";
import { Solar } from "lunar-javascript";
import { useQuery } from "@tanstack/react-query";
import { type Announcement } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocation } from "wouter";

export default function Home() {
  const [currentSaju, setCurrentSaju] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [, setLocation] = useLocation();

  const { data: solarTermsData } = useQuery({
    queryKey: ["local-solar-terms", lastUpdated.getFullYear()],
    queryFn: async () => await getSolarTermsForCalculation(lastUpdated.getFullYear()),
    staleTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  });

  const { data: announcementsData } = useQuery<{ success: boolean; data: Announcement[] }>({
    queryKey: ["/api/announcements"],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const announcements = announcementsData?.data || [];

  const { data: lunarData } = useQuery({
    queryKey: ["local-lunar-convert", lastUpdated.getFullYear(), lastUpdated.getMonth() + 1, lastUpdated.getDate()],
    queryFn: async () => {
      try {
        const solar = Solar.fromYmd(lastUpdated.getFullYear(), lastUpdated.getMonth() + 1, lastUpdated.getDate());
        const lunar = solar.getLunar();
        return { success: true, lunMonth: lunar.getMonth(), lunDay: lunar.getDay(), lunLeapMonth: (lunar as any).isLeap?.() ?? false };
      } catch { return null; }
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const getSolarDate = () => {
    const now = lastUpdated;
    const dayOfWeek = format(now, 'eeee', { locale: ko });
    let lunarStr = '';
    if (lunarData?.success) {
      lunarStr = ` (음력 ${lunarData.lunLeapMonth ? '윤' : ''}${lunarData.lunMonth}월 ${lunarData.lunDay}일)`;
    }
    return `양력 ${format(now, 'yyyy년 M월 d일', { locale: ko })}${lunarStr} ${dayOfWeek}`;
  };

  useEffect(() => {
    if (!solarTermsData?.length) return;
    const update = () => {
      const now = new Date();
      setLastUpdated(now);
      try {
        const dbSolarTerms = solarTermsData.map((t: any) => ({ name: t.name, date: new Date(t.date), month: t.month }));
        const saju = calculateSaju(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), false, undefined, null, undefined, dbSolarTerms);
        setCurrentSaju(saju);
      } catch (e) { console.error(e); }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [solarTermsData]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      {currentSaju ? (
        <CurrentTimeTable
          saju={currentSaju}
          title="현재 만세력"
          solarDate={getSolarDate()}
          isOffline={navigator.onLine === false}
          announcements={announcements}
        />
      ) : (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">만세력 로딩 중...</p>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '20px' }}>
        {[
          { label: '만세력', icon: '📅', path: '/manseryeok' },
          { label: '사주불러오기', icon: '📂', path: '/saju-list' },
          { label: '역학달력', icon: '📖', path: '/calendar' },
          { label: '궁합', icon: '💑', path: '/compatibility' },
          { label: '사주공부', icon: '🎓', path: '' },
          { label: '감정중인사주', icon: '⭐', path: '' },
        ].map(item => (
          <div key={item.label} onClick={() => item.path && setLocation(item.path)}
            style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', border: '1px solid #e8e0d0' }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
            onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)')}
          >
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{item.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3d2c1a' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}