import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
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
            <CardTitle className="text-2xl">개인정보 처리방침</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <p>
              지천명 만세력 (이하 "회사"라 함)는 회원의 개인정보를 중요시하며, 「개인정보 보호법」 및 관련 법령을 준수하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>

            <section>
              <h3 className="font-semibold text-base mb-2">제1조 (개인정보의 처리 목적)</h3>
              <p className="mb-2">회사는 다음 목적을 위해 개인정보를 처리합니다.</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>회원 관리, 로그인 및 인증</li>
                <li>서비스 제공 및 개선</li>
                <li>문의 응대 및 고객지원</li>
                <li>마케팅, 회원 통계 분석</li>
              </ol>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제2조 (처리하는 개인정보 항목)</h3>
              <p className="mb-2">회사는 서비스 이용을 위해 아래의 개인정보를 수집·처리할 수 있습니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>필수 항목: 이메일, 사용자 식별자 (ID), 이름 (선택적), 로그인 토큰 등</li>
                <li>자동 생성 정보: IP 주소, 접속 로그, 쿠키 정보 등</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제3조 (개인정보의 처리 및 보유 기간)</h3>
              <p>
                회사는 개인정보를 수집·이용 목적이 달성된 후에는 지체 없이 파기하거나 별도 보관이 필요한 경우에는 내부 정책 또는 법령에 따라 일정 기간 보관합니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제4조 (개인정보의 파기 절차 및 방법)</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>파기 절차: 서비스 종료, 탈퇴 요청 시 해당 정보를 파기</li>
                <li>파기 방법: 전자적 파일 형태는 복구 불가능한 방법으로 삭제</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제5조 (정보주체 및 법정대리인의 권리·의무 및 행사 방법)</h3>
              <p>
                이용자 및 법정대리인은 언제든지 개인정보 열람, 정정, 삭제, 처리정지 등을 회사에 요청할 수 있으며, 회사는 지체 없이 처리합니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제6조 (개인정보의 제3자 제공)</h3>
              <p>
                회사는 정보주체의 동의 또는 법령 근거가 없는 한 개인정보를 제3자에게 제공하지 않습니다. 제공이 필요한 경우, 제공 대상, 목적, 항목, 보유 기간 등을 명시하여 동의를 받습니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제7조 (개인정보 처리 위탁)</h3>
              <p>
                회사는 서비스 운영을 위하여 일부 업무를 외부 업체에 위탁할 수 있으며, 위탁 시 적절한 보호조치를 요구하고 감독을 합니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제8조 (개인정보의 안전성 확보 조치)</h3>
              <p className="mb-2">회사는 개인정보의 안전한 처리를 위하여 다음과 같은 조치를 합니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>접근 통제, 암호화, 권한 관리</li>
                <li>내부 직원 교육 및 보안 정책 수립</li>
                <li>침해 사고 대응 체계</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제9조 (개인정보 보호책임자)</h3>
              <p className="mb-2">개인정보 보호 관련 문의, 불만처리 및 피해구제 요청은 아래 책임자에게 할 수 있습니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>책임자: 김재완</li>
                <li>연락처: chon8282@kakao.com</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제10조 (권익침해 구제방법)</h3>
              <p>
                이용자는 개인정보 관련 분쟁이 발생한 경우 개인정보분쟁조정위원회, 한국인터넷진흥원(KISA), 수사기관 등에 문의할 수 있습니다.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">제11조 (개인정보 처리방침의 변경)</h3>
              <p>
                본 방침은 변경될 수 있으며, 변경 시 시행일자 및 변경사유를 사전에 공지합니다.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
