import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { useMembership } from "@/contexts/MembershipContext";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Trash2, User, RefreshCw, Search, Plus, Edit, FolderPlus, Heart } from "lucide-react";
import type { SajuRecord, Group } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const groupFormSchema = z.object({
  name: z.string().min(1, "그룹 이름을 입력해주세요").max(50, "그룹 이름은 50자 이하로 입력해주세요")
});
type GroupFormData = z.infer<typeof groupFormSchema>;

// 목록 → 명식 → 뒤로 했을 때 검색 상태를 되살리기 위한 자리.
// (예전에는 명식에서 뒤로 누르면 검색이 다 날아가고 신규 입력 화면으로 나가버렸다)
const LIST_STATE_KEY = "sajuListSearchState";  // 검색어·그룹·정렬·스크롤 위치
const RESULT_FROM_KEY = "sajuResultFrom";      // 명식을 어디서 열었는지
const LIST_RESTORE_KEY = "sajuListRestore";    // 이번 진입이 "뒤로 돌아온 것"인지

interface ListSnapshot {
  activeTab?: 'personal' | 'compatibility';
  searchQuery?: string;
  debouncedSearchQuery?: string;
  selectedGroupId?: string;
  sortType?: 'name' | 'createdAt' | 'age';
  sortOrder?: 'asc' | 'desc';
  scrollY?: number;
}

/**
 * 명식에서 되돌아온 진입이면 직전 검색 상태를 돌려준다. 새로 들어온 것이면 null.
 * 표식은 한 번 쓰고 지운다 — 다음에 목록으로 새로 들어오면 깨끗한 목록이 나와야 한다.
 */
function readListRestore(): ListSnapshot | null {
  try {
    const cameBack =
      sessionStorage.getItem(LIST_RESTORE_KEY) === "1" ||          // 명식의 "뒤로" 버튼
      sessionStorage.getItem(RESULT_FROM_KEY) === "/saju-list";    // 휴대폰 뒤로가기
    sessionStorage.removeItem(LIST_RESTORE_KEY);
    sessionStorage.removeItem(RESULT_FROM_KEY);
    if (!cameBack) return null;
    return JSON.parse(sessionStorage.getItem(LIST_STATE_KEY) || "null");
  } catch {
    return null; // 저장소를 못 써도 목록은 열려야 한다
  }
}

export default function SajuList() {
  const [, setLocation] = useLocation();
  const { syncNow } = useMembership();
  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try { await syncNow(); } finally { setIsSyncing(false); }
  };
  const { toast } = useToast();
  // 명식에서 뒤로 돌아온 것이면 직전 검색 상태를 처음 값으로 그대로 쓴다.
  const [restored] = useState<ListSnapshot | null>(() => readListRestore());
  const [activeTab, setActiveTab] = useState<'personal' | 'compatibility'>(restored?.activeTab ?? 'personal');
  const [searchQuery, setSearchQuery] = useState<string>(restored?.searchQuery ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState<string>(restored?.selectedGroupId ?? "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(restored?.debouncedSearchQuery ?? "");
  type SortType = 'name' | 'createdAt' | 'age';
  type SortOrder = 'asc' | 'desc';
  const [sortType, setSortType] = useState<SortType>(restored?.sortType ?? 'createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>(restored?.sortOrder ?? 'desc');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [showDeleteSajuDialog, setShowDeleteSajuDialog] = useState(false);
  const [deletingSaju, setDeletingSaju] = useState<{ id: string; name: string } | null>(null);
  const [selectedSajuIds, setSelectedSajuIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showDeleteCompatDialog, setShowDeleteCompatDialog] = useState(false);
  const [deletingCompatId, setDeletingCompatId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 되돌아온 경우: 보던 위치로 옮겨준다 (목록이 그려진 다음에 옮겨야 제자리로 간다)
  useEffect(() => {
    const y = restored?.scrollY;
    if (typeof y !== "number") return;
    const t = setTimeout(() => window.scrollTo(0, y), 150);
    return () => clearTimeout(t);
  }, []);

  const { data: groupsList } = useQuery<Group[]>({
    queryKey: ["local-groups"],
    queryFn: async () => await localDB.getGroups(),
  });

  const { data: rawSajuList, isLoading, error, refetch } = useQuery<SajuRecord[]>({
    queryKey: ["local-saju-records", debouncedSearchQuery, selectedGroupId],
    queryFn: async () => {
      const searchText = debouncedSearchQuery.trim() || undefined;
      const groupId = selectedGroupId && selectedGroupId !== 'all' ? selectedGroupId : undefined;
      return await localDB.getSajuRecords(undefined, searchText, groupId);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: compatibilityList, isLoading: isCompatLoading } = useQuery({
    queryKey: ["local-compatibility-records"],
    queryFn: async () => await localDB.getCompatibilityRecords(),
    enabled: activeTab === 'compatibility'
  });

  const sajuList = useMemo(() => {
    const list = [...(rawSajuList || [])];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortType) {
        case 'name': comparison = (a.name || '').localeCompare(b.name || '', 'ko-KR'); break;
        case 'createdAt': comparison = (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0); break;
        case 'age': comparison = a.birthYear - b.birthYear; break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [rawSajuList, sortType, sortOrder]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const success = await localDB.deleteSajuRecord(id);
      if (!success) throw new Error("사주 삭제에 실패했습니다.");
      return { success };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records-list"] });
      toast({ title: "삭제 완료", description: "사주가 성공적으로 삭제되었습니다.", duration: 700 });
    }
  });

  const deleteCompatMutation = useMutation({
    mutationFn: async (id: string) => await localDB.deleteCompatibilityRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-compatibility-records"] });
      toast({ title: "삭제 완료", description: "궁합 기록이 삭제되었습니다.", duration: 700 });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map(id => localDB.deleteSajuRecord(id)));
      const failedCount = results.filter(r => !r).length;
      if (failedCount > 0) throw new Error(`${failedCount}개의 삭제에 실패했습니다.`);
      return results;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records-list"] });
      setSelectedSajuIds([]);
      toast({ title: "삭제 완료", description: `${ids.length}개의 사주가 성공적으로 삭제되었습니다.`, duration: 700 });
    }
  });

  useEffect(() => { setSelectedSajuIds([]); }, [searchQuery, selectedGroupId]);

  const groupForm = useForm<GroupFormData>({ resolver: zodResolver(groupFormSchema), defaultValues: { name: "" } });
  useEffect(() => { groupForm.reset({ name: editingGroup ? editingGroup.name : "" }); }, [editingGroup, groupForm]);

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => await localDB.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
      setShowGroupModal(false); groupForm.reset();
      toast({ title: "생성 완료", description: "그룹이 성공적으로 생성되었습니다.", duration: 700 });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: GroupFormData }) => {
      const result = await localDB.updateGroup(id, data);
      if (!result) throw new Error('그룹 수정에 실패했습니다.');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      setShowGroupModal(false); setEditingGroup(null); groupForm.reset();
      toast({ title: "수정 완료", description: "그룹이 성공적으로 수정되었습니다.", duration: 700 });
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const success = await localDB.deleteGroup(groupId);
      if (!success) throw new Error('그룹 삭제에 실패했습니다.');
      return { success };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-groups"] });
      queryClient.invalidateQueries({ queryKey: ["local-saju-records"] });
      setShowDeleteGroupDialog(false); setDeletingGroupId(null);
      if (selectedGroupId === deletingGroupId) setSelectedGroupId("");
      toast({ title: "삭제 완료", description: "그룹이 성공적으로 삭제되었습니다.", duration: 700 });
    }
  });

  const handleGroupSubmit = async (data: GroupFormData) => {
    if (editingGroup) updateGroupMutation.mutate({ id: editingGroup.id, data });
    else createGroupMutation.mutate(data);
  };

  const handleDeleteGroup = (groupId: string) => { setDeletingGroupId(groupId); setShowDeleteGroupDialog(true); };
  const handleEditGroup = (group: Group) => { setEditingGroup(group); setShowGroupModal(true); };
  const handleBack = () => { setLocation("/"); };
  // 명식을 열기 전에 지금 검색 상태를 적어둔다.
  // 명식에서 "뒤로"를 누르면 이 자리로 그대로 돌아온다(검색어·그룹·정렬·보던 위치까지).
  const handleViewSaju = (id: string) => {
    try {
      sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({
        activeTab, searchQuery, debouncedSearchQuery, selectedGroupId,
        sortType, sortOrder, scrollY: window.scrollY,
      }));
      sessionStorage.setItem(RESULT_FROM_KEY, "/saju-list");
    } catch { /* 저장이 안 돼도 명식 보기는 되어야 한다 */ }
    setLocation(`/saju-result/${id}`);
  };
  const handleDeleteSaju = (id: string, name: string) => { setDeletingSaju({ id, name }); setShowDeleteSajuDialog(true); };
  const confirmDeleteSaju = () => { if (deletingSaju) { deleteMutation.mutate(deletingSaju.id); setShowDeleteSajuDialog(false); setDeletingSaju(null); } };
  const handleViewCompatibility = (leftId: string, rightId: string) => { setLocation(`/compatibility?left=${leftId}&right=${rightId}`); };

  const handleEditSaju = (saju: SajuRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({
      edit: 'true', id: saju.id, name: saju.name || '', calendarType: saju.calendarType,
      year: saju.birthYear.toString(), month: saju.birthMonth?.toString() || '', day: saju.birthDay?.toString() || '',
      birthTime: saju.birthTime || '', gender: saju.gender, groupId: saju.groupId || '', memo: saju.memo || ''
    });
    setLocation(`/saju-input?${params.toString()}`);
  };

  const calculateAge = (birthYear: number) => { return new Date().getFullYear() - birthYear + 1; };
  const toggleSelectSaju = (id: string) => { setSelectedSajuIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };
  const toggleSelectAll = () => { setSelectedSajuIds(selectedSajuIds.length === sajuList.length ? [] : sajuList.map(s => s.id)); };
  const handleBulkDelete = () => { if (selectedSajuIds.length > 0) setShowBulkDeleteDialog(true); };
  const confirmBulkDelete = () => { bulkDeleteMutation.mutate(selectedSajuIds); setShowBulkDeleteDialog(false); };
  const handleSort = (type: SortType) => {
    if (sortType === type) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortType(type); setSortOrder(type === 'createdAt' ? 'desc' : 'asc'); }
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="container mx-auto px-3 py-3 max-w-md">

        {/* 상단 헤더 */}
        <div className="relative flex items-center mb-2 border-b pb-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="absolute left-0 px-2 text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-full text-center"><h1 className="text-base font-bold text-gray-800 dark:text-gray-100">저장 목록</h1></div>
          <div className="absolute right-0 flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleManualSync} disabled={isSyncing}
              title="다른 기기(PC 등)와 동기화" className="h-7 w-7 p-0 text-muted-foreground">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setLocation("/saju-input")} className="bg-primary hover:bg-primary/90 h-7 text-xs px-2"><Plus className="w-3 h-3 mr-1" />추가</Button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-gray-100 p-0.5 rounded-lg mb-2">
          <button onClick={() => setActiveTab('personal')} className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'personal' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
            <User className="w-3 h-3 inline-block mr-1" /> 개인 사주
          </button>
          <button onClick={() => setActiveTab('compatibility')} className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'compatibility' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'}`}>
            <Heart className="w-3 h-3 inline-block mr-1" /> 궁합
          </button>
        </div>

        {/* 개인 사주 탭 */}
        {activeTab === 'personal' && (
          <div>
            {/* 검색 */}
            <div className="mb-2 flex gap-1 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <Input type="text" placeholder="이름 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 h-7 text-xs bg-gray-50 border-gray-200" />
              </div>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-24 h-7 text-xs bg-gray-50 border-gray-200"><SelectValue placeholder="모든 그룹" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 그룹</SelectItem>
                  {groupsList?.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => { setEditingGroup(null); setShowGroupModal(true); }} className="h-7 w-7 bg-gray-50 border-gray-200 text-gray-500"><FolderPlus className="w-3.5 h-3.5" /></Button>
            </div>

            {selectedGroupId && selectedGroupId !== "all" && (
              <div className="flex gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={() => { const grp = groupsList?.find(g => g.id === selectedGroupId); if(grp) handleEditGroup(grp); }} className="flex-1 text-xs h-7"><Edit className="w-3 h-3 mr-1" />그룹명 변경</Button>
                <Button variant="outline" size="sm" onClick={() => { if(selectedGroupId) handleDeleteGroup(selectedGroupId); }} className="text-xs h-7 text-rose-500"><Trash2 className="w-3 h-3" /></Button>
              </div>
            )}

            {/* 정렬 */}
            <div className="flex gap-1 mb-2">
              <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className={`flex-1 text-xs h-7 rounded-full border ${sortType === 'name' ? 'bg-primary/10 text-primary border-primary/30 font-bold' : 'text-gray-500 border-gray-200'}`}>가나다순 {sortType === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleSort('createdAt')} className={`flex-1 text-xs h-7 rounded-full border ${sortType === 'createdAt' ? 'bg-primary/10 text-primary border-primary/30 font-bold' : 'text-gray-500 border-gray-200'}`}>저장일순 {sortType === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleSort('age')} className={`flex-1 text-xs h-7 rounded-full border ${sortType === 'age' ? 'bg-primary/10 text-primary border-primary/30 font-bold' : 'text-gray-500 border-gray-200'}`}>나이순 {sortType === 'age' && (sortOrder === 'asc' ? '▲' : '▼')}</Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>)}</div>
            ) : error ? (
              <div className="text-center py-8"><p className="text-muted-foreground text-sm mb-3">불러오기 실패</p><Button onClick={() => refetch()} variant="outline" size="sm">다시 시도</Button></div>
            ) : !sajuList || sajuList.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">저장된 사주가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1 px-1">
                  <div className="flex items-center gap-1 cursor-pointer" onClick={toggleSelectAll}>
                    <Checkbox checked={selectedSajuIds.length === sajuList.length && sajuList.length > 0} className="w-4 h-4 rounded border-gray-300" />
                    <span className="text-xs text-gray-500">{selectedSajuIds.length > 0 ? `${selectedSajuIds.length}개 선택됨` : '전체 선택'}</span>
                  </div>
                  {selectedSajuIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} className="h-6 text-xs px-2"><Trash2 className="w-3 h-3 mr-1" />삭제</Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {sajuList.map((saju) => {
                    const groupName = groupsList?.find(g => g.id === saju.groupId)?.name;
                    return (
                      <Card key={saju.id} className={`cursor-pointer hover:shadow-sm transition-shadow ${selectedSajuIds.includes(saju.id) ? 'ring-1 ring-primary/30' : ''}`} onClick={() => handleViewSaju(saju.id)}>
                        <div className="flex items-center px-3 py-2">
                          <div onClick={e => e.stopPropagation()} className="mr-2">
                            <Checkbox checked={selectedSajuIds.includes(saju.id)} onCheckedChange={() => toggleSelectSaju(saju.id)} className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{saju.name || "이름없음"}</span>
                              <span className="text-xs text-gray-500">{calculateAge(saju.birthYear)}세</span>
                              {groupName && <span className="text-[10px] text-primary bg-primary/10 px-1.5 rounded-full">{groupName}</span>}
                              <span className="text-[10px] text-gray-400 ml-auto">{saju.createdAt ? new Date(saju.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              양력 {saju.birthYear}.{saju.birthMonth}.{saju.birthDay}{saju.birthTime && ` ${saju.birthTime}`}
                              {saju.lunarYear && (
                                <span className="text-gray-400">
                                  {' / '}{saju.isLeapMonth ? '윤달' : '음력'} {saju.lunarYear}.{saju.lunarMonth}.{saju.lunarDay}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-primary" onClick={(e) => handleEditSaju(saju, e)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); handleDeleteSaju(saju.id, saju.name || ""); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* 궁합 탭 */}
        {activeTab === 'compatibility' && (
          <div>
            {isCompatLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg"></div>)}</div>
            ) : !compatibilityList || compatibilityList.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                <Heart className="w-10 h-10 mx-auto text-rose-200 mb-2" />
                <p className="text-gray-500 text-sm">저장된 궁합이 없습니다.</p>
                <p className="text-gray-400 text-xs mt-1">궁합 메뉴에서 저장해보세요.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {compatibilityList.map((compat: any) => (
                  <Card key={compat.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => handleViewCompatibility(compat.leftSajuId, compat.rightSajuId)}>
                    <div className="flex items-center px-3 py-2">
                      <div className="flex items-center flex-1 gap-2">
                        <span className="font-semibold text-sm text-gray-800">{compat.leftName}</span>
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-100" />
                        <span className="font-semibold text-sm text-gray-800">{compat.rightName}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); setDeletingCompatId(compat.id); setShowDeleteCompatDialog(true); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 다이얼로그 */}
        <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? "그룹 수정" : "그룹 생성"}</DialogTitle>
              <DialogDescription>{editingGroup ? "그룹 이름을 수정해주세요." : "새로운 그룹을 만들어보세요."}</DialogDescription>
            </DialogHeader>
            <Form {...groupForm}>
              <form onSubmit={groupForm.handleSubmit(handleGroupSubmit)} className="space-y-4">
                <FormField control={groupForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>그룹 이름</FormLabel>
                    <FormControl><Input placeholder="그룹 이름을 입력해주세요" {...field} autoFocus /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setShowGroupModal(false); setEditingGroup(null); groupForm.reset(); }}>취소</Button>
                  <Button type="submit" disabled={createGroupMutation.isPending || updateGroupMutation.isPending}>{editingGroup ? "수정" : "생성"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>그룹 삭제</AlertDialogTitle>
              <AlertDialogDescription>정말로 이 그룹을 삭제하시겠습니까?<br/><span className="text-destructive font-medium">삭제된 그룹은 복구할 수 없습니다.</span></AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deletingGroupId) deleteGroupMutation.mutate(deletingGroupId); }} disabled={deleteGroupMutation.isPending} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteSajuDialog} onOpenChange={setShowDeleteSajuDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>사주 삭제</AlertDialogTitle>
              <AlertDialogDescription>"{deletingSaju?.name}" 사주를 정말 삭제하시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSaju} disabled={deleteMutation.isPending} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>다중 삭제</AlertDialogTitle>
              <AlertDialogDescription>선택한 {selectedSajuIds.length}개의 사주를 정말 삭제하시겠습니까?<br/><span className="text-destructive font-medium">삭제된 사주는 복구할 수 없습니다.</span></AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBulkDelete} disabled={bulkDeleteMutation.isPending} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteCompatDialog} onOpenChange={setShowDeleteCompatDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>궁합 기록 삭제</AlertDialogTitle>
              <AlertDialogDescription>선택하신 궁합 기록을 삭제하시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deletingCompatId) { deleteCompatMutation.mutate(deletingCompatId); setShowDeleteCompatDialog(false); } }} className="bg-rose-500 hover:bg-rose-600">삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
