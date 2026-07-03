import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, FolderOpen, Save, X, Heart } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import SajuTable from "@/components/SajuTable";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateCompleteDaeun, calculateCurrentAge, findCurrentDaeun, DaeunPeriod } from "@/lib/daeun-calculator";
import { CHEONGAN, JIJI, calculateSaju, CHEONGAN_WUXING, JIJI_WUXING } from "@/lib/saju-calculator";
import { getSolarTermsForCalculation } from "@/lib/solar-terms-data";
import { localDB } from "@/lib/saju-local-storage";
import { TRADITIONAL_TIME_PERIODS, SajuRecord } from "@shared/schema";
import { Solar } from "lunar-javascript";

function getNextGanji(sky: string, earth: string) {
  const skyIndex = CHEONGAN.indexOf(sky as any);
  const earthIndex = JIJI.indexOf(earth as any);
  if (skyIndex === -1 || earthIndex === -1) throw new Error(`Invalid ganji: ${sky}${earth}`);
  return {
    sky: CHEONGAN[(skyIndex + 1) % CHEONGAN.length],
    earth: JIJI[(earthIndex + 1) % JIJI.length]
  };
}

function getPrevGanji(sky: string, earth: string) {
  const skyIndex = CHEONGAN.indexOf(sky as any);
  const earthIndex = JIJI.indexOf(earth as any);
  if (skyIndex === -1 || earthIndex === -1) throw new Error(`Invalid ganji: ${sky}${earth}`);
  return {
    sky: CHEONGAN[(skyIndex - 1 + CHEONGAN.length) % CHEONGAN.length],
    earth: JIJI[(earthIndex - 1 + JIJI.length) % JIJI.length]
  };
}

function calculateSaeun(birthYear: number, startSky: string, startEarth: string, windowSize: number = 12, offsetAge: number = 0) {
  const years: number[] = [], ages: number[] = [], skyStems: string[] = [], earthBranches: string[] = [];
  let currentSky = startSky, currentEarth = startEarth;
  const next = getNextGanji(currentSky, currentEarth);
  currentSky = next.sky; currentEarth = next.earth;
  const startAge = Math.max(1, offsetAge + 1);
  const startYear = birthYear + startAge;
  const adjustedOffset = startAge - 1;
  if (adjustedOffset >= 0) {
    for (let i = 0; i < adjustedOffset; i++) { const n = getNextGanji(currentSky, currentEarth); currentSky = n.sky; currentEarth = n.earth; }
  } else {
    for (let i = 0; i < Math.abs(adjustedOffset); i++) { const p = getPrevGanji(currentSky, currentEarth); currentSky = p.sky; currentEarth = p.earth; }
  }
  for (let i = 0; i < windowSize; i++) {
    years.push(startYear + i); ages.push(startAge + i); skyStems.push(currentSky); earthBranches.push(currentEarth);
    const n = getNextGanji(currentSky, currentEarth); currentSky = n.sky; currentEarth = n.earth;
  }
  return { years, ages, skyStems, earthBranches };
}

type SajuResultData = SajuRecord;
type DisplayMode = 'base' | 'daeun' | 'saeun';
interface SaeunInfo { age: number; sky: string; earth: string; }

export default function Compatibility() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();

  // 화면 진입 시 초기화
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (!params.get('left') && !params.get('right')) {
      localStorage.removeItem('compatibility_left_id');
      localStorage.removeItem('compatibility_right_id');
    }
  }, []);

  const [leftSajuId, setLeftSajuId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('left') || null;
    }
    return null;
  });
  const [rightSajuId, setRightSajuId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('right') || null;
    }
    return null;
  });

  const [showLeftDialog, setShowLeftDialog] = useState(false);
  const [showRightDialog, setShowRightDialog] = useState(false);
  const [leftMemo, setLeftMemo] = useState<string>("");
  const [rightMemo, setRightMemo] = useState<string>("");

  const [leftDisplayMode, setLeftDisplayMode] = useState<DisplayMode>('base');
  const [leftFocusedDaeun, setLeftFocusedDaeun] = useState<DaeunPeriod | null>(null);
  const [leftFocusedSaeun, setLeftFocusedSaeun] = useState<SaeunInfo | null>(null);
  const [leftSaeunOffset, setLeftSaeunOffset] = useState(0);

  const [rightDisplayMode, setRightDisplayMode] = useState<DisplayMode>('base');
  const [rightFocusedDaeun, setRightFocusedDaeun] = useState<DaeunPeriod | null>(null);
  const [rightFocusedSaeun, setRightFocusedSaeun] = useState<SaeunInfo | null>(null);
  const [rightSaeunOffset, setRightSaeunOffset] = useState(0);

  useEffect(() => {
    if (leftSajuId) localStorage.setItem('compatibility_left_id', leftSajuId);
    else localStorage.removeItem('compatibility_left_id');
  }, [leftSajuId]);

  useEffect(() => {
    if (rightSajuId) localStorage.setItem('compatibility_right_id', rightSajuId);
    else localStorage.removeItem('compatibility_right_id');
  }, [rightSajuId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const leftId = params.get('left');
    const rightId = params.get('right');
    if (leftId) setLeftSajuId(leftId);
    if (rightId) setRightSajuId(rightId);
  }, [searchParams]);

  const { data: leftSaju, isLoading: leftLoading, error: leftError } = useQuery<SajuResultData>({
    queryKey: ['local-saju-records', leftSajuId],
    queryFn: async () => {
      if (!leftSajuId) throw new Error('No left saju ID');
      const record = await localDB.getSajuRecord(leftSajuId);
      if (!record) throw new Error('Left saju not found');
      return record;
    },
    enabled: !!leftSajuId,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  useEffect(() => { if (leftSaju?.memo) setLeftMemo(leftSaju.memo); }, [leftSaju]);

  const { data: rightSaju, isLoading: rightLoading, error: rightError } = useQuery<SajuResultData>({
    queryKey: ['local-saju-records', rightSajuId],
    queryFn: async () => {
      if (!rightSajuId) throw new Error('No right saju ID');
      const record = await localDB.getSajuRecord(rightSajuId);
      if (!record) throw new Error('Right saju not found');
      return record;
    },
    enabled: !!rightSajuId,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  useEffect(() => { if (rightSaju?.memo) setRightMemo(rightSaju.memo); }, [rightSaju]);

  const leftHasGanji = leftSaju?.yearSky && leftSaju?.daySky;
  const rightHasGanji = rightSaju?.yearSky && rightSaju?.daySky;

  const leftDaeunData = useMemo(() => {
    if (!leftSaju?.yearSky || !leftSaju?.yearEarth || !leftSaju?.monthSky || !leftSaju?.monthEarth) return null;
    return calculateCompleteDaeun(leftSaju as any);
  }, [leftSaju]);

  const leftCurrentAge = useMemo(() => {
    if (!leftSaju || leftSaju.birthMonth === null || leftSaju.birthDay === null) return null;
    return calculateCurrentAge(leftSaju.birthYear, leftSaju.birthMonth, leftSaju.birthDay, leftSaju.yearSky || undefined, leftSaju.yearEarth || undefined);
  }, [leftSaju]);

  useEffect(() => {
    if (leftDaeunData && leftCurrentAge !== null) {
      const currentDaeun = findCurrentDaeun(leftCurrentAge, leftDaeunData.daeunPeriods);
      if (currentDaeun) setLeftFocusedDaeun(currentDaeun);
    }
  }, [leftDaeunData, leftCurrentAge]);

  const leftSaeunData = useMemo(() => {
    if (!leftSaju?.yearSky || !leftSaju?.yearEarth || !leftFocusedDaeun) return null;
    return calculateSaeun(leftSaju.birthYear, leftSaju.yearSky, leftSaju.yearEarth, 12, leftFocusedDaeun.startAge - 1 + leftSaeunOffset);
  }, [leftSaju, leftFocusedDaeun, leftSaeunOffset]);

  const rightDaeunData = useMemo(() => {
    if (!rightSaju?.yearSky || !rightSaju?.yearEarth || !rightSaju?.monthSky || !rightSaju?.monthEarth) return null;
    return calculateCompleteDaeun(rightSaju as any);
  }, [rightSaju]);

  const rightCurrentAge = useMemo(() => {
    if (!rightSaju || rightSaju.birthMonth === null || rightSaju.birthDay === null) return null;
    return calculateCurrentAge(rightSaju.birthYear, rightSaju.birthMonth, rightSaju.birthDay, rightSaju.yearSky || undefined, rightSaju.yearEarth || undefined);
  }, [rightSaju]);

  useEffect(() => {
    if (rightDaeunData && rightCurrentAge !== null) {
      const currentDaeun = findCurrentDaeun(rightCurrentAge, rightDaeunData.daeunPeriods);
      if (currentDaeun) setRightFocusedDaeun(currentDaeun);
    }
  }, [rightDaeunData, rightCurrentAge]);

  const rightSaeunData = useMemo(() => {
    if (!rightSaju?.yearSky || !rightSaju?.yearEarth || !rightFocusedDaeun) return null;
    return calculateSaeun(rightSaju.birthYear, rightSaju.yearSky, rightSaju.yearEarth, 12, rightFocusedDaeun.startAge - 1 + rightSaeunOffset);
  }, [rightSaju, rightFocusedDaeun, rightSaeunOffset]);

  const handleLeftDaeunClick = (daeunPeriod: DaeunPeriod) => {
    if (leftDisplayMode === 'base') {
      setLeftFocusedDaeun(daeunPeriod); setLeftDisplayMode('daeun'); setLeftSaeunOffset(0);
    } else if (leftDisplayMode === 'daeun') {
      if (leftFocusedDaeun?.startAge === daeunPeriod.startAge) { setLeftDisplayMode('base'); setLeftFocusedDaeun(null); }
      else { setLeftFocusedDaeun(daeunPeriod); setLeftSaeunOffset(0); }
    } else if (leftDisplayMode === 'saeun') {
      if (leftFocusedDaeun?.startAge === daeunPeriod.startAge) { setLeftDisplayMode('daeun'); setLeftFocusedSaeun(null); }
      else { setLeftFocusedDaeun(daeunPeriod); setLeftDisplayMode('daeun'); setLeftFocusedSaeun(null); setLeftSaeunOffset(0); }
    }
  };

  const handleLeftSaeunClick = (age: number, sky: string, earth: string) => {
    if (leftDisplayMode === 'daeun') { setLeftFocusedSaeun({ age, sky, earth }); setLeftDisplayMode('saeun'); }
    else if (leftDisplayMode === 'saeun') {
      if (leftFocusedSaeun?.age === age) { setLeftDisplayMode('daeun'); setLeftFocusedSaeun(null); }
      else setLeftFocusedSaeun({ age, sky, earth });
    }
  };

  const handleLeftSaeunScroll = (direction: 'left' | 'right') => {
    setLeftSaeunOffset(prev => direction === 'left' ? Math.max(-5, prev - 5) : Math.min(10, prev + 5));
  };

  const handleRightDaeunClick = (daeunPeriod: DaeunPeriod) => {
    if (rightDisplayMode === 'base') {
      setRightFocusedDaeun(daeunPeriod); setRightDisplayMode('daeun'); setRightSaeunOffset(0);
    } else if (rightDisplayMode === 'daeun') {
      if (rightFocusedDaeun?.startAge === daeunPeriod.startAge) { setRightDisplayMode('base'); setRightFocusedDaeun(null); }
      else { setRightFocusedDaeun(daeunPeriod); setRightSaeunOffset(0); }
    } else if (rightDisplayMode === 'saeun') {
      if (rightFocusedDaeun?.startAge === daeunPeriod.startAge) { setRightDisplayMode('daeun'); setRightFocusedSaeun(null); }
      else { setRightFocusedDaeun(daeunPeriod); setRightDisplayMode('daeun'); setRightFocusedSaeun(null); setRightSaeunOffset(0); }
    }
  };

  const handleRightSaeunClick = (age: number, sky: string, earth: string) => {
    if (rightDisplayMode === 'daeun') { setRightFocusedSaeun({ age, sky, earth }); setRightDisplayMode('saeun'); }
    else if (rightDisplayMode === 'saeun') {
      if (rightFocusedSaeun?.age === age) { setRightDisplayMode('daeun'); setRightFocusedSaeun(null); }
      else setRightFocusedSaeun({ age, sky, earth });
    }
  };

  const handleRightSaeunScroll = (direction: 'left' | 'right') => {
    setRightSaeunOffset(prev => direction === 'left' ? Math.max(-5, prev - 5) : Math.min(10, prev + 5));
  };

  const handleLeftBirthTimeChange = async (timeCode: string) => {
    if (!leftSajuId || !leftSaju) return;
    try {
      let hour = 0, minute = 0;
      const timePeriod = TRADITIONAL_TIME_PERIODS.find((p: any) => p.code === timeCode);
      if (timePeriod) { hour = timePeriod.hour; }
      else if (timeCode.includes(':')) { const parts = timeCode.split(':'); hour = parseInt(parts[0]) || 0; minute = parseInt(parts[1]) || 0; }
      else { hour = parseInt(timeCode) || 0; }
      const solarTerms = await getSolarTermsForCalculation(leftSaju.birthYear);
      const sajuData = calculateSaju(leftSaju.birthYear, leftSaju.birthMonth || 1, leftSaju.birthDay || 1, hour, minute, leftSaju.calendarType === '음력' || leftSaju.calendarType === '윤달', undefined, undefined, undefined, solarTerms);
      if (!sajuData) throw new Error('사주 계산에 실패했습니다.');
      await localDB.updateSajuRecord(leftSajuId, { birthTime: timeCode, yearSky: sajuData.year.sky, yearEarth: sajuData.year.earth, monthSky: sajuData.month.sky, monthEarth: sajuData.month.earth, daySky: sajuData.day.sky, dayEarth: sajuData.day.earth, hourSky: sajuData.hour.sky, hourEarth: sajuData.hour.earth });
      queryClient.invalidateQueries({ queryKey: ['local-saju-records', leftSajuId] });
      toast({ title: "변경 완료", description: "생시가 변경되었습니다.", duration: 1000 });
    } catch { toast({ title: "오류", description: "생시 변경에 실패했습니다.", variant: "destructive", duration: 1000 }); }
  };

  const handleRightBirthTimeChange = async (timeCode: string) => {
    if (!rightSajuId || !rightSaju) return;
    try {
      let hour = 0, minute = 0;
      const timePeriod = TRADITIONAL_TIME_PERIODS.find((p: any) => p.code === timeCode);
      if (timePeriod) { hour = timePeriod.hour; }
      else if (timeCode.includes(':')) { const parts = timeCode.split(':'); hour = parseInt(parts[0]) || 0; minute = parseInt(parts[1]) || 0; }
      else { hour = parseInt(timeCode) || 0; }
      const solarTerms = await getSolarTermsForCalculation(rightSaju.birthYear);
      const sajuData = calculateSaju(rightSaju.birthYear, rightSaju.birthMonth || 1, rightSaju.birthDay || 1, hour, minute, rightSaju.calendarType === '음력' || rightSaju.calendarType === '윤달', undefined, undefined, undefined, solarTerms);
      if (!sajuData) throw new Error('사주 계산에 실패했습니다.');
      await localDB.updateSajuRecord(rightSajuId, { birthTime: timeCode, yearSky: sajuData.year.sky, yearEarth: sajuData.year.earth, monthSky: sajuData.month.sky, monthEarth: sajuData.month.earth, daySky: sajuData.day.sky, dayEarth: sajuData.day.earth, hourSky: sajuData.hour.sky, hourEarth: sajuData.hour.earth });
      queryClient.invalidateQueries({ queryKey: ['local-saju-records', rightSajuId] });
      toast({ title: "변경 완료", description: "생시가 변경되었습니다.", duration: 1000 });
    } catch { toast({ title: "오류", description: "생시 변경에 실패했습니다.", variant: "destructive", duration: 1000 }); }
  };

  const handleLeftBirthDateChange = async (year: number, month: number, day: number) => {
    if (!leftSajuId || !leftSaju) return;
    try {
      let hour = 0, minute = 0;
      const birthTime = leftSaju.birthTime || '';
      const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === birthTime);
      if (timePeriod) { hour = timePeriod.hour; }
      else if (birthTime.includes(':')) { const parts = birthTime.split(':'); hour = parseInt(parts[0]) || 0; minute = parseInt(parts[1]) || 0; }
      else if (birthTime) { hour = parseInt(birthTime) || 0; }
      const solarTerms = await getSolarTermsForCalculation(year);
      const sajuData = calculateSaju(year, month, day, hour, minute, leftSaju.calendarType === '음력' || leftSaju.calendarType === '윤달', undefined, undefined, undefined, solarTerms);
      if (!sajuData) throw new Error('사주 계산에 실패했습니다.');
      const solar = Solar.fromYmd(year, month, day); const lunar = solar.getLunar();
      await localDB.updateSajuRecord(leftSajuId, { birthYear: year, birthMonth: month, birthDay: day, lunarYear: lunar.getYear(), lunarMonth: lunar.getMonth(), lunarDay: lunar.getDay(), isLeapMonth: (lunar as any).isLeap ? (lunar as any).isLeap() : false, yearSky: sajuData.year.sky, yearEarth: sajuData.year.earth, monthSky: sajuData.month.sky, monthEarth: sajuData.month.earth, daySky: sajuData.day.sky, dayEarth: sajuData.day.earth, hourSky: sajuData.hour.sky, hourEarth: sajuData.hour.earth });
      queryClient.invalidateQueries({ queryKey: ['local-saju-records', leftSajuId] });
      toast({ title: "변경 완료", description: "생년월일이 변경되었습니다.", duration: 1000 });
    } catch { toast({ title: "오류", description: "생년월일 변경에 실패했습니다.", variant: "destructive", duration: 1000 }); }
  };

  const handleRightBirthDateChange = async (year: number, month: number, day: number) => {
    if (!rightSajuId || !rightSaju) return;
    try {
      let hour = 0, minute = 0;
      const birthTime = rightSaju.birthTime || '';
      const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === birthTime);
      if (timePeriod) { hour = timePeriod.hour; }
      else if (birthTime.includes(':')) { const parts = birthTime.split(':'); hour = parseInt(parts[0]) || 0; minute = parseInt(parts[1]) || 0; }
      else if (birthTime) { hour = parseInt(birthTime) || 0; }
      const solarTerms = await getSolarTermsForCalculation(year);
      const sajuData = calculateSaju(year, month, day, hour, minute, rightSaju.calendarType === '음력' || rightSaju.calendarType === '윤달', undefined, undefined, undefined, solarTerms);
      if (!sajuData) throw new Error('사주 계산에 실패했습니다.');
      const solar = Solar.fromYmd(year, month, day); const lunar = solar.getLunar();
      await localDB.updateSajuRecord(rightSajuId, { birthYear: year, birthMonth: month, birthDay: day, lunarYear: lunar.getYear(), lunarMonth: lunar.getMonth(), lunarDay: lunar.getDay(), isLeapMonth: (lunar as any).isLeap ? (lunar as any).isLeap() : false, yearSky: sajuData.year.sky, yearEarth: sajuData.year.earth, monthSky: sajuData.month.sky, monthEarth: sajuData.month.earth, daySky: sajuData.day.sky, dayEarth: sajuData.day.earth, hourSky: sajuData.hour.sky, hourEarth: sajuData.hour.earth });
      queryClient.invalidateQueries({ queryKey: ['local-saju-records', rightSajuId] });
      toast({ title: "변경 완료", description: "생년월일이 변경되었습니다.", duration: 1000 });
    } catch { toast({ title: "오류", description: "생년월일 변경에 실패했습니다.", variant: "destructive", duration: 1000 }); }
  };

  const handleHomeClick = () => {
    localStorage.removeItem('compatibility_left_id');
    localStorage.removeItem('compatibility_right_id');
    setLocation('/');
  };

  // 궁합 기록 저장 로직
  const compatibilitySaveMutation = useMutation({
    mutationFn: async () => {
      if (!leftSajuId || !rightSajuId || !leftSaju || !rightSaju) throw new Error("두 명의 사주가 모두 선택되어야 합니다.");
      
      const compatibilityRecord = {
        leftSajuId: leftSajuId,
        rightSajuId: rightSajuId,
        leftName: leftSaju.name || "이름없음",
        rightName: rightSaju.name || "이름없음",
        createdAt: new Date().toISOString()
      };
      
      return await localDB.saveCompatibilityRecord(compatibilityRecord);
    },
    onSuccess: () => {
      toast({ title: "궁합 저장 완료", description: "궁합 목록에 저장되었습니다.", duration: 1000 });
      queryClient.invalidateQueries({ queryKey: ['local-compatibility-records'] });
    },
    onError: (err) => {
      toast({ title: "저장 실패", description: err.message, variant: "destructive", duration: 1000 });
    }
  });

  const { data: sajuList = [] } = useQuery<SajuResultData[]>({
    queryKey: ['local-saju-records-list'],
    queryFn: async () => await localDB.getSajuRecords(),
  });

  const renderSajuTable = (
    saju: SajuResultData, memo: string, setMemo: (m: string) => void,
    displayMode: DisplayMode, focusedDaeun: DaeunPeriod | null, focusedSaeun: SaeunInfo | null,
    saeunData: ReturnType<typeof calculateSaeun> | null, daeunData: ReturnType<typeof calculateCompleteDaeun> | null,
    currentAge: number | null, onBirthTimeChange: (t: string) => void, onBirthDateChange: (y: number, m: number, d: number) => void,
    onDaeunClick: (d: DaeunPeriod) => void, onSaeunClick: (age: number, sky: string, earth: string) => void, onSaeunScroll: (dir: 'left' | 'right') => void,
  ) => (
    <SajuTable
      saju={{
        year: { sky: saju.yearSky!, earth: saju.yearEarth || '' },
        month: { sky: saju.monthSky || '', earth: saju.monthEarth || '' },
        day: { sky: saju.daySky!, earth: saju.dayEarth || '' },
        hour: { sky: saju.hourSky || '', earth: saju.hourEarth || '' },
        wuxing: {
          yearSky: CHEONGAN_WUXING[saju.yearSky!] || '',
          yearEarth: JIJI_WUXING[saju.yearEarth || ''] || '',
          monthSky: CHEONGAN_WUXING[saju.monthSky || ''] || '',
          monthEarth: JIJI_WUXING[saju.monthEarth || ''] || '',
          daySky: CHEONGAN_WUXING[saju.daySky!] || '',
          dayEarth: JIJI_WUXING[saju.dayEarth || ''] || '',
          hourSky: saju.hourSky ? CHEONGAN_WUXING[saju.hourSky] || '' : '',
          hourEarth: saju.hourEarth ? JIJI_WUXING[saju.hourEarth] || '' : ''
        }
      }}
      name={saju.name} birthYear={saju.birthYear} birthMonth={saju.birthMonth ?? undefined} birthDay={saju.birthDay ?? undefined}
      lunarYear={saju.lunarYear ?? undefined} lunarMonth={saju.lunarMonth ?? undefined} lunarDay={saju.lunarDay ?? undefined}
      isLeapMonth={saju.isLeapMonth ?? false} birthHour={saju.birthTime || undefined} gender={saju.gender} calendarType={saju.calendarType}
      memo={memo} onMemoChange={setMemo} onBirthTimeChange={onBirthTimeChange} onBirthDateChange={onBirthDateChange}
      daeunPeriods={daeunData?.daeunPeriods || []} currentAge={currentAge || undefined}
      displayMode={displayMode} focusedDaeun={focusedDaeun} focusedSaeun={focusedSaeun} saeunData={saeunData}
      onDaeunClick={onDaeunClick} onSaeunClick={onSaeunClick} onSaeunScroll={onSaeunScroll}
      hideActions={true} 
    />
  );

  const [dialogSearch, setDialogSearch] = useState("");

  const renderDialog = (show: boolean, onClose: () => void, title: string, onSelect: (id: string) => void) => {
    const filtered = sajuList.filter(s => !dialogSearch || (s.name || '').includes(dialogSearch));
    return show && typeof document !== 'undefined' && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => { onClose(); setDialogSearch(""); }}>
        <div style={{ width: '100%', maxWidth: '360px', maxHeight: '70vh', backgroundColor: 'white', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{title}</span>
            <button onClick={() => { onClose(); setDialogSearch(""); }} style={{ padding: '2px' }}><X className="h-3.5 w-3.5 text-gray-500" /></button>
          </div>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
            <input type="text" placeholder="이름 검색..." value={dialogSearch} onChange={e => setDialogSearch(e.target.value)} style={{ width: '100%', padding: '4px 8px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', outline: 'none' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
            {filtered.map(saju => (
              <div key={saju.id} style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: '6px', borderBottom: '1px solid #f9fafb' }} onClick={() => { onSelect(saju.id); onClose(); setDialogSearch(""); }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>{saju.name || "이름없음"}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{saju.birthYear}.{saju.birthMonth}.{saju.birthDay} {saju.birthTime || ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="bg-background flex flex-col h-screen overflow-hidden">
      
      {/* 상단 공통 헤더 */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10 shrink-0">
        <Button variant="outline" size="sm" onClick={handleHomeClick} className="gap-2 h-8 text-xs px-3">
          <Home className="w-3 h-3" /> 홈
        </Button>
        <h2 className="font-bold text-base text-primary tracking-wider">궁합 보기</h2>
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => compatibilitySaveMutation.mutate()} 
          disabled={!leftSajuId || !rightSajuId || compatibilitySaveMutation.isPending}
          className="gap-2 h-8 px-3 text-xs bg-rose-500 hover:bg-rose-600 text-white"
        >
          <Heart className="w-3 h-3" /> 
          {compatibilitySaveMutation.isPending ? '저장 중...' : '궁합 저장'}
        </Button>
      </div>

      {/* 🔥 좌우 사주 영역 (그리드 설정 변경: gap-px로 1px 선 만들기, padding 완전 제거) */}
      <div className="flex-1 grid grid-cols-2 gap-[1px] bg-gray-300 dark:bg-gray-700 w-full h-full overflow-hidden">
        
        {/* 왼쪽 사주 1 */}
        <div className="bg-white dark:bg-gray-900 flex flex-col w-full h-full overflow-hidden">
          <div className="py-2 px-2 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800 shrink-0">
            <h3 className="font-semibold text-xs text-gray-700 dark:text-gray-200">나의 사주</h3>
            {leftSajuId && (
              <Button variant="ghost" size="sm" onClick={() => setLeftSajuId(null)} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary">
                변경
              </Button>
            )}
          </div>
          {/* 🔥 패딩을 완전히 제거하고(p-0) 테이블이 좌우 끝에 꽉 차게 설정 */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-0 pb-16">
            {leftLoading ? (
              <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : leftError ? (
              <div className="text-center mt-10"><Button variant="outline" size="sm" onClick={() => setShowLeftDialog(true)}>다시 선택</Button></div>
            ) : leftSajuId && leftSaju && leftHasGanji ? (
              renderSajuTable(leftSaju, leftMemo, setLeftMemo, leftDisplayMode, leftFocusedDaeun, leftFocusedSaeun, leftSaeunData, leftDaeunData, leftCurrentAge, handleLeftBirthTimeChange, handleLeftBirthDateChange, handleLeftDaeunClick, handleLeftSaeunClick, handleLeftSaeunScroll)
            ) : (
              <div className="flex items-center justify-center h-full mt-10">
                <Button onClick={() => setShowLeftDialog(true)} size="sm" className="shadow-md text-xs h-8"><FolderOpen className="w-4 h-4 mr-1" />불러오기</Button>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽 사주 2 */}
        <div className="bg-white dark:bg-gray-900 flex flex-col w-full h-full overflow-hidden">
          <div className="py-2 px-2 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800 shrink-0">
            <h3 className="font-semibold text-xs text-gray-700 dark:text-gray-200">상대방 사주</h3>
            {rightSajuId && (
              <Button variant="ghost" size="sm" onClick={() => setRightSajuId(null)} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary">
                변경
              </Button>
            )}
          </div>
          {/* 🔥 패딩을 완전히 제거하고(p-0) 테이블이 좌우 끝에 꽉 차게 설정 */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-0 pb-16">
            {rightLoading ? (
              <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : rightError ? (
              <div className="text-center mt-10"><Button variant="outline" size="sm" onClick={() => setShowRightDialog(true)}>다시 선택</Button></div>
            ) : rightSajuId && rightSaju && rightHasGanji ? (
              renderSajuTable(rightSaju, rightMemo, setRightMemo, rightDisplayMode, rightFocusedDaeun, rightFocusedSaeun, rightSaeunData, rightDaeunData, rightCurrentAge, handleRightBirthTimeChange, handleRightBirthDateChange, handleRightDaeunClick, handleRightSaeunClick, handleRightSaeunScroll)
            ) : (
              <div className="flex items-center justify-center h-full mt-10">
                <Button onClick={() => setShowRightDialog(true)} size="sm" className="shadow-md text-xs h-8"><FolderOpen className="w-4 h-4 mr-1" />불러오기</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderDialog(showLeftDialog, () => setShowLeftDialog(false), "나의 사주 선택", (id) => setLeftSajuId(id))}
      {renderDialog(showRightDialog, () => setShowRightDialog(false), "상대방 사주 선택", (id) => setRightSajuId(id))}
    </div>
  );
}