import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Share, PlusSquare, Copy, Check } from "lucide-react";

// 기기 / 브라우저 감지
function detect() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
  const inApp = /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NAVER|wv/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  return { isIOS, isAndroid, isSafari, inApp, isStandalone };
}

const APP_URL = "https://sajumanse-558965018946.asia-northeast3.run.app";

export default function InstallGuide() {
  const [, setLocation] = useLocation();
  const [d, setD] = useState(detect());
  const [copied, setCopied] = useState(false);

  useEffect(() => setD(detect()), []);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
    } catch {
      const el = document.createElement("textarea");
      el.value = APP_URL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 이미 설치된 상태
  if (d.isStandalone) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">☯</div>
        <h1 className="text-xl font-bold mb-2">이미 설치되어 있습니다</h1>
        <p className="text-sm text-muted-foreground mb-6">
          지금 앱으로 실행 중이에요.
        </p>
        <Button onClick={() => setLocation("/")}>시작하기</Button>
      </div>
    );
  }

  const Step = ({ n, icon, children }: { n: number; icon?: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex gap-3 items-start py-3 border-b last:border-b-0">
      <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm leading-relaxed flex-1">{children}</div>
      {icon && <div className="text-muted-foreground shrink-0 mt-0.5">{icon}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 홈으로
        </Button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">☯</div>
          <h1 className="text-xl font-bold text-amber-900">지천명 만세력 설치</h1>
          <p className="text-sm text-muted-foreground mt-1">
            홈 화면에 추가하면 앱처럼 쓸 수 있어요
          </p>
        </div>

        {/* 카톡/인앱 브라우저 경고 */}
        {d.inApp && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm">
            <b className="text-red-700">⚠️ 사파리(또는 크롬)로 열어주세요</b>
            <p className="text-red-600 mt-1">
              지금 카톡 등 앱 안의 브라우저로 보고 계셔서 설치가 안 됩니다.
              아래 주소를 복사한 뒤, 사파리를 열어 붙여넣어 주세요.
            </p>
            <Button className="w-full mt-3" onClick={copyUrl}>
              {copied ? <><Check className="w-4 h-4 mr-1" /> 복사됨!</> : <><Copy className="w-4 h-4 mr-1" /> 주소 복사</>}
            </Button>
          </div>
        )}

        {/* iOS 안내 */}
        {d.isIOS && !d.inApp && (
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="font-semibold mb-2 text-amber-900">🍎 아이폰 · 아이패드</div>
            {!d.isSafari && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 mb-3">
                <b>사파리로 열어야 합니다.</b> 크롬에서는 설치 버튼이 나오지 않아요.
              </div>
            )}
            <Step n={1} icon={<Share className="w-4 h-4" />}>
              화면 <b>아래쪽 공유 버튼</b>(네모에 화살표 ↑)을 누르세요
            </Step>
            <Step n={2} icon={<PlusSquare className="w-4 h-4" />}>
              메뉴를 아래로 내려 <b>"홈 화면에 추가"</b>를 누르세요
            </Step>
            <Step n={3}>
              오른쪽 위 <b>"추가"</b>를 누르면 완료!
            </Step>
            <p className="text-xs text-muted-foreground mt-3">
              홈 화면에 ☯ 아이콘이 생깁니다. 그걸 누르면 앱처럼 열려요.
            </p>
          </div>
        )}

        {/* 안드로이드 안내 */}
        {d.isAndroid && !d.inApp && (
          <div className="bg-white rounded-lg border p-4 mb-4">
            <div className="font-semibold mb-2 text-amber-900">🤖 안드로이드</div>
            <Step n={1}>
              화면 <b>오른쪽 위 ⋮ 메뉴</b>를 누르세요
            </Step>
            <Step n={2}>
              <b>"홈 화면에 추가"</b> 또는 <b>"앱 설치"</b>를 누르세요
            </Step>
            <Step n={3}>
              <b>"설치"</b>를 누르면 완료!
            </Step>
          </div>
        )}

        {/* PC 등 기타 */}
        {!d.isIOS && !d.isAndroid && !d.inApp && (
          <div className="bg-white rounded-lg border p-4 mb-4 text-sm">
            <div className="font-semibold mb-2 text-amber-900">💻 PC에서 보고 계시네요</div>
            <p className="text-muted-foreground mb-3">
              휴대폰으로 아래 주소를 열면 앱으로 설치할 수 있습니다.
            </p>
            <div className="bg-muted rounded p-2 text-xs break-all font-mono mb-2">{APP_URL}</div>
            <Button variant="outline" className="w-full" onClick={copyUrl}>
              {copied ? <><Check className="w-4 h-4 mr-1" /> 복사됨!</> : <><Copy className="w-4 h-4 mr-1" /> 주소 복사</>}
            </Button>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
          설치 없이 바로 사용하기
        </Button>

        <div className="h-10" />
      </div>
    </div>
  );
}