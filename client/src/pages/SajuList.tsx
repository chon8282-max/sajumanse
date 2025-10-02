import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, 
  Trash2, 
  User, 
  Calendar, 
  Clock,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Settings,
  FolderPlus
} from "lucide-react";
import type { SajuRecord, Group } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 그룹 form schema
const groupFormSchema = z.object({
  name: z.string().min(1, "그룹 이름을 입력해주세요").max(50, "그룹 이름은 50자 이하로 입력해주세요")
});
type GroupFormData = z.infer<typeof groupFormSchema>;

export default function SajuList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // 페이지네이션 상태 (성능 최적화)
  const [page, setPage] = useState(1);
  const pageSize = 20; // 한 번에 20개씩 로드
  
  // 그룹 관리 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  
  // 사주 삭제 대화상자 상태
  const [showDeleteSajuDialog, setShowDeleteSajuDialog] = useState(false);
  const [deletingSaju, setDeletingSaju] = useState<{ id: string; name: string } | null>(null);
  
  // 다중 선택 상태
  const [selectedSajuIds, setSelectedSajuIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // 검색 debounce (성능 최적화)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 검색/필터 변경 시 페이지 리셋
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, selectedGroupId]);

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

  // 저장된 사주 목록 조회 (페이지네이션 + 서버 사이드 검색)
  const { data: sajuResponse, isLoading, error, refetch } = useQuery<ApiResponse<SajuRecord[]>>({
    queryKey: ["/api/saju-records", debouncedSearchQuery, selectedGroupId, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', (page * pageSize).toString()); // 누적 로딩
      if (debouncedSearchQuery.trim()) {
        params.set('search', debouncedSearchQuery.trim());
      }
      if (selectedGroupId && selectedGroupId !== 'all') {
        params.set('groupId', selectedGroupId);
      }
      const url = `/api/saju-records?${params.toString()}`;
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
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지 (성능 향상)
  });

  // 사주 목록과 더 보기 가능 여부 계산  
  const sajuList = sajuResponse?.data || [];
  const hasMore = sajuList.length > (page - 1) * pageSize && sajuList.length === page * pageSize;

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
      // 모든 사주 리스트 쿼리 무효화 (페이지, 검색, 필터 상관없이)
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records"] });
      toast({
        title: "삭제 완료",
        description: "사주가 성공적으로 삭제되었습니다.",
        duration: 700
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "삭제 오류",
        description: "사주 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 700
      });
    }
  });

  // 다중 삭제 mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map(id => 
        apiRequest("DELETE", `/api/saju-records/${id}`).then(res => res.json())
      );
      const results = await Promise.all(deletePromises);
      const failedCount = results.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        throw new Error(`${failedCount}개의 삭제에 실패했습니다.`);
      }
      
      return results;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records"] });
      setSelectedSajuIds([]);
      toast({
        title: "삭제 완료",
        description: `${ids.length}개의 사주가 성공적으로 삭제되었습니다.`,
        duration: 700
      });
    },
    onError: (error) => {
      console.error('Bulk delete error:', error);
      toast({
        title: "삭제 오류",
        description: error instanceof Error ? error.message : "다중 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
        duration: 700
      });
    }
  });
  
  // 검색/필터 변경 시 선택 초기화 (숨겨진 선택 항목 방지)
  useEffect(() => {
    setSelectedSajuIds([]);
  }, [searchQuery, selectedGroupId, page]);
  
  // Form 초기화
  const groupForm = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: ""
    }
  });
  
  // 편집 모드일 때 form 값 설정
  useEffect(() => {
    if (editingGroup) {
      groupForm.reset({ name: editingGroup.name });
    } else {
      groupForm.reset({ name: "" });
    }
  }, [editingGroup, groupForm]);
  
  // 그룹 생성 mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const response = await apiRequest('POST', '/api/groups', data);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 요청에 실패했습니다.`);
      }
      
      const responseJson = await response.json();
      if (!responseJson.success) {
        throw new Error(responseJson.error || '그룹 생성에 실패했습니다.');
      }
      
      return responseJson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowGroupModal(false);
      groupForm.reset();
      toast({
        title: "생성 완료",
        description: "그룹이 성공적으로 생성되었습니다.",
        duration: 700
      });
    },
    onError: (error: Error) => {
      toast({
        title: "생성 실패", 
        description: error.message,
        variant: "destructive",
        duration: 700
      });
    }
  });
  
  // 그룹 수정 mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: GroupFormData }) => {
      const response = await apiRequest('PUT', `/api/groups/${id}`, data);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 요청에 실패했습니다.`);
      }
      
      const responseJson = await response.json();
      if (!responseJson.success) {
        throw new Error(responseJson.error || '그룹 수정에 실패했습니다.');
      }
      
      return responseJson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records", debouncedSearchQuery, selectedGroupId] });
      setShowGroupModal(false);
      setEditingGroup(null);
      groupForm.reset();
      toast({
        title: "수정 완료",
        description: "그룹이 성공적으로 수정되었습니다.",
        duration: 700
      });
    },
    onError: (error: Error) => {
      toast({
        title: "수정 실패",
        description: error.message,
        variant: "destructive",
        duration: 700
      });
    }
  });
  
  // 그룹 삭제 mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest('DELETE', `/api/groups/${groupId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 요청에 실패했습니다.`);
      }
      
      const responseJson = await response.json();
      if (!responseJson.success) {
        throw new Error(responseJson.error || '그룹 삭제에 실패했습니다.');
      }
      
      return responseJson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saju-records", debouncedSearchQuery, selectedGroupId] });
      setShowDeleteGroupDialog(false);
      setDeletingGroupId(null);
      // 삭제된 그룹이 현재 선택된 그룹이면 전체로 변경
      if (selectedGroupId === deletingGroupId) {
        setSelectedGroupId("");
      }
      toast({
        title: "삭제 완료",
        description: "그룹이 성공적으로 삭제되었습니다.",
        duration: 700
      });
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
        duration: 700
      });
    }
  });
  
  // 그룹 생성/수정 핸들러
  const handleGroupSubmit = async (data: GroupFormData) => {
    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };
  
  // 그룹 삭제 핸들러
  const handleDeleteGroup = (groupId: string) => {
    setDeletingGroupId(groupId);
    setShowDeleteGroupDialog(true);
  };
  
  // 그룹 수정 핸들러
  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowGroupModal(true);
  };

  const handleBack = () => {
    setLocation("/");
  };

  const handleViewSaju = (id: string) => {
    setLocation(`/saju-result/${id}`);
  };

  const handleDeleteSaju = (id: string, name: string) => {
    setDeletingSaju({ id, name });
    setShowDeleteSajuDialog(true);
  };
  
  const confirmDeleteSaju = () => {
    if (deletingSaju) {
      deleteMutation.mutate(deletingSaju.id);
      setShowDeleteSajuDialog(false);
      setDeletingSaju(null);
    }
  };

  const handleEditSaju = (saju: SajuRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 모든 사주를 사주입력 페이지로 이동
    const params = new URLSearchParams({
      edit: 'true',
      id: saju.id,
      name: saju.name || '',
      calendarType: saju.calendarType,
      year: saju.birthYear.toString(),
      month: saju.birthMonth?.toString() || '',
      day: saju.birthDay?.toString() || '',
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

  // 다중 선택 관련 핸들러
  const toggleSelectSaju = (id: string) => {
    setSelectedSajuIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSajuIds.length === sajuList.length) {
      setSelectedSajuIds([]);
    } else {
      setSelectedSajuIds(sajuList.map(s => s.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedSajuIds.length > 0) {
      setShowBulkDeleteDialog(true);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedSajuIds);
    setShowBulkDeleteDialog(false);
  };

  // 서버 사이드 검색으로 변경하여 filteredSajuList 제거
  // sajuList가 이미 필터링된 결과이므로 더 이상 필터링 불필요

  // 조건부 렌더링을 JSX에서 처리하여 hook 규칙 준수

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="relative flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBack}
            data-testid="button-back"
            className="absolute left-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <div className="w-full text-center">
            <h1 className="text-lg font-semibold" data-testid="text-page-title">저장된 사주</h1>
          </div>
          <Button 
            size="sm"
            onClick={() => setLocation("/saju-input")}
            data-testid="button-add-saju"
            className="absolute right-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </div>
        
        {/* 검색 바 및 그룹 필터 - 한 줄 배치 */}
        <div className="mb-6">
          <div className="flex gap-2 items-center">
            {/* 검색창 */}
            <div className="relative flex-1">
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
              <SelectTrigger className="w-32">
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
            
            {/* 그룹 추가 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingGroup(null);
                setShowGroupModal(true);
              }}
              data-testid="button-create-group"
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 선택된 그룹 관리 버튼들 */}
          {selectedGroupId && selectedGroupId !== "all" && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedGroup = groupsList?.find(g => g.id === selectedGroupId);
                  if (selectedGroup) {
                    handleEditGroup(selectedGroup);
                  }
                }}
                data-testid="button-edit-selected-group"
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                선택된 그룹 수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedGroupId) {
                    handleDeleteGroup(selectedGroupId);
                  }
                }}
                data-testid="button-delete-selected-group"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
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
              <>
                {/* 다중 선택 컨트롤 */}
                {sajuList.length > 0 && (
                  <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedSajuIds.length === sajuList.length && sajuList.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedSajuIds.length > 0 ? `${selectedSajuIds.length}개 선택됨` : '전체 선택'}
                      </span>
                    </div>
                    {selectedSajuIds.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleteMutation.isPending}
                        data-testid="button-bulk-delete"
                        className="h-7"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        선택 삭제
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableBody>
                      {sajuList.map((saju) => {
                        const groupName = groupsList?.find(g => g.id === saju.groupId)?.name;
                        const isSelected = selectedSajuIds.includes(saju.id);
                        return (
                          <TableRow 
                            key={saju.id}
                            className="cursor-pointer hover-elevate border-b last:border-b-0"
                            onClick={() => handleViewSaju(saju.id)}
                            data-testid={`saju-item-${saju.id}`}
                          >
                            <TableCell className="py-2 px-3">
                              {/* 첫 번째 줄: 체크박스, 이름, 나이, 수정/삭제 버튼 */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleSelectSaju(saju.id)}
                                      data-testid={`checkbox-${saju.id}`}
                                    />
                                  </div>
                                  <span className="font-medium text-sm" data-testid={`text-name-${saju.id}`}>
                                    {saju.name || "이름없음"}
                                  </span>
                                  <span className="text-xs text-muted-foreground" data-testid={`text-age-${saju.id}`}>
                                    {calculateAge(saju.birthYear)}세
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-primary h-6 w-6"
                                    onClick={(e) => handleEditSaju(saju, e)}
                                    data-testid={`button-edit-${saju.id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive h-6 w-6"
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
                              </div>
                            
                            {/* 두 번째 줄: 양력생일, 음력생일, 생시 */}
                            <div className="text-xs mb-1" data-testid={`text-birth-${saju.id}`}>
                              양력 {saju.birthYear}.{saju.birthMonth}.{saju.birthDay}
                              {saju.lunarYear && saju.lunarMonth && saju.lunarDay && (
                                <span className="ml-2 text-muted-foreground">
                                  음력 {saju.lunarYear}.{saju.lunarMonth}.{saju.lunarDay}
                                </span>
                              )}
                              {saju.birthTime && (
                                <span className="ml-2 text-muted-foreground">
                                  {saju.birthTime}
                                </span>
                              )}
                            </div>
                            
                            {/* 세 번째 줄: 저장일, 소속그룹 */}
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span data-testid={`text-created-${saju.id}`}>
                                {saju.createdAt ? new Date(saju.createdAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'numeric', 
                                  day: 'numeric'
                                }) : '날짜 미상'}
                              </span>
                              {groupName && (
                                <span data-testid={`text-group-${saju.id}`}>
                                  [{groupName}]
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* 더 보기 버튼 (성능 최적화) */}
                {hasMore && !isLoading && (
                  <div className="flex justify-center p-4">
                    <Button
                      variant="outline"
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={isLoading}
                      data-testid="button-load-more"
                    >
                      더 보기 ({sajuList.length}개 표시됨)
                    </Button>
                  </div>
                )}
              </div>
              </>
            )}
          </>
        )}
        
        {/* 그룹 생성/수정 모달 */}
        <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle data-testid="text-group-modal-title">
                {editingGroup ? "그룹 수정" : "그룹 생성"}
              </DialogTitle>
              <DialogDescription>
                {editingGroup ? "그룹 이름을 수정해주세요." : "새로운 그룹을 만들어보세요."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...groupForm}>
              <form onSubmit={groupForm.handleSubmit(handleGroupSubmit)} className="space-y-4">
                <FormField
                  control={groupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>그룹 이름</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="그룹 이름을 입력해주세요"
                          {...field}
                          data-testid="input-group-name"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowGroupModal(false);
                      setEditingGroup(null);
                      groupForm.reset();
                    }}
                    data-testid="button-group-cancel"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                    data-testid="button-group-submit"
                  >
                    {createGroupMutation.isPending || updateGroupMutation.isPending ? (
                      <>새로고침...</>
                    ) : (
                      editingGroup ? "수정" : "생성"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* 그룹 삭제 확인 대화상자 */}
        <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-delete-group-title">그룹 삭제</AlertDialogTitle>
              <AlertDialogDescription data-testid="text-delete-group-description">
                정말로 이 그룹을 삭제하시겠습니까?
                <br />
                <span className="text-destructive font-medium">삭제된 그룹은 복구할 수 없습니다.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-delete-group-cancel">취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingGroupId) {
                    deleteGroupMutation.mutate(deletingGroupId);
                  }
                }}
                disabled={deleteGroupMutation.isPending}
                data-testid="button-delete-group-confirm"
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteGroupMutation.isPending ? "삭제 중..." : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* 사주 삭제 확인 대화상자 */}
        <AlertDialog open={showDeleteSajuDialog} onOpenChange={setShowDeleteSajuDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-delete-saju-title">사주 삭제</AlertDialogTitle>
              <AlertDialogDescription data-testid="text-delete-saju-description">
                "{deletingSaju?.name}" 사주를 정말 삭제하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-delete-saju-cancel">취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSaju}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-saju-confirm"
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 다중 삭제 확인 대화상자 */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle data-testid="text-bulk-delete-title">다중 삭제</AlertDialogTitle>
              <AlertDialogDescription data-testid="text-bulk-delete-description">
                선택한 {selectedSajuIds.length}개의 사주를 정말 삭제하시겠습니까?
                <br />
                <span className="text-destructive font-medium">삭제된 사주는 복구할 수 없습니다.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-bulk-delete-cancel">취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete-confirm"
                className="bg-destructive hover:bg-destructive/90"
              >
                {bulkDeleteMutation.isPending ? "삭제 중..." : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 하단 여백 (네비게이션 공간) */}
        <div className="h-20" />
      </div>
    </div>
  );
}