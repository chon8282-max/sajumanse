import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로 가기
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">서비스 이용약관</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <section>
              <h3 className="font-semibold text-base mb-2">제1조 (목적)</h3>
              <p>
                이 약관은 지천명 만세력(이하 "서비스")이 제공하는 모든 서비스의 이용 조건 및 절차, 이용자와 서비스의 권리·의무 등을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제2조 (정의)</h3>
              <p className="mb-2">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>"이용자"란 본 약관에 따라 서비스를 이용하는 자</li>
                <li>"회원"이란 회사에 개인정보를 제공하여 회원가입을 완료한 자</li>
                <li>"비회원"이란 회원가입 없이 서비스를 이용하는 자 등</li>
              </ol>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제3조 (약관의 게시 및 개정)</h3>
              <p>
                서비스는 본 약관을 서비스 화면에 게시하며, 개정 시 사전에 공지합니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제4조 (서비스 이용 계약의 성립)</h3>
              <p>
                이용자가 본 약관에 동의하고 회원가입을 신청하면, 회사가 이를 승낙함으로써 계약이 성립됩니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제5조 (서비스의 제공 및 변경)</h3>
              <p className="mb-2">회사는 아래 서비스를 제공합니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>콘텐츠 열람, 기능 이용 등</li>
              </ul>
              <p className="mt-2">
                회사는 필요 시 서비스의 일부를 변경할 수 있으며, 변경 시 사전에 공지합니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제6조 (이용자의 의무)</h3>
              <p className="mb-2">이용자는 다음 행위를 하여서는 안 됩니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>타인의 계정 도용, 불법적 접근</li>
                <li>서비스 저해 행위</li>
                <li>타인의 권리 침해</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제7조 (계약 해지 및 서비스 이용 제한)</h3>
              <p>
                이용자는 언제든지 회원 탈퇴를 요청할 수 있으며, 회사는 사유가 있는 경우 이용 제한할 수 있습니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제8조 (면책 조항)</h3>
              <p>
                회사는 천재지변, 불가항력 등 책임 없는 사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제9조 (저작권 및 지적재산권)</h3>
              <p>
                서비스 내 모든 콘텐츠의 저작권은 회사에 있으며, 무단 복제, 배포, 수정 등은 금지됩니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제10조 (준거법 및 관할)</h3>
              <p>
                본 약관은 대한민국법에 따라 해석되며, 분쟁 발생 시 회사 소재지 관할 법원을 관할 법원으로 합니다.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
