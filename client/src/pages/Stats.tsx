// client/src/pages/Stats.tsx
// 매출 집계: 예약(Reservation) 기록의 금액을 기간별(년/월/일)로 합산 + 상세 리스트 + 이름/금액 검색
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp } from "lucide-react";

interface Reservation {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  phone?: string;
  amount?: number;
}

const won = (n: number) => n.toLocaleString() + "원";
const pad = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Preset = "today" | "month" | "year" | "all" | "custom";
type GroupBy = "day" | "month" | "year";

export default function Stats() {
  const [, setLocation] = useLocation();
  const [all, setAll] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [preset, setPreset] = useState<Preset>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const nowYM = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const [selMonthStart, setSelMonthStart] = useState(nowYM);
  const [selMonthEnd, setSelMonthEnd] = useState(nowYM);
  const [selYearStart, setSelYearStart] = useState(() => new Date().getFullYear());
  const [selYearEnd, setSelYearEnd] = useState(() => new Date().getFullYear());
  const yearOptions = useMemo(() => { const y = new Date().getFullYear(); return Array.from({ length: 8 }, (_, i) => y + 1 - i); }, []);

  const [nameQuery, setNameQuery] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  useEffect(() => {
    fetch("/api/reservations")
      .then((r) => r.json())
      .then((j) => setAll(Array.isArray(j) ? j : (j.data || [])))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, []);

  // 프리셋 → 시작/종료 날짜 계산
  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date();
    const t = toYMD(today);
    if (preset === "today") return { rangeStart: t, rangeEnd: t };
    if (preset === "month") {
      let a = selMonthStart, b = selMonthEnd;
      if (a > b) [a, b] = [b, a];
      const [by, bm] = b.split("-").map(Number);
      const last = new Date(by, bm, 0).getDate();
      return { rangeStart: `${a}-01`, rangeEnd: `${b}-${pad(last)}` };
    }
    if (preset === "year") {
      let a = selYearStart, b = selYearEnd;
      if (a > b) [a, b] = [b, a];
      return { rangeStart: `${a}-01-01`, rangeEnd: `${b}-12-31` };
    }
    if (preset === "custom") return { rangeStart: startDate || "", rangeEnd: endDate || "" };
    return { rangeStart: "", rangeEnd: "" }; // all
  }, [preset, startDate, endDate, selMonthStart, selMonthEnd, selYearStart, selYearEnd]);

  // 매출 대상 필터 (금액>0 + 기간 + 이름 + 금액범위)
  const filtered = useMemo(() => {
    const min = amountMin ? Number(amountMin) : null;
    const max = amountMax ? Number(amountMax) : null;
    const q = nameQuery.trim();
    return all.filter((r) => {
      const amt = r.amount || 0;
      if (amt <= 0) return false;
      if (rangeStart && r.date < rangeStart) return false;
      if (rangeEnd && r.date > rangeEnd) return false;
      if (q && !(r.title || "").includes(q)) return false;
      if (min !== null && amt < min) return false;
      if (max !== null && amt > max) return false;
      return true;
    });
  }, [all, rangeStart, rangeEnd, nameQuery, amountMin, amountMax]);

  const total = useMemo(() => filtered.reduce((s, r) => s + (r.amount || 0), 0), [filtered]);
  const count = filtered.length;
  const avg = count ? Math.round(total / count) : 0;

  // 기간별 그룹 합계
  const groups = useMemo(() => {
    const keyOf = (d: string) => (groupBy === "day" ? d : groupBy === "month" ? d.slice(0, 7) : d.slice(0, 4));
    const map = new Map<string, { sum: number; cnt: number }>();
    for (const r of filtered) {
      const k = keyOf(r.date);
      const g = map.get(k) || { sum: 0, cnt: 0 };
      g.sum += r.amount || 0;
      g.cnt += 1;
      map.set(k, g);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, groupBy]);

  // 상세 리스트 (최신순)
  const rows = useMemo(
    () => [...filtered].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || ""))),
    [filtered]
  );

  const presetBtn = (p: Preset, label: string) => (
    <Button variant={preset === p ? "default" : "outline"} size="sm" onClick={() => setPreset(p)}>{label}</Button>
  );
  const groupBtn = (g: GroupBy, label: string) => (
    <Button variant={groupBy === g ? "default" : "outline"} size="sm" onClick={() => setGroupBy(g)}>{label}</Button>
  );

  return (
    <div className="bg-background p-2 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="flex items-center gap-1 pl-1">
          <ArrowLeft className="h-4 w-4" /><span className="text-sm">뒤로</span>
        </Button>
        <h1 className="font-bold text-foreground text-[16px] flex items-center gap-1"><TrendingUp className="h-4 w-4" /> 매출 집계</h1>
      </div>

      <div className="max-w-3xl mx-auto space-y-2">
        {/* 기간 선택 */}
        <Card className="p-3">
          <div className="text-sm font-semibold mb-2">기간</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {presetBtn("today", "오늘")}
            {presetBtn("month", "월별")}
            {presetBtn("year", "년별")}
            {presetBtn("all", "전체")}
            {presetBtn("custom", "직접 지정")}
          </div>
          {preset === "month" && (
            <div className="flex items-center gap-2 text-sm">
              <input type="month" value={selMonthStart} onChange={(e) => setSelMonthStart(e.target.value)} className="border rounded-md px-2 h-9" />
              <span>~</span>
              <input type="month" value={selMonthEnd} onChange={(e) => setSelMonthEnd(e.target.value)} className="border rounded-md px-2 h-9" />
            </div>
          )}
          {preset === "year" && (
            <div className="flex items-center gap-2 text-sm">
              <select value={selYearStart} onChange={(e) => setSelYearStart(Number(e.target.value))} className="border rounded-md px-2 h-9">
                {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <span>~</span>
              <select value={selYearEnd} onChange={(e) => setSelYearEnd(Number(e.target.value))} className="border rounded-md px-2 h-9">
                {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
          )}
          {preset === "custom" && (
            <div className="flex items-center gap-2 text-sm">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-md px-2 h-9" />
              <span>~</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-md px-2 h-9" />
            </div>
          )}
        </Card>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">총 매출</div>
            <div className="text-lg font-bold">{won(total)}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">건수</div>
            <div className="text-lg font-bold">{count.toLocaleString()}건</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">평균</div>
            <div className="text-lg font-bold">{won(avg)}</div>
          </Card>
        </div>

        {/* 기간별 합계 */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">기간별 합계</div>
            <div className="flex gap-1">{groupBtn("day", "일별")}{groupBtn("month", "월별")}{groupBtn("year", "연별")}</div>
          </div>
          <div className="max-h-36 overflow-y-auto border rounded-md">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
            ) : groups.map(([k, g]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-sm">
                <span className="w-28">{k}</span>
                <span className="text-muted-foreground text-xs flex-1 text-center">{g.cnt}건</span>
                <span className="font-semibold">{won(g.sum)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 검색 + 상세 리스트 */}
        <Card className="p-3">
          <div className="text-sm font-semibold mb-2">상세 내역</div>
          <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
            <input value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="이름 검색" className="border rounded-md px-2 h-9 flex-1 min-w-[120px]" />
            <input value={amountMin} onChange={(e) => setAmountMin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="최소 금액" inputMode="numeric" className="border rounded-md px-2 h-9 w-24" />
            <span>~</span>
            <input value={amountMax} onChange={(e) => setAmountMax(e.target.value.replace(/[^0-9]/g, ""))} placeholder="최대 금액" inputMode="numeric" className="border rounded-md px-2 h-9 w-24" />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">불러오는 중...</p>
          ) : (
            <div className="max-h-56 overflow-y-auto border rounded-md">
              <div className="flex items-center px-3 py-2 border-b text-xs text-muted-foreground bg-muted/40 sticky top-0">
                <span className="flex-1">고객명</span>
                <span className="w-28">날짜</span>
                <span className="w-24 text-right">금액</span>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">내역 없음</p>
              ) : rows.map((r) => (
                <div key={r.id} className="flex items-center px-3 py-2 border-b last:border-b-0 text-sm">
                  <span className="flex-1 truncate">{r.title || "이름없음"}</span>
                  <span className="w-28 text-muted-foreground text-xs">{r.date} {r.time || ""}</span>
                  <span className="w-24 text-right font-semibold">{won(r.amount || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
