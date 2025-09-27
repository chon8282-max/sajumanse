import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { 
  ArrowLeft, 
  Trash2, 
  User, 
  Calendar, 
  Clock,
  RefreshCw,
  Search,
  Plus,
  Edit
} from "lucide-react";
import type { SajuRecord, Group } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export default function SajuList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // 검색 debounce (성능 최적화)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 그룹 목록 조회
  const { data: groupsList } = useQuery<ApiResponse<Group[]>, Error, Group[]>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/groups');
      
      // 에러 상태 처리
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 요청에 실패했습니다.`);
      }
      
      const responseJson = await response.json();
      if (!responseJson.success) {
        throw new Error(responseJson.error || '그룹 목록 조회에 실패했습니다.');
      }
      
      return responseJson;
    },
    select: (response: ApiResponse<Group[]>) => response?.data || [],
  });

  // 저장된 사주 목록 조회 (서버 사이드 검색)
  const { data: sajuList, isLoading, error, refetch } = useQuery<ApiResponse<SajuRecord[]>, Error, SajuRecord[]>({
    queryKey: ["/api/saju-records", debouncedSearchQuery, selectedGroupId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchQuery.trim()) {
        params.set('search', debouncedSearchQuery.trim());
      }
      if (selectedGroupId && selectedGroupId !== 'all') {
        params.set('groupId', selectedGroupId);
      }
      const url = `/api/saju-records${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiRequest('GET', url);
      
      // 에러 상태 처리
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 요청에 실패했습니다.`);
      }
      
      const responseJson = await response.json();
      if (!responseJson.success) {
        throw new Error(responseJson.error || '사주 목록 조회에 실패했습니다.');
      }
      
      return responseJson;
    },
    select: (response: ApiResponse<SajuRecord[]>) => response?.data || [],
  });

  // 사주 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/saju-records/${id}`);
      const response = await res.json();
      if (!response.success) {
        throw new Error(response.error || "사주 삭제에 실패했습니다.");
      }
      return response;
    },
    onSuccess: () => {
      // 필터링된 뷰도 동기화되도록 정확한 queryKey로 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records", debouncedSearchQuery, selectedGroupId] });
      toast({
        title: "삭제 완료",
        description: "사주가 성공적으로 삭제되었습니다.",
        duration: 800
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "삭제 오류",
        description: "사주 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    setLocation("/");
  };

  const handleViewSaju = (id: string) => {
    setLocation(`/saju-result/${id}`);
  };

  const handleDeleteSaju = (id: string, name: string) => {
    if (confirm(`"${name}" 사주를 정말 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditSaju = (saju: SajuRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({
      edit: 'true',
      id: saju.id,
      name: saju.name || '',
      calendarType: saju.calendarType,
      year: saju.birthYear.toString(),
      month: saju.birthMonth.toString(),
      day: saju.birthDay.toString(),
      birthTime: saju.birthTime || '',
      gender: saju.gender,
      groupId: saju.groupId || '',
      memo: saju.memo || ''
    });
    setLocation(`/saju-input?${params.toString()}`);
  };

  const calculateAge = (birthYear: number) => {
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear + 1; // 한국 나이
  };

  // 서버 사이드 검색으로 변경하여 filteredSajuList 제거
  // sajuList가 이미 필터링된 결과이므로 더 이상 필터링 불필요

  // 조건부 렌더링을 JSX에서 처리하여 hook 규칙 준수

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">저장된 사주</h1>
          <Button 
            size="sm"
            onClick={() => setLocation("/saju-input")}
            data-testid="button-add-saju"
          >
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </div>
        
        {/* 검색 바 및 그룹 필터 */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="이름 또는 생년월일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          
          {/* 그룹 선택 */}
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId} data-testid="select-group">
            <SelectTrigger>
              <SelectValue placeholder="모든 그룹" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 그룹</SelectItem>
              {groupsList?.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <Card>
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4" data-testid="text-error-message">
                사주 목록을 불러오는데 실패했습니다.
              </p>
              <Button 
                onClick={() => refetch()}
                data-testid="button-retry"
              >
                다시 시도
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 데이터 상태 */}
        {!isLoading && !error && (
          <>
            {!sajuList || sajuList.length === 0 ? (
              searchQuery.trim() ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2" data-testid="text-no-results-title">검색 결과가 없습니다</h3>
                    <p className="text-sm text-muted-foreground mb-4" data-testid="text-no-results-description">
                      '{searchQuery}' 에 해당하는 사주를 찾을 수 없습니다.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      data-testid="button-clear-search"
                    >
                      전체 목록 보기
                    </Button>
                  </CardContent>
                </Card>
              ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2" data-testid="text-empty-title">저장된 사주가 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4" data-testid="text-empty-description">
                    만세력에서 사주를 계산하고 저장해보세요.
                  </p>
                  <Button 
                    onClick={() => setLocation("/manseryeok")}
                    data-testid="button-create-saju"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    사주 만들기
                  </Button>
                </CardContent>
              </Card>
              )
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead className="hidden sm:table-cell">생년월일</TableHead>
                      <TableHead className="hidden md:table-cell">출생시간</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sajuList.map((saju) => (
                      <TableRow 
                        key={saju.id} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleViewSaju(saju.id)}
                        data-testid={`saju-item-${saju.id}`}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium" data-testid={`text-name-${saju.id}`}>
                                {saju.name || "이름없음"}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full" data-testid={`text-gender-age-${saju.id}`}>
                                {saju.gender} {calculateAge(saju.birthYear)}세
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground sm:hidden" data-testid={`text-birth-mobile-${saju.id}`}>
                              {saju.birthYear}.{saju.birthMonth}.{saju.birthDay} {saju.birthTime && `(${saju.birthTime})`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="space-y-1">
                            <div className="text-sm" data-testid={`text-birth-${saju.id}`}>
                              양력 {saju.birthYear}년 {saju.birthMonth}월 {saju.birthDay}일
                            </div>
                            {saju.lunarYear && saju.lunarMonth && saju.lunarDay && (
                              <div className="text-xs text-muted-foreground">
                                음력 {saju.lunarYear}년 {saju.lunarMonth}월 {saju.lunarDay}일
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell" data-testid={`text-time-${saju.id}`}>
                          {saju.birthTime || "시간 미설정"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary h-8 w-8"
                              onClick={(e) => handleEditSaju(saju, e)}
                              data-testid={`button-edit-${saju.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSaju(saju.id, saju.name || "이름없음");
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${saju.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* 하단 여백 (네비게이션 공간) */}
        <div className="h-20" />
      </div>
    </div>
  );
}