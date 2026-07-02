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
import { queryClient } from "@/lib/queryClient";
import { localDB } from "@/lib/saju-local-storage";
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

interface CompatibilityRecord {
  id: string;
  leftId: string;
  rightId: string;
  leftName: string;
  rightName: string;
  createdAt: string;
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // 정렬 상태
  type SortType = 'name' | 'createdAt' | 'age';
  type SortOrder = 'asc' | 'desc';
  const [sortType, setSortType] = useState<SortType>('createdAt'); // 기본값: 저장일순
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // 기본값: 내림차순 (최신순)
  
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

  // 사주 / 궁합 탭
  const [activeTab, setActiveTab] = useState<'saju' | 'compat'>('saju');
  const [compatList, setCompatList] = useState<CompatibilityRecord[]>([]);
  const [compatSearch, setCompatSearch] = useState("");
  const [deletingCompatId, setDeletingCompatId] = useState<string | null>(null);
  const [showDeleteCompatDialog, setShowDeleteCompatDialog] = useState(false);

  useEffect(() => {
    const loadCompat = () => {
      try {
        const raw = localStorage.getItem('compatibility-records');
        setCompatList(raw ? JSON.parse(raw) : []);
      } catch {
        setCompatList([]);
      }
    };
    loadCompat();
    window.addEventListener('focus', loadCompat);
    return () => window.removeEventListener('focus', loadCompat);
  }, []);

  const filteredCompatList = useMemo(() => {
    if (!compatSearch.trim()) return compatList;
    const q = compatSearch.trim().toLowerCase();
    return compatList.filter(c =>
      c.leftName.toLowerCase().includes(q) || c.rightName.toLowerCase().includes(q)
    );
  }, [compatList, compatSearch]);

  const handleViewCompat = (record: CompatibilityRecord) => {
    setLocation(`/compatibility?left=${record.leftId}&right=${record.rightId}`);
  };

  const handleDeleteCompat = (id: string) => {
    setDeletingCompatId(id);
    setShowDeleteCompatDialog(true);
  };

  const confirmDeleteCompat = () => {
    if (!deletingCompatId) return;
    const newList = compatList.filter(c => c.id !== deletingCompatId);
    setCompatList(newList);
    localStorage.setItem('compatibility-records', JSON.stringify(newList));
    setShowDeleteCompatDialog(false);
    setDeletingCompatId(null);
    toast({ title: "삭제 완료", description: "궁합 기록이 삭제되었습니다.", duration: 700 });
  };
  
  // 검색 debounce (성능 최적화)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 그룹 목록 조회 (로컬 저장소)
  const { data: groupsList } = useQuery<Group[]>({
    queryKey: ["local-groups"],
    queryFn: async () => {
      return await localDB.getGroups();
    },
  });

  // 저장된 사주 목록 조회 (로컬 저장소)
  const { data: rawSajuList, isLoading, error, refetch } = useQuery<SajuRecord[]>({
    queryKey: ["local-saju-records", debouncedSearchQuery, selectedGroupId],
    queryFn: async () => {
      const searchText = debouncedSearchQuery.trim() || undefined;
      const groupId = selectedGroupId && selectedGroupId !== 'all' ? selectedGroupId : undefined;
      return await localDB.getSajuRecords(undefined, searchText, groupId);
    },
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지 (성능 향상)
  });

  // 사주 목록 정렬
  const sajuList = useMemo(() => {
    const list = [...(rawSajuList || [])];
    
    return list.sort((a, b) => {
      let comparison = 0;
      
      switch (sortType) {
        case 'name':
          // 가나다순
          comparison = (a.name || '').localeCompare(b.name || '', 'ko-KR');
          break;
        case 'createdAt':
          // 저장일순
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'age':
          // 나이순 (birthYear 기준)
          comparison = a.birthYear - b.birthYear;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [rawSajuList, sortType, sortOrder]);

  // 사주 삭제 뮤테이션 (로컬 저장소)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const success = await localDB.deleteSajuRecord(id);
      if (!success) {
        throw new Error("사주 삭제에 실패했습니다.");
      }
      return { success };
    },
    onSuccess: () => {
      // 모든 사주 리스트 쿼리 무효화 (SajuList + Compatibility 페이지)
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records-list"] });
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

  // 다중 삭제 mutation (로컬 저장소)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map(id => localDB.deleteSajuRecord(id));
      const results = await Promise.all(deletePromises);
      const failedCount = results.filter(r => !r).length;
      
      if (failedCount > 0) {
        throw new Error(`${failedCount}개의 삭제에 실패했습니다.`);
      }
      
      return results;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records-list"] });
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
  }, [searchQuery, selectedGroupId]);
  
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
  
  // 그룹 생성 mutation (로컬 저장소)
  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      return await localDB.createGroup(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
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
  
  // 그룹 수정 mutation (로컬 저장소)
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: GroupFormData }) => {
      const result = await localDB.updateGroup(id, data);
      if (!result) {
        throw new Error('그룹 수정에 실패했습니다.');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
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
  
  // 그룹 삭제 mutation (로컬 저장소)
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const success = await localDB.deleteGroup(groupId);
      if (!success) {
        throw new Error('그룹 삭제에 실패했습니다.');
      }
      return { success };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
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

  // 정렬 핸들러 (토글 방식)
  const handleSort = (type: SortType) => {
    if (sortType === type) {
      // 같은 타입 클릭 시 오름차순/내림차순 토글
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 타입 클릭 시 해당 타입으로 변경하고 기본 순서 설정
      setSortType(type);
      if (type === 'createdAt') {
        setSortOrder('desc'); // 저장일순은 최신순이 기본
      } else {
        setSortOrder('asc'); // 가나다순, 나이순은 오름차순이 기본
      }
    }
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

        {/* 사주 / 궁합 탭 */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'saju' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('saju')}
            className="flex-1"
            data-testid="tab-saju"
          >
            사주 ({sajuList?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'compat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('compat')}
            className="flex-1"
            data-testid="tab-compat"
          >
            궁합 ({compatList.length})
          </Button>
        </div>

        {activeTab === 'saju' && (
        <>
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
          
          {/* 정렬 버튼 */}
          <div className="flex gap-2 mt-2">
            <Button
              variant={sortType === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('name')}
              data-testid="button-sort-name"
              className="flex-1"
            >
              가나다순 {sortType === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </Button>
            <Button
              variant={sortType === 'createdAt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('createdAt')}
              data-testid="button-sort-date"
              className="flex-1"
            >
              저장일순 {sortType === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}
            </Button>
            <Button
              variant={sortType === 'age' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('age')}
              data-testid="button-sort-age"
              className="flex-1"
            >
              나이순 {sortType === 'age' && (sortOrder === 'asc' ? '▲' : '▼')}
            </Button>
          </div>
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
                                  <span className="text-xs text-muted-foreground mr-1" data-testid={`text-created-${saju.id}`}>
                                    {saju.createdAt ? new Date(saju.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : ''}
                                  </span>
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
                            
                            {/* 두 번째 줄: 양력생일, 음력생일, 생시, 그룹 */}
                            <div className="text-xs flex items-center justify-between" data-testid={`text-birth-${saju.id}`}>
                              <span>
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
                              </span>
                              {groupName && (
                                <span className="text-muted-foreground whitespace-nowrap ml-2">
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
              </div>
              </>
            )}
          </>
        )}
        </>
        )}

        {activeTab === 'compat' && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="이름으로 검색..."
                value={compatSearch}
                onChange={(e) => setCompatSearch(e.target.value)}
                className="pl-9"
                data-testid="input-compat-search"
              />
            </div>

            {filteredCompatList.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">저장된 궁합이 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    궁합 페이지에서 두 사주를 선택하고 저장해보세요.
                  </p>
                  <Button onClick={() => setLocation("/compatibility")}>
                    궁합 보러가기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredCompatList.map((record) => {
                  const leftSaju = sajuList.find(s => s.id === record.leftId);
                  const rightSaju = sajuList.find(s => s.id === record.rightId);
                  return (
                    <Card
                      key={record.id}
                      className="p-3 cursor-pointer hover-elevate"
                      onClick={() => handleViewCompat(record)}
                      data-testid={`compat-item-${record.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span>{record.leftName || '이름없음'}</span>
                          <span className="text-muted-foreground">♥</span>
                          <span>{record.rightName || '이름없음'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCompat(record.id); }}
                            data-testid={`button-delete-compat-${record.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>
                          {leftSaju ? `${leftSaju.birthYear}.${leftSaju.birthMonth}.${leftSaju.birthDay}` : ''}
                          {leftSaju && rightSaju ? '  /  ' : ''}
                          {rightSaju ? `${rightSaju.birthYear}.${rightSaju.birthMonth}.${rightSaju.birthDay}` : ''}
                        </span>
                        <span>
                          {new Date(record.createdAt).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
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

        {/* 궁합 삭제 확인 대화상자 */}
        <AlertDialog open={showDeleteCompatDialog} onOpenChange={setShowDeleteCompatDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>궁합 삭제</AlertDialogTitle>
              <AlertDialogDescription>이 궁합 기록을 정말 삭제하시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCompat} className="bg-destructive hover:bg-destructive/90">
                삭제
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