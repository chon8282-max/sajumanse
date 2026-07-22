// server/message-routes.ts
// 예약 안내 메시지: 설정 저장 + 발송 API
// 발송 방식 3가지: copy(복사), sms(문자), alimtalk(카카오 알림톡) — 문자/알림톡은 솔라피(Solapi) 사용
import { type Express } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pool } from "./db";

const DATA_DIR = path.resolve(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "message-settings.json");

interface MessageSettings {
  officeName: string;      // 상호명
  officeAddress: string;   // 사무실 주소
  officePhone: string;     // 사무실 전화번호
  template: string;        // 메시지 템플릿
  phoneTemplate: string;   // 전화상담용 템플릿(주소 없음)
  method: 'copy' | 'sms' | 'alimtalk'; // 발송 방식
  solapiApiKey: string;    // 솔라피 API Key
  solapiApiSecret: string; // 솔라피 API Secret
  senderPhone: string;     // 등록된 발신번호
  kakaoPfId: string;       // 카카오 채널 pfId (알림톡용)
  kakaoTemplateId: string; // 승인된 알림톡 템플릿 ID
  kakaoPhoneTemplateId: string; // 전화상담용 알림톡 템플릿 ID
}

const DEFAULT_SETTINGS: MessageSettings = {
  officeName: '',
  officeAddress: '',
  officePhone: '',
  template: '[{상호}] {이름}님, 예약이 확정되었습니다.\n\n일시: {날짜} {시간}\n위치: {주소}\n지도: {지도링크}\n문의: {전화}',
  phoneTemplate: '{이름}님 전화상담 {시간}에 예약 되셨습니다.\n\n기다려 주시면 선생님께서 약속 시간에 전화 드립니다.\n감사합니다.^^\n\n-{상호}\n-{전화}',
  method: 'copy',
  solapiApiKey: '',
  solapiApiSecret: '',
  senderPhone: '',
  kakaoPfId: '',
  kakaoTemplateId: '',
  kakaoPhoneTemplateId: '',
};

// 회원 식별 (쿠키/헤더)
function emailOf(req: any): string {
  const c = req?.cookies?.ps_member_email;
  const cookieEmail = c ? decodeURIComponent(String(c)) : "";
  const e = String(cookieEmail || req?.headers?.["x-member-email"] || "").trim().toLowerCase();
  return e.includes("@") ? e : "";
}

let MSG_TABLE_READY = false;
async function ensureMsgTable() {
  if (MSG_TABLE_READY) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS member_message_settings (member_email varchar PRIMARY KEY, settings jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    MSG_TABLE_READY = true;
  } catch (e: any) { console.error("메시지설정 테이블 경고:", e?.message); }
}

function loadFromFile(): MessageSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// 회원별 설정: DB 우선(PC·폰 공유), 없으면 로컬 파일(PC) → DB로 자동 이관
async function loadSettings(email: string): Promise<MessageSettings> {
  await ensureMsgTable();
  if (email) {
    try {
      const r = await pool.query(`SELECT settings FROM member_message_settings WHERE member_email=$1`, [email]);
      if (r.rows[0]?.settings) return { ...DEFAULT_SETTINGS, ...(r.rows[0].settings as any) };
    } catch (e: any) { console.error("메시지설정 조회 경고:", e?.message); }
  }
  const fileS = loadFromFile();
  if (email && fileS.solapiApiKey) {
    try {
      await pool.query(
        `INSERT INTO member_message_settings (member_email, settings, updated_at) VALUES ($1,$2,now()) ON CONFLICT (member_email) DO NOTHING`,
        [email, JSON.stringify(fileS)]
      );
    } catch {}
  }
  return fileS;
}

async function saveSettings(email: string, s: MessageSettings) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), "utf-8");
  } catch {}
  if (email) {
    await ensureMsgTable();
    try {
      await pool.query(
        `INSERT INTO member_message_settings (member_email, settings, updated_at) VALUES ($1,$2,now()) ON CONFLICT (member_email) DO UPDATE SET settings=EXCLUDED.settings, updated_at=now()`,
        [email, JSON.stringify(s)]
      );
    } catch (e: any) { console.error("메시지설정 저장 경고:", e?.message); }
  }
}

// 템플릿 변수 치환
function composeMessage(s: MessageSettings, info: { name: string; date: string; time: string }, usePhone?: boolean) {
  const mapLink = s.officeAddress
    ? 'https://map.naver.com/p/search/' + encodeURIComponent(s.officeAddress)
    : '';
  const tpl = usePhone && s.phoneTemplate ? s.phoneTemplate : s.template;
  return tpl
    .split('{상호}').join(s.officeName)
    .split('{이름}').join(info.name)
    .split('{날짜}').join(info.date)
    .split('{시간}').join(info.time)
    .split('{주소}').join(s.officeAddress)
    .split('{지도링크}').join(mapLink)
    .split('{전화}').join(s.officePhone);
}

// 솔라피 인증 헤더 생성
function solapiAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

// 솔라피 발송 (문자 또는 알림톡)
async function sendViaSolapi(s: MessageSettings, to: string, text: string, info: { name: string; date: string; time: string }, usePhone?: boolean) {
  const message: any = {
    to: to.replace(/\D/g, ''),
    from: s.senderPhone.replace(/\D/g, ''),
    text,
  };

  if (s.method === 'alimtalk') {
    const mapLink = s.officeAddress
      ? 'https://map.naver.com/p/search/' + encodeURIComponent(s.officeAddress)
      : '';
    message.type = 'ATA';
    const dateTime = info.time ? `${info.date} ${info.time}` : info.date;
    message.kakaoOptions = {
      pfId: s.kakaoPfId,
      templateId: (usePhone && s.kakaoPhoneTemplateId) ? s.kakaoPhoneTemplateId : s.kakaoTemplateId,
      // 템플릿마다 변수 이름이 달라서, 같은 값을 여러 별칭으로 전달 (카카오는 템플릿에 없는 변수는 무시)
      variables: {
        // 이름
        '#{이름}': info.name, '#{고객명}': info.name, '#{성함}': info.name,
        '#{성명}': info.name, '#{예약자}': info.name, '#{고객}': info.name,
        // 날짜/시간/예약일시
        '#{날짜}': info.date, '#{예약일}': info.date, '#{예약날짜}': info.date,
        '#{시간}': info.time, '#{예약시간}': info.time,
        '#{예약일시}': dateTime, '#{일시}': dateTime,
        // 상담사/담당자 (예약에 별도 값이 없어 상호명으로 대체)
        '#{상담사}': s.officeName, '#{담당자}': s.officeName,
        // 상호/매장명
        '#{상호}': s.officeName, '#{업체명}': s.officeName, '#{매장명}': s.officeName,
        // 주소
        '#{주소}': s.officeAddress, '#{매장주소}': s.officeAddress, '#{매장}': s.officeAddress,
        '#{지도링크}': mapLink,
        // 전화/연락처/문의
        '#{전화}': s.officePhone, '#{전화번호}': s.officePhone, '#{연락처}': s.officePhone, '#{문의}': s.officePhone,
      },
    };
  }

  const res = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
    method: 'POST',
    headers: {
      'Authorization': solapiAuthHeader(s.solapiApiKey, s.solapiApiSecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: [message] }),
  });
  const json: any = await res.json();

  // 솔라피 응답 검사
  const failed = json?.failedMessageList?.length > 0;
  if (!res.ok || failed) {
    const reason = failed
      ? (json.failedMessageList[0]?.statusMessage || '발송 실패')
      : (json?.errorMessage || `HTTP ${res.status}`);
    throw new Error(reason);
  }
  return json;
}

export function registerMessageRoutes(app: Express) {
  // 설정 조회
  app.get("/api/message-settings", async (req, res) => {
    res.json({ success: true, data: await loadSettings(emailOf(req)) });
  });

  // 설정 저장
  app.post("/api/message-settings", async (req, res) => {
    const email = emailOf(req);
    const prev = await loadSettings(email);
    const next: MessageSettings = { ...prev, ...req.body };
    await saveSettings(email, next);
    res.json({ success: true, data: next });
  });

  // 예약 안내 메시지 작성 + 발송
  // body: { phone, name, date, time }
  app.post("/api/reservation-message", async (req, res) => {
    try {
      const { phone, name, date, time, forceCopy, phoneConsult } = req.body || {};
      if (!name || !date) {
        return res.status(400).json({ success: false, error: "이름과 날짜가 필요합니다." });
      }
      const s = await loadSettings(emailOf(req));
      const text = composeMessage(s, { name: String(name), date: String(date), time: String(time || '') }, !!phoneConsult);

      // 복사 모드(또는 수동 복사 요청): 메시지만 만들어 돌려줌
      if (s.method === 'copy' || forceCopy) {
        return res.json({ success: true, mode: 'copy', message: text });
      }

      // 문자/알림톡: 전화번호와 API 설정 필요
      if (!phone) {
        return res.status(400).json({ success: false, error: "받는 사람 전화번호가 없습니다." });
      }
      if (!s.solapiApiKey || !s.solapiApiSecret || !s.senderPhone) {
        return res.status(400).json({ success: false, error: "톡설정에서 API 키와 발신번호를 먼저 입력해주세요." });
      }
      if (s.method === 'alimtalk' && (!s.kakaoPfId || !s.kakaoTemplateId)) {
        return res.status(400).json({ success: false, error: "톡설정에서 카카오 채널 ID와 템플릿 ID를 입력해주세요." });
      }

      await sendViaSolapi(s, String(phone), text, { name: String(name), date: String(date), time: String(time || '') }, !!phoneConsult);
      res.json({ success: true, mode: s.method, message: text });
    } catch (e: any) {
      console.error("메시지 발송 오류:", e);
      res.status(500).json({ success: false, error: e?.message || "발송 중 오류가 발생했습니다." });
    }
  });

  // ⚠️ 임시 디버그용 - pfId 확인 후 이 라우트는 삭제하세요
  app.get("/api/debug-kakao-channels", async (req, res) => {
    try {
      const s = await loadSettings(emailOf(req));
      if (!s.solapiApiKey || !s.solapiApiSecret) {
        return res.status(400).json({ error: "먼저 톡설정에서 API Key/Secret을 저장하세요." });
      }
      const authHeader = solapiAuthHeader(s.solapiApiKey, s.solapiApiSecret);
      const r = await fetch("https://api.solapi.com/kakao/v2/channels", {
        headers: { Authorization: authHeader },
      });
      const json = await r.json();
      res.json(json);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 단체발송 (전체회원 또는 필터링된 회원에게 SMS 발송)
  // body: { recipients: [{ phone: string, text: string }] }
  app.post("/api/send-bulk-sms", async (req, res) => {
    try {
      const { recipients } = req.body || {};
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: "보낼 대상이 없습니다." });
      }
      const s = await loadSettings(emailOf(req));
      if (!s.solapiApiKey || !s.solapiApiSecret || !s.senderPhone) {
        return res.status(400).json({ success: false, error: "톡설정에서 API 키와 발신번호를 먼저 입력해주세요." });
      }

      const messages = recipients
        .filter((r: any) => r.phone && r.text)
        .map((r: any) => ({
          to: String(r.phone).replace(/\D/g, ""),
          from: s.senderPhone.replace(/\D/g, ""),
          text: String(r.text),
        }));

      if (messages.length === 0) {
        return res.status(400).json({ success: false, error: "유효한 전화번호가 없습니다." });
      }

      const authHeader = solapiAuthHeader(s.solapiApiKey, s.solapiApiSecret);
      const chunkSize = 100; // 한 번에 너무 많이 보내지 않도록 분할
      const results: any[] = [];

      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        const r = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chunk }),
        });
        const json: any = await r.json();
        results.push(json);
      }

      const totalFailed = results.reduce(
        (acc, r) => acc + (r?.failedMessageList?.length || 0),
        0
      );

      res.json({
        success: true,
        totalSent: messages.length,
        totalFailed,
        results,
      });
    } catch (e: any) {
      console.error("단체발송 오류:", e);
      res.status(500).json({ success: false, error: e?.message || "발송 중 오류가 발생했습니다." });
    }
  });
  console.log("✅ 메시지 API 등록 완료 (/api/message-settings, /api/reservation-message)");
}