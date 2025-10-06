import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Settings, Globe } from "lucide-react";
import { useLocation } from "wouter";

export default function Guide() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              20년 실전 노하우 집약!<br/>궁극의 통찰 도구, 지천명 만세력 출시
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                지천명 만세력은 20여 년간 명리학 실전 감정을 이어온 전문가의 경험과 지혜를 바탕으로 탄생했습니다. 
                기존 만세력 앱들의 한계를 뛰어넘어, 전문가의 깊은 통찰과 일반인의 쉬운 접근을 완벽하게 조화시킨 실전형 명리 도구입니다.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                이 앱은 단순한 계산기를 넘어, 실제 사주 감정에 필요한 핵심 기능만을 응축하여 사용자 경험(UX/UI)과 기능성 모두를 혁신합니다.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-semibold text-primary">전문가의 시선을 담다: 압도적인 사용 편의성 (UI/UX)</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                지천명 만세력의 인터페이스는 수많은 실전 경험을 통해 가장 효율적이라고 판단된 방식으로 구현되었습니다.
              </p>
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">다차원 명식 입력</h3>
                  <p className="text-sm text-muted-foreground">
                    기본적인 생년월일시 입력은 물론, 전문가의 빠른 작업을 위해 간지(干支) 사주 직접 입력 기능까지 지원합니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">즉각적인 명식 탐색</h3>
                  <p className="text-sm text-muted-foreground">
                    사주 명식 화면에서 생시나 생년월일을 간단한 클릭만으로 즉시 변경할 수 있어, 다양한 케이스와 가정을 신속하게 검토할 수 있습니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">직관적인 오행 구분</h3>
                  <p className="text-sm text-muted-foreground">
                    명리 초보자도 사주의 기운을 한눈에 파악하도록 오행을 색상으로 명료하게 구분했습니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">토(土)의 실전적 분류</h3>
                  <p className="text-sm text-muted-foreground">
                    지지(地支)의 토(辰, 未, 戌, 丑)를 계절별 특성에 따라 세분화하여, 단순한 육친 분석을 넘어 <strong>오행의 대세(大勢)</strong>를 정밀하게 읽어낼 수 있도록 구현되었습니다.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-semibold text-primary">실전 감정의 정확도를 높이는 정밀 분석 기능</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                지천명 만세력은 20년 전문가가 감정 시 실질적으로 알고 활용해야 편한 방식으로 기능을 구현했습니다.
              </p>
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">다양한 표현 옵션</h3>
                  <p className="text-sm text-muted-foreground">
                    한글과 한자 변환 기능을 제공하여, 학습이나 감정 스타일에 맞춰 자유롭게 선택할 수 있습니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">운로(運路)의 정밀 분석</h3>
                  <div className="space-y-2 text-sm text-muted-foreground mt-2">
                    <p><strong>• 대운 기준:</strong> 원국(原局)과의 합·충·형·파·해 및 주요 신살(神殺) 관계를 명확히 표시합니다.</p>
                    <p><strong>• 세운 기준:</strong> 대운뿐 아니라 <strong>세운(歲運)</strong>을 기준으로 한 원국과 대운의 복잡한 합충형파해 및 각종 신살 관계를 입체적으로 분석하여, 실질적인 운의 흐름을 놓치지 않도록 설계되었습니다.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-semibold text-primary">미래를 위한 준비: 데이터 관리와 확장성</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                지천명 만세력은 당신의 명리 데이터를 안전하게 보관하고 성장을 지원할 계획을 갖고 있습니다.
              </p>
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">구글 클라우드 백업</h3>
                  <p className="text-sm text-muted-foreground">
                    구글 로그인을 통해 사용자의 소중한 감정 자료를 개인 구글 클라우드에 백업하고 관리할 수 있는 기능을 제공합니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">웹-앱 연동 및 AI 학습</h3>
                  <p className="text-sm text-muted-foreground">
                    향후 PC 웹 서비스를 출시하여 앱과 연동할 계획입니다. 또한, 어플리케이션을 통해 그때그때 물어보고 학습할 수 있는 AI 기능 구현을 통해 사용자의 깊이 있는 연구를 지속적으로 지원할 예정입니다.
                  </p>
                </div>
              </div>
            </section>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg">
              <p className="text-base font-medium text-center leading-relaxed">
                지천명 만세력은 20년 실전 전문가의 지혜를 손안에 담은 결과물입니다.<br/>
                이제 복잡함에서 벗어나 정확하고 깊이 있는 통찰에 집중하세요.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
