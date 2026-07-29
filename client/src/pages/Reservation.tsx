import React from "react";
import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { generateCalendarMonth, getCalendarInfo, CalendarDayData, calculateDayGanji } from "@/lib/calendar-calculator";
import { requestAlarmPermission } from "@/lib/reservation-alarms";

const ALARM_OPTIONS = [
  { value: '1min', label: '1분 전 (테스트)' },
  { value: '10min', label: '10분 전' },
  { value: '30min', label: '30분 전' },
  { value: '1hour', label: '1시간 전' },
  { value: '1day', label: '1일 전' },
  { value: '3day', label: '3일 전' },
];

// 현재 시각이 포함된 30분 단위 시간대를 반환 (예: 13:12 → 13:00, 13:42 → 13:30)
const getCurrentTimeSlot = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(Math.floor(now.getMinutes() / 10) * 10).padStart(2, '0');
  return `${h}:${m}`;
};

// 전화번호 자동 하이픈: 010-1234-5678 형식
const formatPhone = (value: string) => {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length < 4) return nums;
  if (nums.length < 8) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
};

interface Reservation {
  id: string;
  title: string;
  date: string;
  time: string;
  phone?: string;
  content: string | null;
  amount?: number;
  alarms?: { id: string; timing: string; }[];
}

interface FormProps {
  view: 'form' | 'edit';
  selectedDate: string | null;
  setSelectedDate: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  time: string; setTime: (v: string) => void;
  content: string; setContent: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  sendMsg: boolean; setSendMsg: (v: boolean) => void;
  phoneConsult: boolean; setPhoneConsult: (v: boolean) => void;
  amount: string; setAmount: (v: string) => void;
  alarms: string[]; setAlarms: (v: string[]) => void;
  timeOptions: string[];
  onCancel: () => void;
  onSave: () => void;
  onCopyMessage: () => void;
  isPending: boolean;
  toast: any;
  updateMutation: any;
  createMutation: any;
}

function ScheduleForm({ view, selectedDate, setSelectedDate, title, setTitle, time, setTime, content, setContent, phone, setPhone, sendMsg, setSendMsg, phoneConsult, setPhoneConsult, amount, setAmount, alarms, setAlarms, timeOptions, onCancel, onCopyMessage, toast, updateMutation, createMutation }: FormProps) {
  const addAlarm = () => setAlarms([...alarms, '10min']);
  const removeAlarm = (idx: number) => setAlarms(alarms.filter((_, i) => i !== idx));
  const changeAlarm = (idx: number, value: string) => setAlarms(alarms.map((a, i) => i === idx ? value : a));

  // Enter로 다음 입력칸 이동 (data-field 순서대로)
  const goNextField = (e: React.KeyboardEvent, nextField: string) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = document.querySelector<HTMLElement>(`[data-field="${nextField}"]`);
    if (next) next.focus();
  };

  // 시간 옵션(144개)을 매 입력마다 다시 만들지 않도록 1회만 생성 (타이핑 지연 방지)
  const timeOptionEls = useMemo(() => timeOptions.map(t => <option key={t} value={t}>{t}</option>), [timeOptions]);

  return (
    <div className="max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onCancel} className="mb-3">
        <ArrowLeft className="w-4 h-4 mr-1" /> 달력으로
      </Button>
      <Card className="p-5">
        <div className="text-lg font-bold mb-4">{selectedDate} {view === 'edit' ? '스케줄 수정' : '새 스케줄'}</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="스케줄 제목"
              data-field="title" autoFocus onKeyDown={e => goNextField(e, 'time')}
              className="w-full px-3 py-2 rounded-md border text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">일시</label>
            <div className="flex gap-2">
              <input type="date" value={selectedDate || ''} onChange={e => setSelectedDate(e.target.value)} className="flex-1 px-3 py-2 rounded-md border text-sm" />
              <select value={time} onChange={e => setTime(e.target.value)}
                data-field="time" onKeyDown={e => goNextField(e, 'phone')}
                className="flex-1 px-3 py-2 rounded-md border text-sm">
                {timeOptionEls}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">전화번호</label>
            <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000"
              maxLength={13} inputMode="numeric"
              data-field="phone" onKeyDown={e => goNextField(e, 'amount')}
              className="w-full px-3 py-2 rounded-md border text-sm" />
            <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={sendMsg} onChange={e => setSendMsg(e.target.checked)} />
              저장 시 예약 안내 메시지 자동 발송
            </label>
            <label className="flex items-center gap-2 mt-1 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={phoneConsult} onChange={e => setPhoneConsult(e.target.checked)} />
              전화상담 (주소 없이 전화상담 안내로 발송)
            </label>
            <Button type="button" variant="outline" size="sm" className="mt-2 w-full"
              onClick={onCopyMessage}>
              📋 안내 메시지 미리보기 · 복사
            </Button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">금액</label>
            <div className="flex items-center gap-1">
              <input value={amount ? Number(amount).toLocaleString() : ''} 
  onChange={e => setAmount(e.target.value.replace(/[^0-9,]/g, '').replace(/,/g, ''))}
  data-field="amount" onKeyDown={e => goNextField(e, 'content')}
  placeholder="0" className="flex-1 px-3 py-2 rounded-md border text-sm text-right" />
              <span className="text-sm text-gray-500">원</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">상세내용</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="상세 내용을 입력하세요... (Ctrl+Enter로 다음)"
              data-field="content"
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); const n = document.querySelector<HTMLElement>('[data-field="alarm"]'); if (n) n.focus(); } }}
              className="w-full h-24 px-3 py-2 rounded-md border text-sm resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">알람</label>
            {alarms.map((a, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select value={a} onChange={e => changeAlarm(idx, e.target.value)}
                  data-field={idx === 0 ? 'alarm' : undefined}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const btn = document.querySelector<HTMLElement>('[data-field="save"]'); if (btn) btn.focus(); } }}
                  className="flex-1 px-3 py-2 rounded-md border text-sm">
                  {ALARM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {alarms.length > 1 && <Button variant="outline" size="sm" onClick={() => removeAlarm(idx)} className="text-destructive">삭제</Button>}
              </div>
            ))}
            <div onClick={addAlarm} className="text-xs text-primary underline cursor-pointer">+ 알람추가</div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onCancel}>취소</Button>
          <Button className="flex-1"
            data-field="save"
            onClick={() => {
              if (!title.trim()) { toast({ title: "제목을 입력해주세요", variant: "destructive", duration: 1000 }); return; }
              view === 'edit' ? updateMutation.mutate() : createMutation.mutate();
            }}
            disabled={view === 'edit' ? updateMutation.isPending : createMutation.isPending}
          >
            {view === 'edit' ? (updateMutation.isPending ? "수정 중..." : "수정") : (createMutation.isPending ? "저장 중..." : "저장")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ReservationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'form' | 'edit'>('calendar');
  // 보기 모드: 월간(기존) / 주간(이번 주 7칸) / 일간(하루 크게)
  const [calMode, setCalMode] = useState<'month' | 'week' | 'day'>('month');
  const todayStr0 = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [anchorDate, setAnchorDate] = useState<string>(todayStr0); // 주간·일간 보기의 기준 날짜
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Reservation[] | null>(null);

  // 알람(휴대폰 알림) 권한 상태. 'granted'가 아니면 알람이 울리지 않으므로 켜기 버튼을 보여줍니다.
  const [alarmPerm, setAlarmPerm] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const handleEnableAlarm = async () => {
    const result = await requestAlarmPermission();
    setAlarmPerm(result);
    if (result === 'granted') {
      toast({ title: '알람이 켜졌습니다', description: '예약 시각 전에 알림으로 알려드립니다.', duration: 3000 });
    } else if (result === 'denied') {
      toast({
        title: '알림이 차단되어 있습니다',
        description: '휴대폰 설정 → 앱 알림에서 허용해주세요. 그전까지는 앱 화면 안에서만 알려드립니다.',
        variant: 'destructive', duration: 6000,
      });
    } else if (result === 'unsupported') {
      toast({ title: '이 기기에서는 알림을 쓸 수 없습니다', description: '앱 화면 안에서만 알려드립니다.', duration: 4000 });
    }
  };
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showAllPopup, setShowAllPopup] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [time, setTime] = useState(getCurrentTimeSlot());
  const [content, setContent] = useState('');
  const [alarms, setAlarms] = useState<string[]>(['10min']);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [sendMsg, setSendMsg] = useState(false);
  const [phoneConsult, setPhoneConsult] = useState(false);

  const calendarData = useMemo(() => generateCalendarMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const monthEndDay = new Date(currentYear, currentMonth, 0).getDate();
  const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;

  // 날짜 문자열(YYYY-MM-DD) ↔ Date 변환 헬퍼
  const ymdToDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dateToYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // 주간 보기: anchorDate가 속한 주(일~토) 7일
  const weekDates = useMemo(() => {
    const base = ymdToDate(anchorDate);
    const sunday = new Date(base); sunday.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(sunday); d.setDate(sunday.getDate() + i); return d; });
  }, [anchorDate]);

  // 보기 모드별 데이터 조회 범위
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (calMode === 'day') return { rangeStart: anchorDate, rangeEnd: anchorDate };
    if (calMode === 'week') return { rangeStart: dateToYmd(weekDates[0]), rangeEnd: dateToYmd(weekDates[6]) };
    return { rangeStart: monthStart, rangeEnd: monthEnd };
  }, [calMode, anchorDate, weekDates, monthStart, monthEnd]);

  const { data: reservationsData, refetch } = useQuery<{ success: boolean; data: Reservation[] }>({
    queryKey: ["reservations-page", rangeStart, rangeEnd],
    queryFn: async () => {
      const res = await fetch(`/api/reservations?start=${rangeStart}&end=${rangeEnd}`);
      return await res.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 10000,
  });

  const reservations = reservationsData?.data || [];

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    Object.values(map).forEach(list => list.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [reservations]);

  const timeOptions = useMemo(() => {
    const list: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 10, 20, 30, 40, 50]) {
        list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return list;
  }, []);

  const handlePrevMonth = () => { if (currentMonth === 1) { setCurrentYear(p => p - 1); setCurrentMonth(12); } else setCurrentMonth(p => p - 1); };
  const handleNextMonth = () => { if (currentMonth === 12) { setCurrentYear(p => p + 1); setCurrentMonth(1); } else setCurrentMonth(p => p + 1); };
  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth() + 1);
    setAnchorDate(dateToYmd(now));
  };
  // 보기 모드별 이전/다음 (월간=한 달, 주간=7일, 일간=1일)
  const shiftAnchor = (days: number) => { const d = ymdToDate(anchorDate); d.setDate(d.getDate() + days); setAnchorDate(dateToYmd(d)); };
  const handlePrev = () => { if (calMode === 'month') handlePrevMonth(); else shiftAnchor(calMode === 'week' ? -7 : -1); };
  const handleNext = () => { if (calMode === 'month') handleNextMonth(); else shiftAnchor(calMode === 'week' ? 7 : 1); };

  // ── 휠(PC)·스와이프(앱)로 달 넘기기 ──────────────────────────
  // 달력 맨 아래에서 아래로 휠/스와이프 → 다음달, 맨 위에서 위로 → 이전달.
  const scrollRef = useRef<HTMLDivElement>(null);
  const navCooldownRef = useRef(0);
  const touchStartYRef = useRef(0);
  const navByGesture = (dir: 'prev' | 'next') => {
    const now = Date.now();
    if (now - navCooldownRef.current < 500) return; // 한 제스처에 여러 달 넘어가는 것 방지
    navCooldownRef.current = now;
    if (dir === 'next') handleNext(); else handlePrev();
    // 다음 달로 넘어가면 스크롤을 위로 되돌려, 이어서 또 넘기기 쉽게 한다
    if (scrollRef.current) scrollRef.current.scrollTop = dir === 'next' ? 0 : Math.max(0, scrollRef.current.scrollHeight);
  };
  const atScrollEdges = () => {
    const el = scrollRef.current;
    if (!el) return { atTop: true, atBottom: true };
    return {
      atTop: el.scrollTop <= 2,
      atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
    };
  };
  const handleWheel = (e: React.WheelEvent) => {
    const { atTop, atBottom } = atScrollEdges();
    if (e.deltaY > 0 && atBottom) navByGesture('next');
    else if (e.deltaY < 0 && atTop) navByGesture('prev');
  };
  const handleTouchStart = (e: React.TouchEvent) => { touchStartYRef.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartYRef.current; // >0 아래로 스와이프, <0 위로 스와이프
    if (Math.abs(dy) < 50) return; // 탭·짧은 이동은 무시
    const { atTop, atBottom } = atScrollEdges();
    if (dy < 0 && atBottom) navByGesture('next');   // 위로 스와이프 + 맨 아래 → 다음달
    else if (dy > 0 && atTop) navByGesture('prev');  // 아래로 스와이프 + 맨 위 → 이전달
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const res = await fetch('/api/reservations');
    const json = await res.json();
    if (json.success) {
      const q = searchQuery.trim().toLowerCase();
      setSearchResults(json.data.filter((r: Reservation) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q)
      ));
    }
  };

  const resetForm = () => { setTitle(''); setContent(''); setAlarms(['10min']); setTime(getCurrentTimeSlot()); setAmount(''); setPhone(''); setSendMsg(false); setPhoneConsult(false); setEditingReservation(null); };

  const openNewForm = (dateStr: string) => {
    resetForm();
    setSelectedDate(dateStr);
    setPopupDate(null);
    setShowAllPopup(false);
    setSelectedReservation(null);
    setView('form');
  };

  const openEditForm = (r: Reservation) => {
    setEditingReservation(r);
    setSelectedDate(r.date);
    setTitle(r.title);
    setTime(r.time);
    setContent(r.content || '');
    setAmount(r.amount ? String(r.amount) : '');
    setPhone(r.phone || '');
    setSendMsg(false);
    setPhoneConsult(false);
    setAlarms(r.alarms && r.alarms.length > 0 ? r.alarms.map(a => a.timing) : ['10min']);
    setPopupDate(null);
    setShowAllPopup(false);
    setSelectedReservation(null);
    setView('edit');
  };

  // 예약 안내 메시지 발송 (톡설정의 방식대로: 복사/문자/알림톡)
  const sendReservationMessage = async (info: { phone: string; name: string; date: string; time: string; phoneConsult?: boolean }) => {
    try {
      const res = await fetch('/api/reservation-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '발송 실패');
      if (json.mode === 'copy') {
        await navigator.clipboard.writeText(json.message);
        toast({ title: "안내 메시지 복사 완료", description: "카톡 채팅창에 붙여넣기(Ctrl+V) 하세요.", duration: 3500 });
      } else {
        toast({ title: "안내 메시지 발송 완료", description: `${info.phone} 로 발송했습니다.`, duration: 2500 });
      }
    } catch (e: any) {
      toast({ title: "안내 메시지 실패", description: e?.message || '발송 오류', variant: "destructive", duration: 3500 });
    }
  };

  // 수동: 현재 입력값으로 안내 메시지를 만들어 클립보드에 복사
  const handleCopyMessage = async () => {
    if (!title.trim()) { toast({ title: "제목(이름)을 입력해주세요", variant: "destructive", duration: 1200 }); return; }
    if (!selectedDate) { toast({ title: "날짜가 없습니다", variant: "destructive", duration: 1200 }); return; }
    try {
      const res = await fetch('/api/reservation-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: title, date: selectedDate, time, phoneConsult, forceCopy: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '복사 실패');
      await navigator.clipboard.writeText(json.message);
      toast({ title: "안내 메시지 복사 완료", description: "카톡 채팅창에 붙여넣기(Ctrl+V) 하세요.", duration: 3500 });
    } catch (e) {
      toast({ title: "복사 실패", description: e?.message || '오류', variant: "destructive", duration: 3000 });
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: selectedDate, time, content, phone, amount: amount ? Number(amount) : 0, alarms }),
      });
      const json = await res.json();
      if (!json.success) {
        if (res.status === 401) throw new Error('로그인이 필요합니다.');
        throw new Error(json.error || '스케줄 등록 실패');
      }
      return json.data;
    },
    onSuccess: () => {
      refetch();
      toast({ title: "등록 완료", duration: 1000 });
      if ((sendMsg || phoneConsult) && selectedDate) {
        sendReservationMessage({ phone, name: title, date: selectedDate, time, phoneConsult });
      }
      resetForm();
      setView('calendar');
    },
    onError: (e: Error) => { toast({ title: "등록 실패", description: e.message, variant: "destructive", duration: 1500 }); }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingReservation) return;
      const res = await fetch(`/api/reservations/${editingReservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: selectedDate, time, content, phone, amount: amount ? Number(amount) : 0, alarms }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '수정 실패');
      return json.data;
    },
    onSuccess: () => { refetch(); toast({ title: "수정 완료", duration: 1000 }); if ((sendMsg || phoneConsult) && selectedDate) { sendReservationMessage({ phone, name: title, date: selectedDate, time, phoneConsult }); } resetForm(); setView('calendar'); },
    onError: (e: Error) => { toast({ title: "수정 실패", description: e.message, variant: "destructive", duration: 1500 }); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '삭제 실패');
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData(["reservations-page", rangeStart, rangeEnd], (old: any) =>
        old && old.data ? { ...old, data: old.data.filter((r: Reservation) => r.id !== id) } : old);
      setPopupDate(null); setSelectedReservation(null); toast({ title: "삭제 완료", duration: 800 });
    },
    onError: (e: Error) => { toast({ title: "삭제 실패", description: e.message, variant: "destructive", duration: 1500 }); }
  });

  const popupReservations = popupDate ? (reservationsByDate[popupDate] || []) : [];

  const renderDayCell = (dayData: CalendarDayData) => {
    const isToday = dayData.isToday;
    const isSunday = dayData.dayOfWeek === 0;
    const isSaturday = dayData.dayOfWeek === 6;
    const isHoliday = (dayData as any).isHoliday;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayData.solarDay).padStart(2, '0')}`;
    const dayReservations = dayData.isCurrentMonth ? (reservationsByDate[dateStr] || []) : [];

    return (
      <div
        key={`${dayData.solarDate.getTime()}`}
        onClick={() => {
          if (!dayData.isCurrentMonth) return;
          // 칸의 빈 공간을 누르면 그 날짜에 새 스케줄을 추가합니다.
          // (기존 일정 글자는 아래에서 stopPropagation으로 별도 처리되어 이 핸들러가 실행되지 않습니다.)
          openNewForm(dateStr);
        }}
        style={{ borderRight: '0.5px solid #ddd', borderTop: '0.5px solid #ddd', cursor: dayData.isCurrentMonth ? 'pointer' : 'default', minHeight: 'clamp(80px, 12vh, 200px)' }}
        className={`relative flex flex-col pt-0.5 pl-1 pr-1 pb-0.5
          ${!dayData.isCurrentMonth ? 'bg-gray-50' : ''}
          ${dayData.isCurrentMonth && !isHoliday && isSunday ? 'bg-red-50/30' : ''}
          ${dayData.isCurrentMonth && isSaturday ? 'bg-blue-50/30' : ''}
          ${dayData.isCurrentMonth && !isSunday && !isSaturday ? 'bg-white' : ''}
          ${isToday ? '!bg-indigo-50' : ''}
          hover:bg-indigo-50/60
        `}
      >
        <div className="flex items-baseline gap-1">
          <span className={`font-bold leading-none
            ${isToday ? 'text-indigo-600' : ''}
            ${!isToday && (isSunday || isHoliday) ? 'text-red-500' : ''}
            ${!isToday && isSaturday && !isHoliday ? 'text-blue-500' : ''}
            ${!isToday && !isSunday && !isSaturday && !isHoliday && dayData.isCurrentMonth ? 'text-gray-800' : ''}
            ${!dayData.isCurrentMonth ? 'text-gray-300' : ''}
          `} style={{ fontSize: 'clamp(14px, 1.1vw, 20px)' }}>{dayData.solarDay}</span>
          {dayData.lunarDayGanji && dayData.isCurrentMonth && (
            <span className="text-gray-500 leading-none" style={{ fontSize: 'clamp(12px, 0.9vw, 16px)' }}>{dayData.lunarDayGanji.sky}{dayData.lunarDayGanji.earth}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
          {dayReservations.slice(0, 3).map(r => (
            <div key={r.id}
              onClick={e => { e.stopPropagation(); setShowAllPopup(false); setSelectedReservation(r); setPopupDate(dateStr); }}
              className="truncate text-black font-medium cursor-pointer hover:text-emerald-700"
              style={{ fontSize: 'clamp(13px, 0.95vw, 18px)', lineHeight: '1.3' }}>
              {r.time} {r.title}
            </div>
          ))}
          {dayReservations.length > 3 && (
            <div onClick={e => { e.stopPropagation(); setShowAllPopup(true); setSelectedReservation(null); setPopupDate(dateStr); }}
              className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
              +{dayReservations.length - 3}개 더보기
            </div>
          )}
        </div>
      </div>
    );
  };

  // 요일 한글
  const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

  // 한 날짜 컬럼(주간 보기의 세로 칸): 그 날의 모든 일정을 전부 표시
  const renderDayColumn = (d: Date, tall: boolean) => {
    const dateStr = dateToYmd(d);
    const list = reservationsByDate[dateStr] || [];
    const ganji = calculateDayGanji(d);
    const dow = d.getDay();
    const isToday = dateStr === todayStr0;
    return (
      <div key={dateStr} className="flex flex-col" style={{ borderRight: '0.5px solid #ddd', minHeight: tall ? '70vh' : undefined }}>
        <div onClick={() => openNewForm(dateStr)}
          className={`px-2 py-1.5 cursor-pointer hover:bg-indigo-50 ${isToday ? 'bg-indigo-50' : 'bg-white'}`}
          style={{ borderBottom: '0.5px solid #ddd' }} title="이 날짜에 새 스케줄 추가">
          <div className="flex items-baseline gap-1.5">
            <span className={`font-bold ${dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-800'} ${isToday ? '!text-indigo-600' : ''}`} style={{ fontSize: 16 }}>
              {d.getMonth() + 1}/{d.getDate()}({WEEKDAY_KR[dow]})
            </span>
            <span className="text-gray-500" style={{ fontSize: 13 }}>{ganji.sky}{ganji.earth}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1 p-1.5 overflow-y-auto" onClick={() => openNewForm(dateStr)} style={{ cursor: 'pointer' }}>
          {list.length === 0 ? (
            <div className="text-gray-300 text-center mt-2" style={{ fontSize: 12 }}>+ 추가</div>
          ) : list.map(r => (
            <div key={r.id} onClick={e => { e.stopPropagation(); openEditForm(r); }}
              className="rounded px-2 py-1 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
              style={{ borderLeft: '3px solid #10b981' }}>
              <div className="font-semibold text-gray-800" style={{ fontSize: 14 }}>{r.time}</div>
              <div className="text-gray-700 break-words" style={{ fontSize: 14, lineHeight: 1.35 }}>{r.title}</div>
              {r.amount ? <div className="text-gray-500" style={{ fontSize: 12 }}>{r.amount.toLocaleString()}원</div> : null}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (view === 'form' || view === 'edit') {
    return (
      <div className="w-full h-screen p-3 overflow-y-auto">
        <ScheduleForm
          view={view}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          title={title} setTitle={setTitle}
          time={time} setTime={setTime}
          content={content} setContent={setContent}
          phone={phone} setPhone={setPhone}
          sendMsg={sendMsg} setSendMsg={setSendMsg} phoneConsult={phoneConsult} setPhoneConsult={setPhoneConsult}
          amount={amount} setAmount={setAmount}
          alarms={alarms} setAlarms={setAlarms}
          timeOptions={timeOptions}
          onCancel={() => { resetForm(); setView('calendar'); }}
          onSave={() => {}}
          onCopyMessage={handleCopyMessage}
          isPending={view === 'edit' ? updateMutation.isPending : createMutation.isPending}
          toast={toast}
          updateMutation={updateMutation}
          createMutation={createMutation}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-screen p-3 overflow-y-auto" data-testid="reservation-calendar"
      ref={scrollRef} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {searchResults && (
        <div className="mb-3 border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 text-sm font-medium border-b">검색 결과 {searchResults.length}건</div>
          {searchResults.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">결과가 없습니다</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {searchResults.map(r => (
                <div key={r.id} onClick={() => openEditForm(r)}
                  className="px-3 py-2 border-b hover:bg-gray-50 cursor-pointer text-sm">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-gray-400 text-xs">{r.date} {r.time}{r.amount ? ` · ${r.amount.toLocaleString()}원` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Card className="overflow-hidden shadow-sm" style={{ border: '0.5px solid #ddd' }}>
        <CardHeader className="p-0">
          <div className="px-4 py-3 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div />
              <div className="text-lg font-bold text-gray-800">
                {calMode === 'month' && `스케줄 ${currentYear}년 ${currentMonth}월`}
                {calMode === 'week' && `${weekDates[0].getMonth() + 1}월 ${weekDates[0].getDate()}일 ~ ${weekDates[6].getMonth() + 1}월 ${weekDates[6].getDate()}일`}
                {calMode === 'day' && (() => { const ad = ymdToDate(anchorDate); return `${ad.getFullYear()}년 ${ad.getMonth() + 1}월 ${ad.getDate()}일 (${WEEKDAY_KR[ad.getDay()]})`; })()}
              </div>
              {/* 일/주/월 보기 전환 */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {([['day', '일'], ['week', '주'], ['month', '월']] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => setCalMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${calMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {calMode === 'month' && (
                  <button onClick={() => setCurrentYear(p => p - 1)} className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">
                    <ChevronsLeft className="w-3.5 h-3.5" /><span>년</span>
                  </button>
                )}
                <button onClick={handlePrev} className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">
                  <ChevronLeft className="w-3.5 h-3.5" /><span>{calMode === 'month' ? '월' : calMode === 'week' ? '주' : '일'}</span>
                </button>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="검색..." className="px-2 py-1 rounded-lg border text-xs w-32" />
                <button onClick={handleSearch} className="px-2 py-1 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600">검색</button>
                {searchResults && <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} className="px-2 py-1 border rounded-lg text-xs">✕</button>}
                {/* 알람은 휴대폰 알림 권한이 있어야 울립니다. 권한 요청은 버튼을 눌러야만 띄울 수 있습니다. */}
                {alarmPerm !== 'granted' && (
                  <button onClick={handleEnableAlarm}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 whitespace-nowrap">
                    🔔 알람 켜기
                  </button>
                )}
              </div>
              <button onClick={handleToday} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600">오늘</button>
              <div className="flex items-center gap-1.5">
                <button onClick={handleNext} className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">
                  <span>{calMode === 'month' ? '월' : calMode === 'week' ? '주' : '일'}</span><ChevronRight className="w-3.5 h-3.5" />
                </button>
                {calMode === 'month' && (
                  <button onClick={() => setCurrentYear(p => p + 1)} className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">
                    <span>년</span><ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {calMode === 'month' && (
            <div className="grid grid-cols-7" style={{ borderTop: '0.5px solid #ddd', borderLeft: '0.5px solid #ddd' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={day} style={{ borderRight: '0.5px solid #ddd' }}
                  className={`text-center text-sm font-semibold py-1.5
                    ${index === 0 ? 'text-red-500' : ''}
                    ${index === 6 ? 'text-blue-500' : ''}
                    ${index !== 0 && index !== 6 ? 'text-gray-500' : ''}
                  `}>{day}</div>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {calMode === 'month' && (
            <div className="grid grid-cols-7" style={{ borderLeft: '0.5px solid #ddd', borderBottom: '0.5px solid #ddd' }}>
              {calendarData.flat().map(dayData => renderDayCell(dayData))}
            </div>
          )}
          {calMode === 'week' && (
            <div className="grid grid-cols-7" style={{ borderLeft: '0.5px solid #ddd', borderBottom: '0.5px solid #ddd' }}>
              {weekDates.map(d => renderDayColumn(d, true))}
            </div>
          )}
          {calMode === 'day' && (
            <div style={{ borderLeft: '0.5px solid #ddd', borderBottom: '0.5px solid #ddd' }}>
              {renderDayColumn(ymdToDate(anchorDate), true)}
            </div>
          )}
        </CardContent>
      </Card>

      {popupDate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={() => { setPopupDate(null); setSelectedReservation(null); setShowAllPopup(false); }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff', borderRadius: '12px', width: '380px', maxHeight: '80vh',
            overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '16px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedReservation && (
                  <button onClick={() => setSelectedReservation(null)}
                    style={{ fontSize: '12px', color: '#888', background: 'none', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                    ← 목록
                  </button>
                )}
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{popupDate}</div>
              </div>
              <button onClick={() => { setPopupDate(null); setSelectedReservation(null); }}
                style={{ fontSize: '18px', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            {popupReservations.length === 0 ? (
              <div style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>스케줄이 없습니다</div>
            ) : (
              <div style={{ marginBottom: '12px' }}>
                {(selectedReservation ? [selectedReservation] : showAllPopup ? popupReservations : popupReservations.slice(0, 3)).map(r => (
                  <div key={r.id}
                    style={{ padding: '12px', border: '1px solid #e0d8cc', borderRadius: '8px', marginBottom: '8px', backgroundColor: '#faf7f2' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>{r.time} {r.title}</div>
                    <div style={{ fontSize: '13px', color: '#555', marginBottom: '10px' }}>
                      <div>📅 {r.date} {r.time}{r.amount ? ` · ${r.amount.toLocaleString()}원` : ''}</div>
                      {r.phone && <div>📞 {r.phone}</div>}
                      {r.content && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '6px', lineHeight: '1.5' }}>
                          {r.content}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={e => { e.stopPropagation(); openEditForm(r); }}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #3d2c1a', fontSize: '13px', cursor: 'pointer', background: '#fff', color: '#3d2c1a', fontWeight: 'bold' }}>
                        ✏️ 수정
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(r.id); }}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #fcc', fontSize: '13px', cursor: 'pointer', background: '#fff5f5', color: '#c0392b', fontWeight: 'bold' }}>
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => openNewForm(popupDate)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#3d2c1a', color: '#f5d78e', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              + 새 스케줄 등록
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', width: '300px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: '#222' }}>이 스케줄을 삭제할까요?</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
              <button onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) deleteMutation.mutate(id); }}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#c0392b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
