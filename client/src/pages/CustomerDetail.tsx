import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Plus, Trash2, MessageSquare, Copy } from "lucide-react";
import { localDB } from "@/lib/saju-local-storage";
import { getTemplates, renderTemplate, MsgTemplate } from "@/lib/message-templates";
import type { SajuRecord } from "@shared/schema";

// ── 고객 추가정보 저장소 ──────────────────────────────
const CUSTOMER_KEY = "customer-info-records";

interface Anniversary {
  label: string;
  date: string;
}

interface CustomerInfo {
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  visits: string[];
  birthdayAuto: boolean;
  anniversaries: Anniversary[];
  privateNote: string;
  receiveOptOut: boolean; // 수신거부 여부
}

const EMPTY_INFO: CustomerInfo = {
  phone: "",
  postalCode: "",
  address: "",
  addressDetail: "",
  visits: [],
  birthdayAuto: false,
  anniversaries: [],
  privateNote: "",
  receiveOptOut: false,
};

function loadCustomerInfo(id: string): CustomerInfo {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return { ...EMPTY_INFO, ...(map[id] || {}) };
  } catch {
    return { ...EMPTY_INFO };
  }
}

function saveCustomerInfo(id: string, info: CustomerInfo) {
  const raw = localStorage.getItem(CUSTOMER_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[id] = info;
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(map));
}

// 전화번호 자동 하이픈
function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length >= 8) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length >= 4) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

// 구역 스타일 (한 카드 안에서 구분선으로만 나눔)
const sectionStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#3d2c1a",
  marginBottom: "4px",
};

export default function CustomerDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/customer/:id");
  const customerId = params?.id || "";
  const { toast } = useToast();

  const [info, setInfo] = useState<CustomerInfo>({ ...EMPTY_INFO });
  const [showPostcode, setShowPostcode] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);
  const [newVisit, setNewVisit] = useState("");
  const [newAnnivLabel, setNewAnnivLabel] = useState("");
  const [newAnnivDate, setNewAnnivDate] = useState("");

  // 메시지 템플릿
  const [templates, setTemplates] = useState<MsgTemplate[]>([]);
  const [selectedTplId, setSelectedTplId] = useState("");
  useEffect(() => {
    const list = getTemplates();
    setTemplates(list);
    if (list.length > 0) setSelectedTplId(list[0].id);
  }, []);

  const { data: sajuList } = useQuery<SajuRecord[]>({
    queryKey: ["local-saju-records"],
    queryFn: async () => await localDB.getSajuRecords(),
    staleTime: 1000 * 60 * 5,
  });
  const saju = sajuList?.find((s) => s.id === customerId);

  // 고객 정보 로드 + 오늘 방문일 자동 등록
  useEffect(() => {
    if (!customerId) return;
    const loaded = loadCustomerInfo(customerId);
    const today = new Date().toISOString().slice(0, 10);
    if (!loaded.visits.includes(today)) {
      loaded.visits = [today, ...loaded.visits].sort().reverse();
      saveCustomerInfo(customerId, loaded);
    }
    setInfo(loaded);
  }, [customerId]);

  // 우편번호 팝업 (임베드 방식 - Electron 팝업차단 회피)
  useEffect(() => {
    if (!showPostcode || !postcodeRef.current) return;
    if (!(window as any).daum?.Postcode) {
      alert("우편번호 서비스를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
      setShowPostcode(false);
      return;
    }
    postcodeRef.current.innerHTML = "";
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setInfo((p) => ({
          ...p,
          postalCode: data.zonecode,
          address: data.roadAddress || data.jibunAddress,
        }));
        setShowPostcode(false);
      },
      onclose: () => setShowPostcode(false),
      width: "100%",
      height: "100%",
    }).embed(postcodeRef.current);
  }, [showPostcode]);

  const handleSave = () => {
    saveCustomerInfo(customerId, info);
    toast({ title: "저장 완료", description: "고객 정보가 저장되었습니다.", duration: 700 });
  };

  const handleCopyPhone = () => {
    if (!info.phone) return;
    navigator.clipboard.writeText(info.phone);
    toast({ title: "복사됨", description: `전화번호 복사: ${info.phone}`, duration: 700 });
  };

  const handleSms = () => {
    if (!info.phone) {
      toast({ title: "전화번호 없음", description: "먼저 전화번호를 입력하세요.", variant: "destructive", duration: 1000 });
      return;
    }
    window.location.href = `sms:${info.phone.replace(/\D/g, "")}`;
  };

  // 템플릿 미리보기 텍스트
  const renderedMessage = (() => {
    const tpl = templates.find(t => t.id === selectedTplId);
    if (!tpl || !saju) return "";
    const officeName = localStorage.getItem("office-name") || "";
    return renderTemplate(tpl.content, {
      이름: saju.name || "",
      나이: new Date().getFullYear() - saju.birthYear + 1,
      생일: `${saju.birthYear}-${String(saju.birthMonth).padStart(2, "0")}-${String(saju.birthDay).padStart(2, "0")}`,
      일간: saju.daySky || "",
      상호: officeName,
      주소: info.address + " " + info.addressDetail,
      전화: info.phone,
    });
  })();

  const handleSendTemplate = () => {
    if (!info.phone) {
      toast({ title: "전화번호 없음", description: "먼저 전화번호를 입력하세요.", variant: "destructive", duration: 1000 });
      return;
    }
    window.location.href = `sms:${info.phone.replace(/\D/g, "")}?body=${encodeURIComponent(renderedMessage)}`;
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(renderedMessage);
    toast({ title: "복사 완료", description: "카톡에 붙여넣기(Ctrl+V) 하세요.", duration: 1500 });
  };

  const addVisit = () => {
    if (!newVisit) return;
    setInfo((p) => ({ ...p, visits: Array.from(new Set([...p.visits, newVisit])).sort().reverse() }));
    setNewVisit("");
  };

  const removeVisit = (idx: number) => {
    setInfo((p) => ({ ...p, visits: p.visits.filter((_, i) => i !== idx) }));
  };

  const addAnniversary = () => {
    if (!newAnnivLabel || !newAnnivDate) return;
    setInfo((p) => ({
      ...p,
      anniversaries: [...p.anniversaries, { label: newAnnivLabel, date: newAnnivDate }],
    }));
    setNewAnnivLabel("");
    setNewAnnivDate("");
  };

  const removeAnniversary = (idx: number) => {
    setInfo((p) => ({ ...p, anniversaries: p.anniversaries.filter((_, i) => i !== idx) }));
  };

  if (!saju) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">고객 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const birthdayStr = `${saju.birthYear}-${String(saju.birthMonth).padStart(2, "0")}-${String(saju.birthDay).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-xl">
        {/* 상단 */}
        <div className="relative flex items-center mb-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/customer-management")} className="absolute left-0">
            <ArrowLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <div className="w-full text-center">
            <h1 className="text-lg font-semibold">{saju.name || "이름없음"} 고객 정보</h1>
          </div>
          <Button size="sm" onClick={handleSave} className="absolute right-0">
            저장
          </Button>
        </div>

        {/* ── 한 카드로 밀착 ── */}
        <div className="border rounded-md bg-white overflow-hidden">
          {/* 기본정보 */}
          <div style={sectionStyle}>
            <div className="text-sm">
              <span className="font-semibold">{saju.name || "이름없음"}</span>
              <span className="ml-2 text-muted-foreground">{saju.gender}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              양력 {saju.birthYear}.{saju.birthMonth}.{saju.birthDay}
              {saju.lunarYear && ` · 음력 ${saju.lunarYear}.${saju.lunarMonth}.${saju.lunarDay}`}
              {saju.birthTime && ` · ${saju.birthTime}`}
            </div>
          </div>

          {/* 전화번호 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>전화번호</div>
            <div className="flex gap-1">
              <Input
                value={info.phone}
                onChange={(e) => setInfo((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                placeholder="010-0000-0000"
                className="h-8 text-sm"
              />
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleSms} title="문자 보내기">
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleCopyPhone} title="번호 복사">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* 주소 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>주소</div>
            <div className="flex gap-1">
              <Input value={info.postalCode} readOnly placeholder="우편번호" className="h-8 text-sm w-24" />
              <Button variant="outline" size="sm" className="h-8" onClick={() => setShowPostcode(true)}>
                우편번호 검색
              </Button>
            </div>
            <Input value={info.address} readOnly placeholder="기본주소" className="h-8 text-sm mt-1" />
            <Input
              value={info.addressDetail}
              onChange={(e) => setInfo((p) => ({ ...p, addressDetail: e.target.value }))}
              placeholder="상세주소"
              className="h-8 text-sm mt-1"
            />
          </div>

          {/* 방문일 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>방문일 (오늘 자동등록)</div>
            <div className="flex gap-1">
              <Input type="date" value={newVisit} onChange={(e) => setNewVisit(e.target.value)} className="h-8 text-sm" />
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={addVisit}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {info.visits.map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-1 mt-1">
                <span>{v}</span>
                <Trash2 className="w-3 h-3 text-muted-foreground cursor-pointer" onClick={() => removeVisit(i)} />
              </div>
            ))}
          </div>

          {/* 메시지 발송 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>메시지 보내기</div>
            <select
              value={selectedTplId}
              onChange={(e) => setSelectedTplId(e.target.value)}
              className="w-full h-8 text-sm border rounded-md px-2 mb-1"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="text-xs bg-muted/50 border rounded p-2 whitespace-pre-wrap mb-1">
              {renderedMessage || "(템플릿 없음 — 톡설정에서 만들어주세요)"}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 flex-1" onClick={handleSendTemplate}>
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> 문자앱 열기
              </Button>
              <Button variant="outline" size="sm" className="h-8 flex-1" onClick={handleCopyTemplate}>
                <Copy className="w-3.5 h-3.5 mr-1" /> 복사 (카톡용)
              </Button>
            </div>
          </div>

          {/* 자동문자 · 기념일 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>자동문자 · 기념일</div>
            <label className="flex items-center gap-2 text-xs cursor-pointer mb-1">
              <Checkbox
                checked={info.birthdayAuto}
                onCheckedChange={(c) => setInfo((p) => ({ ...p, birthdayAuto: !!c }))}
              />
              생일 자동 문자/카톡 발송
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer mb-1 text-destructive">
              <Checkbox
                checked={info.receiveOptOut}
                onCheckedChange={(c) => setInfo((p) => ({ ...p, receiveOptOut: !!c }))}
              />
              수신거부 (이 고객에게는 단체발송/자동발송을 보내지 않음)
            </label>
            <div className="flex gap-1">
              <Input value={newAnnivLabel} onChange={(e) => setNewAnnivLabel(e.target.value)} placeholder="기념일명" className="h-8 text-sm w-24" />
              <Input type="date" value={newAnnivDate} onChange={(e) => setNewAnnivDate(e.target.value)} className="h-8 text-sm" />
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={addAnniversary}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {/* 생일 자동 표시 */}
            <div className="flex items-center justify-between text-xs px-1 mt-1 text-muted-foreground">
              <span>🎂 생일 · {birthdayStr} (양력)</span>
            </div>
            {info.anniversaries.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-1 mt-1">
                <span>{a.label} · {a.date}</span>
                <Trash2 className="w-3 h-3 text-muted-foreground cursor-pointer" onClick={() => removeAnniversary(i)} />
              </div>
            ))}
          </div>

          {/* 특이사항 */}
          <div style={{ ...sectionStyle, borderBottom: "none" }}>
            <div style={sectionTitleStyle}>특이사항 (사장님 전용)</div>
            <textarea
              value={info.privateNote}
              onChange={(e) => setInfo((p) => ({ ...p, privateNote: e.target.value }))}
              placeholder="고객에게 보이지 않는 메모..."
              className="w-full h-40 text-sm border rounded-md p-2 resize-y bg-background"
            />
          </div>
        </div>

        <div className="h-20" />
      </div>

      {/* 우편번호 검색 팝업 (임베드) */}
      {showPostcode && (
        <div
          onClick={() => setShowPostcode(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", width: "90%", maxWidth: "500px", height: "500px", borderRadius: "8px", overflow: "hidden", position: "relative" }}
          >
            <div
              onClick={() => setShowPostcode(false)}
              style={{ position: "absolute", top: 8, right: 12, cursor: "pointer", fontSize: "18px", zIndex: 1, background: "#fff", padding: "0 6px" }}
            >
              ✕
            </div>
            <div ref={postcodeRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      )}
    </div>
  );
}