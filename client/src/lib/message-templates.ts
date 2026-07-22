// 메시지 템플릿 관리 (localStorage 저장)
const KEY = "message-templates";

export interface MsgTemplate {
  id: string;
  name: string;      // 템플릿 이름 (예: 생일축하)
  content: string;   // 본문 (변수 사용 가능)
  isBirthday?: boolean; // 생일용 여부
}

export const TEMPLATE_VARS = "{이름} {나이} {생일} {일간} {상호} {주소} {전화}";

// 기본 제공 템플릿
const DEFAULT_TEMPLATES: MsgTemplate[] = [
  {
    id: "birthday",
    name: "생일축하",
    isBirthday: true,
    content:
      "{이름}님, 생일을 진심으로 축하드립니다! 🎂\n올 한 해도 건강과 행운이 가득하시길 기원합니다.\n\n- {상호}",
  },
  {
    id: "greeting",
    name: "새해인사",
    content: "{이름}님, 새해 복 많이 받으세요.\n올 한 해 좋은 일만 가득하시길 바랍니다.\n\n- {상호}",
  },
];

export function getTemplates(): MsgTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(list: MsgTemplate[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// 변수 치환
export function renderTemplate(
  content: string,
  vars: {
    이름?: string;
    나이?: string | number;
    생일?: string;
    일간?: string;
    상호?: string;
    주소?: string;
    전화?: string;
  }
): string {
  let out = content;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.split(`{${k}}`).join(String(v ?? ""));
  });
  return out;
}