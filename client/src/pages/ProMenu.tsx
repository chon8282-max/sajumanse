// client/src/pages/ProMenu.tsx (모바일)
// PRO 모드: 일반 사용자는 앱을 그대로 쓰고, 여기서 구글 로그인 → 유료회원으로 확인된 사람만 PRO 기능 사용.
import React from "react";
import { useLocation } from "wouter";
import { useMembership, openExternal } from "@/contexts/MembershipContext";
import MemberLogin from "@/pages/MemberLogin";

export default function ProMenu() {
  const [, setLocation] = useLocation();
  const { can, ent, user, upgradeUrl, logout } = useMembership();

  const loggedIn = !!user;
  const isPaid = can("reservation") || can("customer") || can("stats");

  // 1) 로그인 안 됨 → 로그인 카드 (일반 사용자는 여기 안 와도 앱 그대로 사용)
  if (!loggedIn) {
    return (
      <div style={{ paddingBottom: "80px" }}>
        <div style={{ padding: "18px 16px 0", maxWidth: "440px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "17px", fontWeight: "bold", color: "#3d2c1a" }}>💼 지천명 PRO</div>
          <div style={{ fontSize: "13px", color: "#9a8b6f", marginTop: "4px" }}>
            PRO 회원 전용 기능입니다. 구글 계정으로 로그인하면 자동으로 확인됩니다.
          </div>
        </div>
        <MemberLogin />
      </div>
    );
  }

  // 2) 로그인했지만 유료회원 아님
  if (!isPaid) {
    return (
      <div style={{ padding: "28px 16px", maxWidth: "440px", margin: "0 auto", textAlign: "center", paddingBottom: "90px" }}>
        <div style={{ fontSize: "42px", marginBottom: "10px" }}>🔒</div>
        <div style={{ fontSize: "17px", fontWeight: "bold", color: "#3d2c1a", marginBottom: "8px" }}>PRO는 유료 회원 전용입니다</div>
        <div style={{ fontSize: "13px", color: "#9a8b6f", marginBottom: "4px" }}>로그인 계정: {user?.email || ""}</div>
        <div style={{ fontSize: "13px", color: "#9a8b6f", marginBottom: "20px" }}>현재 등급: {ent?.tierLabel || "무료회원"}</div>
        <button
          onClick={() => openExternal(upgradeUrl)}
          style={{ width: "100%", maxWidth: "280px", padding: "13px", border: "none", borderRadius: "10px", background: "#3d2c1a", color: "#f5d78e", fontWeight: "bold", fontSize: "15px", cursor: "pointer", marginBottom: "14px" }}
        >
          ⬆ 유료회원 등록하기
        </button>
        <div onClick={() => logout()} style={{ fontSize: "13px", color: "#1d4ed8", cursor: "pointer", textDecoration: "underline" }}>
          다른 계정으로 로그인
        </div>
      </div>
    );
  }

  // 3) 유료회원 → PRO 메뉴
  const items = [
    { label: "예약 관리", desc: "예약 등록·달력·자동 안내", icon: "🗓️", path: "/reservation" },
    { label: "고객 관리", desc: "고객 목록·상담 이력", icon: "👥", path: "/customer-management" },
    { label: "매출 집계", desc: "기간별 매출·검색", icon: "📊", path: "/stats" },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "480px", margin: "0 auto", paddingBottom: "90px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#3d2c1a" }}>💼 지천명 PRO</div>
        <div onClick={() => logout()} style={{ fontSize: "12px", color: "#9a8b6f", cursor: "pointer" }}>로그아웃</div>
      </div>
      <div style={{ fontSize: "13px", color: "#9a8b6f", marginBottom: "16px" }}>
        {(user?.nickname || user?.name || user?.email || "")}{ent?.tierLabel ? ` · ${ent.tierLabel}` : ""}
      </div>

      {items.map(item => (
        <div
          key={item.label}
          onClick={() => setLocation(item.path)}
          style={{
            display: "flex", alignItems: "center", gap: "14px",
            background: "#ffffff", border: "1px solid #e0d8cc", borderRadius: "12px",
            padding: "16px", marginBottom: "10px", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "28px" }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#3d2c1a" }}>{item.label}</div>
            <div style={{ fontSize: "12px", color: "#9a8b6f" }}>{item.desc}</div>
          </div>
          <div style={{ color: "#c3b79a", fontSize: "18px" }}>›</div>
        </div>
      ))}

      {ent?.aiCosts && Object.keys(ent.aiCosts).length > 0 && (
        <div style={{ fontSize: "12px", color: "#b3a488", textAlign: "center", marginTop: "8px" }}>
          🪙 AI 캐시 {ent.aiCash ?? 0}개
        </div>
      )}
    </div>
  );
}
