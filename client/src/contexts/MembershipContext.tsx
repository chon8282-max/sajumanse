// client/src/contexts/MembershipContext.tsx
// prosaju.co.kr 연동: 로그인 / 권한(features) / AI 코인.
// 원칙: 앱은 등급을 계산하지 않고, 서버가 준 features(true/false)만 사용한다.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { localDB } from "@/lib/saju-local-storage";
import { startMemberSync } from "@/lib/member-sync";

const API_BASE = "https://prosaju.co.kr";
const TOKEN_KEY = "ps_token";
const ENT_KEY = "ps_entitlements";
const ENT_AT_KEY = "ps_entitlements_at";
const USER_KEY = "ps_user";

const OFFLINE_MAX_MS = 7 * 24 * 60 * 60 * 1000; // 오프라인 캐시 최대 7일
const REFRESH_MS = 6 * 60 * 60 * 1000;           // 6시간마다 권한 재조회

export interface Entitlements {
  tier: string;
  tierLabel: string;
  expiresAt: string | null;
  aiCash: number;
  limits: { saveMax: number | null };
  aiCosts: Record<string, number>;
  features: Record<string, boolean>;
  upgradeUrl: string;
}

type Phase = "loading" | "login" | "ready";
type AiResult = { ok: boolean; balance?: number; reason?: "insufficient" | "forbidden" | "error"; upgradeUrl?: string };

interface MembershipCtx {
  phase: Phase;
  ent: Entitlements | null;
  user: any;
  error: string;
  notice: string;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  consumeAi: (feature: string) => Promise<AiResult>;
  can: (key: string) => boolean;
  saveMax: number | null;
  aiCash: number;
  aiCosts: Record<string, number>;
  upgradeUrl: string;
  openExternal: (url: string) => void;
}

const Ctx = createContext<MembershipCtx | null>(null);

// 기본 브라우저로 외부 URL 열기 (Electron: shell.openExternal, 웹: 새 탭)
export function openExternal(url: string) {
  const api = (window as any).electronAPI;
  if (api && typeof api.openExternal === "function") api.openExternal(url);
  else window.open(url, "_blank");
}

// 오프라인/캐시없음일 때 안전한 최소 권한(무료)로 취급
const FREE_FALLBACK: Entitlements = {
  tier: "free", tierLabel: "무료회원", expiresAt: null, aiCash: 0,
  limits: { saveMax: 10 },
  aiCosts: {},
  features: {
    manseryeok: true, gunghap: true, save: true,
    customer: false, reservation: false, print: false, message: false, stats: false,
    boardList: true, boardRead: false, boardWrite: false, ai: false,
  },
  upgradeUrl: "https://prosaju.co.kr/pricing",
};

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [user, setUser] = useState<any>(() => {
    try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const tokenRef = useRef<string>(localStorage.getItem(TOKEN_KEY) || "");
  const sessionRef = useRef<string>("");

  const applyEnt = useCallback((e: Entitlements) => {
    setEnt(e);
    try { localDB.setSaveLimit(e.limits?.saveMax ?? null); } catch {}
    try {
      localStorage.setItem(ENT_KEY, JSON.stringify(e));
      localStorage.setItem(ENT_AT_KEY, String(Date.now()));
    } catch {}
  }, []);

  const clearAuth = useCallback(() => {
    tokenRef.current = "";
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ENT_KEY);
      localStorage.removeItem(ENT_AT_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    setEnt(null);
    setUser(null);
    setPhase("login");
  }, []);

  const fetchEnt = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) { setPhase("login"); return; }
    try {
      const r = await fetch(`${API_BASE}/api/app/entitlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { clearAuth(); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      applyEnt(data as Entitlements);
      setPhase("ready");
    } catch (e) {
      // 오프라인/서버 오류: 캐시로 최대 7일 사용, 단 AI는 항상 차단
      try {
        const cached = localStorage.getItem(ENT_KEY);
        const at = Number(localStorage.getItem(ENT_AT_KEY) || 0);
        if (cached && Date.now() - at < OFFLINE_MAX_MS) {
          const e2 = JSON.parse(cached) as Entitlements;
          e2.features = { ...e2.features, ai: false };
          setEnt(e2);
          try { localDB.setSaveLimit(e2.limits?.saveMax ?? null); } catch {}
          setPhase("ready");
          return;
        }
      } catch {}
      // 캐시 없음/7일 초과 → 무료 취급
      const f: Entitlements = JSON.parse(JSON.stringify(FREE_FALLBACK));
      setEnt(f);
      try { localDB.setSaveLimit(f.limits.saveMax); } catch {}
      setPhase("ready");
    }
  }, [applyEnt, clearAuth]);

  useEffect(() => {
    fetchEnt();
    const id = setInterval(() => { fetchEnt(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchEnt]);

  // 로그인 완료 후 회원 데이터(사주·궁합) 동기화 시작
  useEffect(() => {
    if (phase === "ready" && user?.email) {
      startMemberSync(user.email).catch(() => {});
    }
  }, [phase, user?.email]);

  // 회원 이메일을 쿠키로 심어 서버측 요청(예약 등)이 회원을 식별하게 함
  useEffect(() => {
    try {
      const em = user?.email;
      if (em) document.cookie = `ps_member_email=${encodeURIComponent(em)}; path=/; max-age=${60 * 60 * 24 * 30}`;
      else document.cookie = "ps_member_email=; path=/; max-age=0";
    } catch {}
  }, [user?.email]);

  // PC(Electron) 전용: 같은 계정 2군데 동시접속 방지 (다른 기기 로그인 시 이 화면 로그아웃)
  useEffect(() => {
    const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI;
    if (!isElectron) return;
    if (phase !== "ready" || !user?.email) return;
    const hdr: any = { "x-member-email": user.email };
    const sid = (window.crypto && (window.crypto as any).randomUUID)
      ? (window.crypto as any).randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2);
    sessionRef.current = sid;
    fetch("/api/session/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...hdr },
      body: JSON.stringify({ sessionId: sid }),
    }).catch(() => {});
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/session/current", { headers: hdr });
        const d = await r.json().catch(() => ({}));
        if (d?.sessionId && sessionRef.current && d.sessionId !== sessionRef.current) {
          setNotice("다른 기기에서 로그인되어 이 화면은 로그아웃되었습니다.");
          clearAuth();
        }
      } catch {}
    }, 20000);
    return () => clearInterval(timer);
  }, [phase, user?.email, clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setError(""); setNotice("");
    let r: Response;
    try {
      r = await fetch(`${API_BASE}/api/app/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      const msg = "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.";
      setError(msg);
      throw new Error(msg);
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data as any)?.error || "로그인에 실패했습니다.";
      setError(msg);
      throw new Error(msg);
    }
    tokenRef.current = (data as any).token;
    try { localStorage.setItem(TOKEN_KEY, (data as any).token); } catch {}
    setUser((data as any).user || null);
    try { localStorage.setItem(USER_KEY, JSON.stringify((data as any).user || null)); } catch {}
    if ((data as any).entitlements) applyEnt((data as any).entitlements);
    setPhase("ready");
  }, [applyEnt]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setError(""); setNotice("");
    let r: Response;
    try {
      r = await fetch(`${API_BASE}/api/app/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
    } catch {
      const msg = "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.";
      setError(msg); throw new Error(msg);
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data as any)?.error || "구글 로그인에 실패했습니다.";
      setError(msg);
      if (r.status === 404 || r.status === 403) openExternal("https://prosaju.co.kr/register");
      throw new Error(msg);
    }
    tokenRef.current = (data as any).token;
    try { localStorage.setItem(TOKEN_KEY, (data as any).token); } catch {}
    setUser((data as any).user || null);
    try { localStorage.setItem(USER_KEY, JSON.stringify((data as any).user || null)); } catch {}
    if ((data as any).entitlements) applyEnt((data as any).entitlements);
    setPhase("ready");
  }, [applyEnt]);

  const logout = useCallback(() => { clearAuth(); }, [clearAuth]);

  const upgradeUrl = ent?.upgradeUrl || "https://prosaju.co.kr/pricing";

  const consumeAi = useCallback(async (feature: string): Promise<AiResult> => {
    const token = tokenRef.current;
    const fallbackUrl = ent?.upgradeUrl || "https://prosaju.co.kr/pricing";
    if (!token) { clearAuth(); return { ok: false, reason: "error" }; }
    try {
      const r = await fetch(`${API_BASE}/api/app/ai/consume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ feature }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) { clearAuth(); return { ok: false, reason: "error" }; }
      if (r.status === 402) {
        const url = (data as any)?.upgradeUrl || fallbackUrl;
        openExternal(url);
        return { ok: false, reason: "insufficient", upgradeUrl: url };
      }
      if (r.status === 403) {
        const url = (data as any)?.upgradeUrl || fallbackUrl;
        return { ok: false, reason: "forbidden", upgradeUrl: url };
      }
      if (!r.ok) return { ok: false, reason: "error" };
      const bal = (data as any)?.balance;
      if (ent && typeof bal === "number") setEnt({ ...ent, aiCash: bal });
      return { ok: true, balance: bal };
    } catch {
      return { ok: false, reason: "error" };
    }
  }, [ent, clearAuth]);

  const can = useCallback((key: string) => !!ent?.features?.[key], [ent]);

  const value: MembershipCtx = {
    phase, ent, user, error, notice, login, loginWithGoogle, logout, refresh: fetchEnt, consumeAi, can,
    saveMax: ent?.limits?.saveMax ?? null,
    aiCash: ent?.aiCash ?? 0,
    aiCosts: ent?.aiCosts || {},
    upgradeUrl,
    openExternal,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMembership() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMembership must be used within MembershipProvider");
  return c;
}
