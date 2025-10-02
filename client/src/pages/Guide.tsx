import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
            <CardTitle className="text-2xl font-bold text-center">만세력 소개 및 사용법</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">만세력이란?</h2>
              <p className="text-muted-foreground leading-relaxed">
                만세력(萬歲曆)은 한국 전통 역술에서 사용하는 달력으로, 양력과 음력을 함께 표시하며 
                천간(天干)과 지지(地支)의 조합인 60갑자를 기준으로 년, 월, 일, 시를 표현합니다. 
                사주팔자 분석의 기본이 되는 중요한 도구입니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">주요 기능</h2>
              <div className="space-y-3">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">1. 사주명식 조회</h3>
                  <p className="text-sm text-muted-foreground">
                    생년월일시를 입력하면 천간, 지지, 육친, 오행 등 상세한 사주 정보를 확인할 수 있습니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">2. 대운(大運) 분석</h3>
                  <p className="text-sm text-muted-foreground">
                    10년 주기로 변화하는 대운을 확인하고, 현재 나이의 대운을 강조 표시합니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">3. 세운(歲運) 및 월운(月運)</h3>
                  <p className="text-sm text-muted-foreground">
                    매년, 매월의 운세 흐름을 천간과 지지로 확인할 수 있습니다.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">4. 신살(神殺) 분석</h3>
                  <p className="text-sm text-muted-foreground">
                    천덕귀인, 월덕귀인, 12신살 등 다양한 신살 정보를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">사용 방법</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">만세력 메뉴 선택</h3>
                    <p className="text-sm text-muted-foreground">
                      홈 화면에서 '만세력' 메뉴를 선택합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">생년월일시 입력</h3>
                    <p className="text-sm text-muted-foreground">
                      이름, 성별, 생년월일(양력/음력), 생시를 입력합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">사주명식 확인</h3>
                    <p className="text-sm text-muted-foreground">
                      계산된 사주팔자와 대운, 세운, 월운 정보를 확인합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">저장 및 관리</h3>
                    <p className="text-sm text-muted-foreground">
                      '저장' 버튼을 눌러 사주 정보를 저장하고, '사주불러오기' 메뉴에서 언제든지 다시 확인할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">화면 설명</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>• 사주원국:</strong> 년월일시의 천간과 지지로 구성된 기본 사주</p>
                <p><strong>• 육친:</strong> 천간과 지지의 상호 관계 (비견, 겁재, 식신, 상관 등)</p>
                <p><strong>• 오행:</strong> 목(木), 화(火), 토(土), 금(金), 수(水)의 다섯 가지 기운</p>
                <p><strong>• 지장간:</strong> 지지 속에 숨어있는 천간</p>
                <p><strong>• 대운:</strong> 10년 주기로 변화하는 인생의 큰 흐름</p>
                <p><strong>• 세운:</strong> 매년 변화하는 운세</p>
                <p><strong>• 월운:</strong> 매월 변화하는 운세</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">팁</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 생시를 정확히 모르는 경우, 낮 12시(午時)를 기준으로 입력하시면 됩니다.</p>
                <p>• 한자/한글 토글 버튼으로 편한 방식을 선택할 수 있습니다.</p>
                <p>• 대운과 세운을 클릭하면 해당 시기의 운세를 강조 표시합니다.</p>
                <p>• 3행 3열(일지)을 클릭하면 생년월일을 변경할 수 있습니다.</p>
                <p>• 시지(첫 번째 칸)를 클릭하면 생시를 변경할 수 있습니다.</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
