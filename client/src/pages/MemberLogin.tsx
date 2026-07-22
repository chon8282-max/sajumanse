// client/src/pages/MemberLogin.tsx
// 회원 로그인 게이트: prosaju.co.kr 회원 이메일+비밀번호 또는 구글 소셜 로그인.
// 구글 로그인은 시스템 브라우저로 열어(임베디드 웹뷰 차단 회피) id_token을 받아 서버와 교환한다.
import React, { useRef, useState } from "react";
import { useMembership, openExternal } from "@/contexts/MembershipContext";

const REGISTER_URL = "https://prosaju.co.kr/register";

// 서명 검증 없이 JWT payload만 디코드 (진단용: aud/email/exp 확인)
function decodeJwt(t: string): any {
  try {
    const part = t.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch { return null; }
}

export default function MemberLogin() {
  const { login, loginWithGoogle, error, notice } = useMembership();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleStarted, setGoogleStarted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [dbg, setDbg] = useState("");
  const codeRef = useRef<string>("");
  const pollTimer = useRef<any>(null);

  const submit = async () => {
    if (busy || checking) return;
    if (!email.trim() || !pw) { setLocalErr("이메일과 비밀번호를 입력해주세요."); return; }
    setLocalErr("");
    setBusy(true);
    try {
      await login(email.trim(), pw);
    } catch (e: any) {
      setLocalErr(e?.message || "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  // 서버에 저장된 구글 id_token을 확인해서 있으면 교환. code가 없으면 서버가 최근 토큰(__latest__)으로 응답.
  const checkOnce = async (silent: boolean): Promise<boolean> => {
    try {
      const code = codeRef.current || "";
      const r = await fetch(`/api/auth/google-idtoken?code=${encodeURIComponent(code)}`);
      const d = await r.json().catch(() => ({} as any));
      if (d.idToken) {
        const claims = decodeJwt(d.idToken);
        const aud = claims?.aud || "(없음)";
        const em = claims?.email || "(없음)";
        setDbg("① 구글 토큰 받음\naud: " + aud + "\nemail: " + em + "\n→ 홈페이지와 교환 중...");
        try {
          await loginWithGoogle(d.idToken);
          setDbg("② 교환 성공 — 앱으로 들어갑니다.");
        } catch (e: any) {
          setLocalErr(e?.message || "구글 로그인에 실패했습니다.");
          setDbg("홈페이지가 거절함: " + (e?.message || "") + "\n\n[앱이 보낸 토큰 내용]\naud: " + aud + "\nemail: " + em);
        }
        codeRef.current = "";
        return true;
      }
      if (!silent) {
        if (d.expired) setDbg("서버 토큰이 만료됐습니다. '구글로 로그인'을 다시 눌러주세요.");
        else setDbg("아직 서버에 구글 토큰이 없습니다(pending). 브라우저에서 로그인을 끝내셨나요?");
      }
    } catch (e: any) {
      if (!silent) setDbg("서버 요청 오류: " + (e?.message || "연결 실패"));
    }
    return false;
  };

  const manualCheck = async () => {
    if (checking) return;
    setChecking(true);
    setLocalErr("");
    await checkOnce(false);
    setChecking(false);
  };

  const startGoogle = () => {
    if (busy) return;
    setLocalErr("");
    setDbg("");
    setGoogleStarted(true);
    const code = (window.crypto && (window.crypto as any).randomUUID)
      ? (window.crypto as any).randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2);
    codeRef.current = code;
    const origin = window.location.origin; // http://localhost:5000
    openExternal(`${origin}/api/auth/login?appcode=${encodeURIComponent(code)}`);
    setDbg("브라우저에서 구글 로그인을 진행해주세요. 완료되면 자동으로 들어갑니다.");
    // 자동 확인: 1.5초마다 서버에 토큰이 도착했는지 확인 (최대 3분) + 앱 창에 돌아오는 즉시 확인
    if (pollTimer.current) clearTimeout(pollTimer.current);
    const started = Date.now();
    const loop = async () => {
      if (!codeRef.current) return; // 이미 성공/취소됨
      if (Date.now() - started > 180000) {
        setDbg("자동 확인 시간이 지났습니다. 로그인을 마치셨다면 아래 버튼을 눌러주세요.");
        return;
      }
      const done = await checkOnce(true);
      if (done) return;
      pollTimer.current = setTimeout(loop, 1500);
    };
    pollTimer.current = setTimeout(loop, 1500);
    // 브라우저에서 앱 창으로 돌아오는 순간 바로 확인 (포커스/표시 이벤트)
    const onBack = () => { if (codeRef.current) checkOnce(true); };
    window.addEventListener("focus", onBack);
    document.addEventListener("visibilitychange", onBack);
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") submit(); };
  const shownErr = localErr || error;

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", height: "44px", padding: "0 12px",
    border: "1px solid #d8cdb6", borderRadius: "8px", fontSize: "15px",
    marginBottom: "10px", outline: "none", background: "#fffdf8",
  };

  return (
    <div style={{
      height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #3d2c1a 0%, #5b4326 100%)", fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "360px", maxWidth: "90vw", background: "#faf7f2", borderRadius: "16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)", padding: "32px 28px", textAlign: "center",
      }}>
        <div style={{ fontSize: "34px", marginBottom: "6px" }}>☯</div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#3d2c1a", marginBottom: "2px" }}>지천명 만세력 PRO</div>
        <div style={{ fontSize: "13px", color: "#9a8b6f", marginBottom: "22px" }}>회원 로그인</div>

        {notice && (
          <div style={{ background: "#fdecea", border: "1px solid #f5c6cb", color: "#b0392b", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", marginBottom: "14px", lineHeight: 1.5 }}>
            ⚠️ {notice}
          </div>
        )}

        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
          placeholder="이메일" autoFocus style={inputStyle}
        />
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={onKey}
          placeholder="비밀번호" style={inputStyle}
        />

        {shownErr && (
          <div style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px", textAlign: "left" }}>
            {shownErr}
          </div>
        )}

        <button
          onClick={submit} disabled={busy || checking}
          style={{
            width: "100%", height: "46px", border: "none", borderRadius: "8px",
            background: (busy || checking) ? "#b9a77f" : "#3d2c1a", color: "#f5d78e", fontSize: "16px",
            fontWeight: "bold", cursor: (busy || checking) ? "default" : "pointer", marginBottom: "14px",
          }}
        >
          {busy ? "로그인 중..." : "로그인"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0 14px", color: "#c3b79a", fontSize: "12px" }}>
          <div style={{ flex: 1, height: "1px", background: "#e2d9c6" }} />
          또는
          <div style={{ flex: 1, height: "1px", background: "#e2d9c6" }} />
        </div>

        <button
          onClick={startGoogle} disabled={busy}
          style={{
            width: "100%", height: "46px", borderRadius: "8px", border: "1px solid #d0c7b3",
            background: "#ffffff", color: "#3c4043", fontSize: "15px", fontWeight: "bold",
            cursor: busy ? "default" : "pointer", marginBottom: "10px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          <span style={{ fontWeight: "bold", fontSize: "17px", color: "#4285F4" }}>G</span>
          구글로 로그인
        </button>

        {googleStarted && (
          <>
            <button
              onClick={manualCheck} disabled={checking}
              style={{
                width: "100%", height: "44px", borderRadius: "8px", border: "2px solid #3d2c1a",
                background: checking ? "#efe6d2" : "#f5ecd8", color: "#3d2c1a", fontSize: "14px",
                fontWeight: "bold", cursor: checking ? "default" : "pointer", marginBottom: "10px",
              }}
            >
              {checking ? "확인 중..." : "✅ 구글 로그인 완료했어요 → 앱 들어가기"}
            </button>
            <div style={{ fontSize: "12px", color: "#9a8b6f", marginBottom: "8px", lineHeight: 1.5 }}>
              브라우저에서 구글 로그인을 마친 뒤, 이 앱 창으로 돌아와 위 버튼을 눌러주세요.
            </div>
          </>
        )}

        {dbg && (
          <div style={{ fontSize: "11px", color: "#7a6a52", marginBottom: "10px", padding: "8px", background: "#f1ead9", borderRadius: "6px", textAlign: "left", lineHeight: 1.5, whiteSpace: "pre-line", wordBreak: "break-all" }}>
            {dbg}
          </div>
        )}

        <div style={{ fontSize: "13px", color: "#7a6a52" }}>
          아직 회원이 아니신가요?{" "}
          <span
            onClick={() => openExternal(REGISTER_URL)}
            style={{ color: "#1d4ed8", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}
          >
            회원가입
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "#b3a488", marginTop: "16px" }}>
          prosaju.co.kr 홈페이지 회원 계정으로 로그인됩니다.
        </div>
      </div>
    </div>
  );
}
