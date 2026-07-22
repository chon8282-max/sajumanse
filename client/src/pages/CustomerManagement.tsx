import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { ArrowLeft, Users, Search, Phone } from "lucide-react";
import { localDB } from "@/lib/saju-local-storage";
import type { SajuRecord } from "@shared/schema";

// 고객 추가정보 로드 (전화번호 표시용)
const CUSTOMER_KEY = "customer-info-records";
function loadCustomerMap(): Record<string, any> {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function CustomerManagement() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const customerMap = useMemo(() => loadCustomerMap(), []);

  const { data: sajuList, isLoading } = useQuery<SajuRecord[]>({
    queryKey: ["local-saju-records"],
    queryFn: async () => await localDB.getSajuRecords(),
    staleTime: 1000 * 60 * 5,
  });

  const filteredList = useMemo(() => {
    const list = sajuList || [];
    const q = searchQuery.trim().toLowerCase();
    // 검색어가 없으면 최근 100개만 화면에 표시 (5천 개 전체 렌더링 방지)
    if (!q) return list.slice(0, 100);
    const qDigits = q.replace(/\D/g, "");
    return list.filter((s) => {
      const info = customerMap[s.id] || {};
      const phone = (info.phone || "").replace(/\D/g, "");
      return (
        (s.name || "").toLowerCase().includes(q) ||
        (qDigits && phone.includes(qDigits))
      );
    });
  }, [sajuList, searchQuery, customerMap]);

  const calculateAge = (birthYear: number) =>
    new Date().getFullYear() - birthYear + 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="relative flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="absolute left-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <div className="w-full text-center">
            <h1 className="text-lg font-semibold">고객관리</h1>
          </div>
        </div>

        {/* 검색 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="이름 또는 전화번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-10">
            불러오는 중...
          </p>
        )}

        {!isLoading && filteredList.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다." : "저장된 고객(사주)이 없습니다."}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredList.length > 0 && (
          <div className="border rounded-md overflow-hidden bg-white">
            {filteredList.map((saju) => {
              const info = customerMap[saju.id] || {};
              return (
                <div
                  key={saju.id}
                  onClick={() => setLocation(`/customer/${saju.id}`)}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50"
                  data-testid={`customer-item-${saju.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {saju.name || "이름없음"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {calculateAge(saju.birthYear)}세
                      </span>
                      {saju.gender && (
                        <span className="text-xs text-muted-foreground">
                          {saju.gender}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      양력 {saju.birthYear}.{saju.birthMonth}.{saju.birthDay}
                      {saju.birthTime ? ` ${saju.birthTime}` : ""}
                    </div>
                  </div>
                  {info.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {info.phone}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-20" />
      </div>
    </div>
  );
}