import { useEffect, useState, useRef, useMemo } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FontProvider } from "@/contexts/FontContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { generateCalendarMonth, getCalendarInfo } from "@/lib/calendar-calculator";
import Home from "@/pages/Home";
import Manseryeok from "@/pages/Manseryeok";
import Calendar from "@/pages/Calendar";
import SajuInput from "@/pages/SajuInput";
import NotFound from "@/pages/not-found";
import SajuResult from "@/pages/SajuResult";
import SajuList from "@/pages/SajuList";
import Guide from "@/pages/Guide";
import Compatibility from "@/pages/Compatibility";
import ReservationPage from "@/pages/Reservation";
import GanjiInput from "@/pages/GanjiInput";
import GanjiResult from "@/pages/GanjiResult";
import Announcements from "@/pages/Announcements";
import AnnouncementDetail from "@/pages/AnnouncementDetail";
import AnnouncementAdmin from "@/pages/AnnouncementAdmin";
import Login from "@/pages/Login";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import CacheClear from "@/pages/CacheClear";
import Admin from "@/pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/manseryeok" component={Manseryeok} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/saju-input" component={SajuInput} />
      <Route path="/saju-result/:id" component={SajuResult} />
      <Route path="/saju-list" component={SajuList} />
      <Route path="/guide" component={Guide} />
      <Route path="/compatibility" component={Compatibility} />
      <Route path="/reservation" component={ReservationPage} />
      <Route path="/ganji-input" component={GanjiInput} />
      <Route path="/ganji-result" component={GanjiResult} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/announcements/:id" component={AnnouncementDetail} />
      <Route path="/announcement-admin" component={AnnouncementAdmin} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/cache-clear" component={CacheClear} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

const PC_MENUS = [
  { label: '지천명만세력', items: [
    { label: '만세력소개', path: '/guide' },
    { label: '사용방법', path: '' },
    { label: '개인정보처리방침', path: '/privacy-policy' },
    { label: '서비스이용약관', path: '/terms-of-service' },
  ]},
  { label: '고객관리', items: [
    { label: '데이터 백업하기', path: '' },
    { label: 'DB 가져오기', path: '' },
  ]},
  { label: '설정', items: [
    { label: '폰트설정', path: '' },
  ]},
  { label: '로그인', items: [
    { label: '로그인', path: '/login' },
  ]},
];

function UserBadge() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  if (!isAuthenticated || !user) return null;
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#f5d78e', fontSize: '13px' }}>
        {user.displayName || user.email}
      </span>
      <div
        onClick={() => setLocation('/login')}
        style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #f5d78e', color: '#f5d78e', cursor: 'pointer', fontSize: '12px' }}
      >로그아웃</div>
    </div>
  );
}

interface BoardPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
}

function CommunityBoard({ setLocation }: { setLocation: (path: string) => void }) {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<'list' | 'write' | 'detail'>('list');
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newComment, setNewComment] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts?board=free');
      const json = await res.json();
      if (json.success) setPosts(json.data);
    } catch (e) {
      console.error('게시글 로드 실패', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openPost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedPost(json.data);
        setView('detail');
      }
    } catch (e) {
      console.error('게시글 조회 실패', e);
    }
  };

  const submitPost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('제목과 내용을 입력해주세요!');
      return;
    }
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: 'free', title: newTitle, content: newContent }),
      });
      const json = await res.json();
      if (json.success) {
        setNewTitle('');
        setNewContent('');
        setView('list');
        loadPosts();
      } else if (res.status === 401) {
        if (window.confirm('로그인이 필요한 기능이에요. 로그인 페이지로 이동할까요?')) {
          setLocation('/login');
        }
      } else {
        alert(json.error || '게시글 작성에 실패했어요.');
      }
    } catch (e) {
      alert('게시글 작성 중 오류가 발생했어요.');
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      const json = await res.json();
      if (json.success) {
        setNewComment('');
        openPost(selectedPost.id);
      } else if (res.status === 401) {
        if (window.confirm('로그인이 필요한 기능이에요. 로그인 페이지로 이동할까요?')) {
          setLocation('/login');
        }
      } else {
        alert(json.error || '댓글 작성에 실패했어요.');
      }
    } catch (e) {
      alert('댓글 작성 중 오류가 발생했어요.');
    }
  };

  if (view === 'write') {
    return (
      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>✏️ 글쓰기</div>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="제목"
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box' }}
        />
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="내용을 입력하세요..."
          style={{ width: '100%', height: '200px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <div
            onClick={() => setView('list')}
            style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '13px' }}
          >취소</div>
          <div
            onClick={submitPost}
            style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', backgroundColor: '#3d2c1a', color: '#f5d78e', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >등록</div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedPost) {
    return (
      <div style={{ padding: '12px' }}>
        <div
          onClick={() => setView('list')}
          style={{ fontSize: '13px', color: '#888', cursor: 'pointer', marginBottom: '10px' }}
        >← 목록으로</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{selectedPost.title}</div>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
          {selectedPost.authorName} · 조회 {selectedPost.viewCount} · {new Date(selectedPost.createdAt).toLocaleDateString('ko-KR')}
        </div>
        <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
          {selectedPost.content}
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>댓글 {selectedPost.comments?.length || 0}</div>
          {(selectedPost.comments || []).map((c: any) => (
            <div key={c.id} style={{ fontSize: '13px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f5f0e8' }}>
              <div style={{ fontWeight: 'bold', color: '#3d2c1a' }}>{c.authorName}</div>
              <div>{c.content}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onFocus={() => {
                if (!isAuthenticated) {
                  if (window.confirm('로그인이 필요한 기능이에요. 로그인 페이지로 이동할까요?')) {
                    setLocation('/login');
                  }
                }
              }}
              placeholder={isAuthenticated ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있어요"}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
              onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
            />
            <div
              onClick={() => {
                if (!isAuthenticated) {
                  if (window.confirm('로그인이 필요한 기능이에요. 로그인 페이지로 이동할까요?')) {
                    setLocation('/login');
                  }
                  return;
                }
                submitComment();
              }}
              style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#3d2c1a', color: '#f5d78e', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >등록</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>💬 자유게시판</div>
        <div
          onClick={() => {
            if (!isAuthenticated) {
              if (window.confirm('로그인이 필요한 기능이에요. 로그인 페이지로 이동할까요?')) {
                setLocation('/login');
              }
              return;
            }
            setView('write');
          }}
          style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#3d2c1a', color: '#f5d78e', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
        >✏️ 글쓰기</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '20px' }}>불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '20px' }}>
          아직 게시글이 없어요.<br/>첫 글을 남겨보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => openPost(post.id)}
              style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {post.title}
              </div>
              <div style={{ fontSize: '11px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>{post.authorName}</span>
                <span>조회 {post.viewCount} · {new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ALARM_OPTIONS = [
  { value: '10min', label: '10분 전' },
  { value: '30min', label: '30분 전' },
  { value: '1hour', label: '1시간 전' },
  { value: '1day', label: '1일 전' },
  { value: '3day', label: '3일 전' },
];

function ReservationFullModal({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [content, setContent] = useState('');
  const [alarms, setAlarms] = useState<string[]>(['10min']);

  const calendarInfo = useMemo(() => getCalendarInfo(calYear, calMonth), [calYear, calMonth]);
  const calendarData = useMemo(() => generateCalendarMonth(calYear, calMonth), [calYear, calMonth]);

  const monthStart = `${calYear}-${String(calMonth).padStart(2, '0')}-01`;
  const monthEndDay = new Date(calYear, calMonth, 0).getDate();
  const monthEnd = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;

  const { data: reservationsData, refetch } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["reservations-modal", calYear, calMonth],
    queryFn: async () => {
      const res = await fetch(`/api/reservations?start=${monthStart}&end=${monthEnd}`);
      return await res.json();
    },
  });

  const reservationDates = useMemo(() => {
    const set = new Set<string>();
    (reservationsData?.data || []).forEach(r => set.add(r.date));
    return set;
  }, [reservationsData]);

  const handlePrevMonth = () => { if (calMonth === 1) { setCalYear(p => p - 1); setCalMonth(12); } else setCalMonth(p => p - 1); };
  const handleNextMonth = () => { if (calMonth === 12) { setCalYear(p => p + 1); setCalMonth(1); } else setCalMonth(p => p + 1); };

  const timeOptions = useMemo(() => {
    const list: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return list;
  }, []);

  const addAlarm = () => setAlarms(prev => [...prev, '10min']);
  const removeAlarm = (idx: number) => setAlarms(prev => prev.filter((_, i) => i !== idx));
  const changeAlarm = (idx: number, value: string) => setAlarms(prev => prev.map((a, i) => i === idx ? value : a));

  const handleSave = async () => {
    if (!selectedDate) { alert('날짜를 선택해주세요!'); return; }
    if (!title.trim()) { alert('제목을 입력해주세요!'); return; }
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: selectedDate, time, content, alarms }),
      });
      const json = await res.json();
      if (json.success) {
        alert('예약이 저장됐어요!');
        setTitle(''); setContent(''); setAlarms(['10min']); setSelectedDate(null);
        refetch();
      } else if (res.status === 401) {
        alert('로그인이 필요해요.');
      } else {
        alert(json.error || '저장에 실패했어요.');
      }
    } catch {
      alert('저장 중 오류가 발생했어요.');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: '#fff', borderRadius: '12px', width: '900px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', display: 'flex' }}
      >
        {/* 왼쪽: 큰 달력 */}
        <div style={{ flex: 1, padding: '20px', borderRight: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span onClick={handlePrevMonth} style={{ cursor: 'pointer', fontSize: '20px', padding: '4px 10px' }}>◀</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{calYear}년 {calMonth}월 ({calendarInfo.monthGanji[0]}{calendarInfo.monthGanji[1]}월)</span>
            <span onClick={handleNextMonth} style={{ cursor: 'pointer', fontSize: '20px', padding: '4px 10px' }}>▶</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
            {['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarData.flat().map((d, i) => {
              const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d.solarDay).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr && d.isCurrentMonth;
              const hasReservation = d.isCurrentMonth && reservationDates.has(dateStr);
              return (
                <div
                  key={i}
                  onClick={() => d.isCurrentMonth && setSelectedDate(dateStr)}
                  style={{
                    textAlign: 'center', padding: '12px 0', fontSize: '15px', borderRadius: '8px',
                    cursor: d.isCurrentMonth ? 'pointer' : 'default',
                    color: !d.isCurrentMonth ? '#ccc' : isSelected ? '#fff' : '#333',
                    backgroundColor: isSelected ? '#3d2c1a' : 'transparent',
                    position: 'relative',
                  }}
                  onMouseOver={e => { if (d.isCurrentMonth && !isSelected) e.currentTarget.style.backgroundColor = '#f5f0e8'; }}
                  onMouseOut={e => { if (d.isCurrentMonth && !isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {d.solarDay}
                  {hasReservation && !isSelected && (
                    <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#2d6a4f' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 입력 폼 */}
        <div style={{ width: '340px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3d2c1a' }}>🗓️ 예약등록</div>
            <div onClick={onClose} style={{ fontSize: '13px', color: '#888', cursor: 'pointer' }}>✕ 닫기</div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예약 제목"
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>일시</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', backgroundColor: '#f9f9f9' }}>
                {selectedDate || '왼쪽에서 날짜 선택'}
              </div>
              <select value={time} onChange={e => setTime(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>상세내용</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="상세 내용을 입력하세요..."
              style={{ width: '100%', height: '90px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>알람</label>
            {alarms.map((a, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                <select value={a} onChange={e => changeAlarm(idx, e.target.value)}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                  {ALARM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {alarms.length > 1 && (
                  <div onClick={() => removeAlarm(idx)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '12px', color: '#c0392b' }}>삭제</div>
                )}
              </div>
            ))}
            <div onClick={addAlarm} style={{ fontSize: '12px', color: '#3d2c1a', cursor: 'pointer', textDecoration: 'underline', marginTop: '2px' }}>
              + 알람추가
            </div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>
              💬 톡설정 (추후 연동 예정)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <div onClick={onClose}
              style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '13px' }}
            >취소</div>
            <div onClick={handleSave}
              style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', backgroundColor: '#3d2c1a', color: '#f5d78e', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >저장</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoArea({ setLocation, selectedSajuId }: { setLocation: (path: string) => void; selectedSajuId?: string | null }) {
  const [memo, setMemo] = useState('');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastDateInsertedRef = useRef<string>('');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const getDateStr = () => {
    const now = new Date();
    return `[${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}]\n`;
  };

  const insertDate = () => {
    const dateStr = getDateStr();
    setMemo(prev => dateStr + prev);
    setCtxMenu(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(dateStr.length, dateStr.length);
      }
    }, 0);
  };

  const handleFocus = () => {
    if (!selectedSajuId) return;
    const todayKey = selectedSajuId + '-' + new Date().toDateString();
    if (lastDateInsertedRef.current === todayKey) return;
    const todayPrefix = `[${new Date().getFullYear()}.${String(new Date().getMonth()+1).padStart(2,'0')}.${String(new Date().getDate()).padStart(2,'0')}`;
    if (memo.startsWith(todayPrefix)) {
      lastDateInsertedRef.current = todayKey;
      return;
    }
    const dateStr = getDateStr();
    setMemo(prev => dateStr + prev);
    lastDateInsertedRef.current = todayKey;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(dateStr.length, dateStr.length);
      }
    }, 0);
  };

  const saveMemo = () => {
    if (!selectedSajuId) {
      alert('먼저 사주를 선택해주세요!');
      setCtxMenu(null);
      return;
    }
    localStorage.setItem(`consulting-memo-${selectedSajuId}`, memo);
    alert('메모가 저장됐어요!');
    setCtxMenu(null);
  };

  useEffect(() => {
    if (selectedSajuId) {
      const saved = localStorage.getItem(`consulting-memo-${selectedSajuId}`);
      setMemo(saved || '');
    } else {
      setMemo('');
    }
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [selectedSajuId]);

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={memo}
        onChange={e => selectedSajuId && setMemo(e.target.value)}
        onContextMenu={handleContextMenu}
        onFocus={handleFocus}
        readOnly={!selectedSajuId}
        placeholder={selectedSajuId ? "상담 내용을 입력하세요..." : "사주를 선택하면 메모를 작성할 수 있어요"}
        style={{ width: '100%', height: '150px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: selectedSajuId ? '#fff' : '#f5f5f5', color: selectedSajuId ? '#000' : '#999' }}
      />
      {ctxMenu && (
        <div style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, minWidth: '140px' }}>
          <div onClick={insertDate}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f5f0e8')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >📅 오늘날짜 입력</div>
          <div onClick={saveMemo}
            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px', borderTop: '1px solid #eee' }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f5f0e8')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >💾 메모 저장</div>
        </div>
      )}
    </div>
  );
}

function PCMenuBar() {
  const [, setLocation] = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div style={{ height: '44px', backgroundColor: '#3d2c1a', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, zIndex: 1000 }}>
      <span style={{ color: '#f5d78e', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', marginRight: '20px' }} onClick={() => setLocation('/')}>
        ☯ 지천명 만세력
      </span>
      {PC_MENUS.map((menu) => (
        <div key={menu.label} style={{ position: 'relative' }}
          onMouseEnter={() => setOpenMenu(menu.label)}
          onMouseLeave={() => setOpenMenu(null)}
        >
          <span style={{ color: openMenu === menu.label ? '#f5d78e' : '#ddd', cursor: 'pointer', padding: '12px 14px', display: 'inline-block', fontSize: '17px' }}>
            {menu.label}
          </span>
          {openMenu === menu.label && (
            <div style={{ position: 'absolute', top: '44px', left: 0, backgroundColor: '#2a1f0f', minWidth: '170px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', borderRadius: '0 0 6px 6px', zIndex: 2000 }}>
              {menu.items.map((item) => (
                <div key={item.label}
                  onClick={() => { if (item.path) setLocation(item.path); setOpenMenu(null); }}
                  style={{ padding: '10px 16px', color: '#ddd', cursor: 'pointer', fontSize: '17px', borderBottom: '1px solid #3d2c1a' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#3d2c1a'; (e.currentTarget as HTMLElement).style.color = '#f5d78e'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#ddd'; }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    <UserBadge />
    </div>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();

  // /reservation 경로는 PC 레이아웃(메뉴바/1열/3열) 없이 단독 화면으로 표시
  const [isStandaloneReservation] = useState(() => 
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('standalone') === '1'
  );

  const selectedSajuId = useMemo(() => {
    const m = location.match(/^\/saju-result\/(.+)$/);
    return m ? m[1] : null;
  }, [location]);

  const [leftPercent, setLeftPercent] = useState(30);
  const [rightPercent, setRightPercent] = useState(30);
  const [rightTab, setRightTab] = useState<'ai' | 'community'>('ai');
  const [showReservation, setShowReservation] = useState(false);
  const draggingRef = useRef<'left' | 'right' | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const totalWidth = window.innerWidth;
      if (draggingRef.current === 'left') {
        const newPercent = Math.min(45, Math.max(15, (e.clientX / totalWidth) * 100));
        setLeftPercent(newPercent);
      } else if (draggingRef.current === 'right') {
        const newPercent = Math.min(45, Math.max(15, ((totalWidth - e.clientX) / totalWidth) * 100));
        setRightPercent(newPercent);
      }
    };
    const handleMouseUp = () => { draggingRef.current = null; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag = (side: 'left' | 'right') => {
    draggingRef.current = side;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 300);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  if (isStandaloneReservation) {
    return (
      <div className="flex h-screen flex-col bg-background font-sans">
        <Router />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background font-sans">
      <PCMenuBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 1열: 왼쪽 */}
        <div style={{ width: `${leftPercent}%`, flexShrink: 0, borderRight: '1px solid #e0d8cc', backgroundColor: '#faf7f2', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* 상담메모 */}
          <div style={{ padding: '12px', borderBottom: '1px solid #e0d8cc' }}>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#3d2c1a', marginBottom: '6px' }}>📝 상담메모</div>
            <MemoArea setLocation={setLocation} selectedSajuId={selectedSajuId} />
          </div>
          {/* 버튼 2줄 10개 */}
          <div style={{ padding: '8px 12px 4px', display: 'flex', gap: '4px' }}>
            {[
              { label: '신규', icon: '🆕', path: '/manseryeok' },
              { label: '불러오기', icon: '📂', path: '/saju-list' },
              { label: '달력', icon: '📅', path: '/calendar' },
              { label: '궁합', icon: '💑', path: '/compatibility' },
              { label: '저장', icon: '💾', path: '' },
            ].map(item => (
              <div key={item.label}
                onClick={() => {
                  if (item.label === '저장' && location === '/compatibility') {
                    if (window.confirm('궁합을 저장하시겠습니까?')) {
                      window.dispatchEvent(new CustomEvent('save-compatibility'));
                    }
                    return;
                  }
                  if (item.path) setLocation(item.path);
                }}
                style={{ flex: 1, height: '32px', background: 'linear-gradient(to bottom, #ffffff, #ececec)', border: '1px solid #c4c4c4', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#3d2c1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseOver={e => (e.currentTarget.style.background = '#e4e4e4')}
                onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff, #ececec)')}
              >
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 12px 8px', display: 'flex', gap: '4px' }}>
            {[
              { label: '고객관리', path: '/customer-list' },
              { label: '예약', path: '' },
              { label: '인쇄', path: '' },
              { label: '톡설정', path: '' },
              { label: '집계', path: '' },
            ].map(item => (
              <div key={item.label}
                onClick={() => {
                  if (item.label === '예약') {
                    if ((window as any).electronAPI?.openReservationWindow) {
                      (window as any).electronAPI.openReservationWindow();
                    } else {
                      window.open('/reservation', '_blank');
                    }
                    return;
                  }
                  if (item.path) setLocation(item.path);
                }}
                style={{ flex: 1, height: '32px', background: 'linear-gradient(to bottom, #ffffff, #ececec)', border: '1px solid #c4c4c4', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#3d2c1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseOver={e => (e.currentTarget.style.background = '#e4e4e4')}
                onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff, #ececec)')}
              >
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 좌측 리사이저 */}
        <div
          onMouseDown={() => startDrag('left')}
          style={{ width: '5px', cursor: 'col-resize', backgroundColor: 'transparent', flexShrink: 0 }}
        />

        {/* 2열: 메인 */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f5f0e8', minWidth: 0 }}>
          <Router />
        </main>

        {location !== '/compatibility' && (
          <>
            {/* 우측 리사이저 */}
            <div
              onMouseDown={() => startDrag('right')}
              style={{ width: '5px', cursor: 'col-resize', backgroundColor: 'transparent', flexShrink: 0 }}
            />

            {/* 3열: AI / 커뮤니티 */}
            <div style={{ width: `${rightPercent}%`, flexShrink: 0, borderLeft: '1px solid #e0d8cc', backgroundColor: '#faf7f2', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e0d8cc', flexShrink: 0 }}>
                <div
                  onClick={() => setRightTab('ai')}
                  style={{
                    flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
                    fontSize: '15px', fontWeight: 'bold',
                    color: rightTab === 'ai' ? '#3d2c1a' : '#aaa',
                    borderBottom: rightTab === 'ai' ? '2px solid #3d2c1a' : '2px solid transparent',
                  }}
                >
                  🤖 AI
                </div>
                <div
                  onClick={() => setRightTab('community')}
                  style={{
                    flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
                    fontSize: '15px', fontWeight: 'bold',
                    color: rightTab === 'community' ? '#3d2c1a' : '#aaa',
                    borderBottom: rightTab === 'community' ? '2px solid #3d2c1a' : '2px solid transparent',
                  }}
                >
                  💬 커뮤니티
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {rightTab === 'ai' ? (
                  <div style={{ padding: '12px', color: '#888', fontSize: '17px', textAlign: 'center' }}>
                    {selectedSajuId ? '선택된 사주의 AI 분석' : '사주를 선택하면'}<br/>
                    {!selectedSajuId && 'AI 분석이 표시됩니다'}
                  </div>
                ) : (
                  <CommunityBoard setLocation={setLocation} />
                )}
              </div>
            </div>
          </>
        )}

      </div>
      <Toaster />
      {showReservation && <ReservationFullModal onClose={() => setShowReservation(false)} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <FontProvider>
              <AppContent />
            </FontProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;