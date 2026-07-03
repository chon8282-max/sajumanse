import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
import { ArrowLeft, Trash2, User, Calendar, RefreshCw, Search, Plus, Edit, FolderPlus, Heart } from "lucide-react";
import type { SajuRecord, Group } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const groupFormSchema = z.object({
  name: z.string().min(1, "그룹 이름을 입력해주세요").max(50, "그룹 이름은 50자 이하로 입력해주세요")
});
type GroupFormData = z.infer<typeof groupFormSchema>;

export default function SajuList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // 🔥 4번 요청 반영: 탭 분리 (개인사주 vs 궁합)
  const [activeTab, setActiveTab] = useState<'personal' | 'compatibility'>('personal');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  type SortType = 'name' | 'createdAt' | 'age';
  type SortOrder = 'asc' | 'desc';
  const [sortType, setSortType] = useState<SortType>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  
  const [showDeleteSajuDialog, setShowDeleteSajuDialog] = useState(false);
  const [deletingSaju, setDeletingSaju] = useState<{ id: string; name: string } | null>(null);
  
  const [selectedSajuIds, setSelectedSajuIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // 궁합 삭제 다이얼로그용
  const [showDeleteCompatDialog, setShowDeleteCompatDialog] = useState(false);
  const [deletingCompatId, setDeletingCompatId] = useState<string | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // 🔥 궁합 리스트 쿼리 추가
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

  // 🔥 궁합 기록 삭제 Mutation
  const deleteCompatMutation = useMutation({
    mutationFn: async (id: string) => await localDB.deleteCompatibilityRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-compatibility-records"] });
      toast({ title: "삭제 완료", description: "궁합 기록이 삭제되었습니다.", duration: 700 });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map(id => localDB.deleteSajuRecord(id));
      const results = await Promise.all(deletePromises);
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
  const handleViewSaju = (id: string) => { setLocation(`/saju-result/${id}`); };
  const handleDeleteSaju = (id: string, name: string) => { setDeletingSaju({ id, name }); setShowDeleteSajuDialog(true); };
  const confirmDeleteSaju = () => { if (deletingSaju) { deleteMutation.mutate(deletingSaju.id); setShowDeleteSajuDialog(false); setDeletingSaju(null); } };

  // 🔥 궁합 열기 핸들러
  const handleViewCompatibility = (leftId: string, rightId: string) => {
    setLocation(`/compatibility?left=${leftId}&right=${rightId}`);
  };

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
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-4 max-w-md">
        
        {/* 상단 네비게이션 헤더 */}
        <div className="relative flex items-center mb-2 border-b pb-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="absolute left-0 px-2 text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="w-full text-center"><h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">저장 목록</h1></div>
          <Button size="sm" onClick={() => setLocation("/saju-input")} className="absolute right-0 bg-primary hover:bg-primary/90 shadow-sm"><Plus className="w-4 h-4 mr-1" />추가</Button>
        </div>
        
        {/* 🔥 4번 요청: 탭 메뉴 구현 */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg mb-2 shadow-inner">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'personal' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <User className="w-4 h-4 inline-block mr-2 mb-0.5" /> 개인 사주
          </button>
          <button
            onClick={() => setActiveTab('compatibility')}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'compatibility' ? 'bg-white dark:bg-gray-700 text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Heart className="w-4 h-4 inline-block mr-2 mb-0.5" /> 궁합
          </button>
        </div>

        {/* 탭 1: 개인 사주 목록 영역 */}
        {activeTab === 'personal' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 검색 바 및 그룹 필터 */}
            <div className="mb-2 bg-white dark:bg-gray-900 p-1.5 rounded-lg border shadow-sm">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input type="text" placeholder="이름 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-7 text-xs bg-gray-50 border-0 focus-visible:ring-1" />
                </div>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="w-28 h-7 text-xs border-0 bg-gray-50"><SelectValue placeholder="모든 그룹" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 그룹</SelectItem>
                    {groupsList?.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => { setEditingGroup(null); setShowGroupModal(true); }} className="h-7 w-7 border-0 bg-gray-50 text-gray-500 hover:text-primary"><FolderPlus className="w-5 h-5" /></Button>
              </div>
              
              {selectedGroupId && selectedGroupId !== "all" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-dashed">
                  <Button variant="ghost" size="sm" onClick={() => { const grp = groupsList?.find(g => g.id === selectedGroupId); if(grp) handleEditGroup(grp); }} className="flex-1 text-xs text-muted-foreground"><Edit className="w-3 h-3 mr-2" />그룹명 변경</Button>
                  <Button variant="ghost" size="sm" onClick={() => { if(selectedGroupId) handleDeleteGroup(selectedGroupId); }} className="flex-1 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3 h-3 mr-2" />그룹 삭제</Button>
                </div>
              )}
            </div>

            {/* 정렬 버튼 */}
            <div className="flex gap-1 mb-2 px-1">
              <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className={`flex-1 text-xs rounded-full border ${sortType === 'name' ? 'bg-primary/10 text-primary border-primary/30 font-bold' : 'bg-transparent text-gray-500 border-gray-200'}`}>가나다순 {sortType === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleSort('createdAt')} className={`flex-1 text-xs rounded-full border ${sortType === 'createdAt' ? 'bg-primary/10 text-primary border-primary/30 font-bold' : 'bg-transparent text-gray-500 border-gray-200'}`}>저장일순 {sortType === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleSort('age')} className={`flex-1 text-xs rounded-full border ${sortType === 'age' ? 'bg-primary/10 text-primary border-primary/30 font-bold' : 'bg-transparent text-gray-500 border-gray-200'}`}>나이순 {sortType === 'age' && (sortOrder === 'asc' ? '▲' : '▼')}</Button>
            </div>

            {/* 개인 사주 데이터 표시 */}
            {isLoading ? (
              <div className="space-y-3 mt-8">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl"></div>)}</div>
            ) : error ? (
              <div className="text-center py-10"><p className="text-muted-foreground mb-4">불러오기 실패</p><Button onClick={() => refetch()} variant="outline">다시 시도</Button></div>
            ) : !sajuList || sajuList.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed mt-6">
                <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">저장된 사주가 없습니다.</p>
              </div>
            ) : (
              <>
                {sajuList.length > 0 && (
                  <div className="flex items-center justify-between mb-1 px-1">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={toggleSelectAll}>
                      <Checkbox checked={selectedSajuIds.length === sajuList.length && sajuList.length > 0} className="rounded border-gray-300 w-4 h-4" />
                      <span className="text-xs font-medium text-gray-600"></span><div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
                      <Checkbox checked={selectedSajuIds.length === sajuList.length && sajuList.length > 0} className="rounded border-gray-300" />
                      <span className="text-sm font-medium text-gray-600">{selectedSajuIds.length > 0 ? `${selectedSajuIds.length}개 선택됨` : '전체 선택'}</span>
                    </div>
                    {selectedSajuIds.length > 0 && (
                      <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} className="h-7 text-xs px-3 rounded-full"><Trash2 className="w-3 h-3 mr-1" />삭제</Button>
                    )}
                  </div>
                )}
                
                <div className="space-y-0">
                  {sajuList.map((saju) => {
                    const groupName = groupsList?.find(g => g.id === saju.groupId)?.name;
                    return (
                      <Card key={saju.id} className={`overflow-hidden transition-all border-l-4 ${selectedSajuIds.includes(saju.id) ? 'border-l-primary ring-1 ring-primary/20' : 'border-l-transparent'}`}>
                        <div className="flex items-stretch p-0 cursor-pointer" onClick={() => handleViewSaju(saju.id)}>
                          <div className="flex items-center pl-4 pr-2" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedSajuIds.includes(saju.id)} onCheckedChange={() => toggleSelectSaju(saju.id)} className="w-5 h-5 rounded-md border-gray-300" />
                          </div>
                          <div className="flex-1 py-2 pr-3">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{saju.name || "이름없음"}</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{calculateAge(saju.birthYear)}세</span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-primary/10" onClick={(e) => handleEditSaju(saju, e)}><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-500 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); handleDeleteSaju(saju.id, saju.name || ""); }}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mb-2 font-medium tracking-tight">
                              양력 {saju.birthYear}.{saju.birthMonth}.{saju.birthDay}
                              {saju.birthTime && <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">{saju.birthTime}</span>}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[11px] text-gray-400">{saju.createdAt ? new Date(saju.createdAt).toLocaleDateString() : '날짜미상'} 저장</span>
                              {groupName && <span className="text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full">{groupName}</span>}
                            </div>
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

        {/* 탭 2: 궁합 목록 영역 */}
        {activeTab === 'compatibility' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isCompatLoading ? (
              <div className="space-y-3 mt-8">{[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl"></div>)}</div>
            ) : !compatibilityList || compatibilityList.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed mt-6">
                <Heart className="w-12 h-12 mx-auto text-rose-200 mb-3" />
                <p className="text-gray-500 text-sm">저장된 궁합이 없습니다.</p>
                <p className="text-gray-400 text-xs mt-1">궁합 메뉴에서 두 사람의 사주를 넣고 저장해보세요.</p>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {compatibilityList.map((compat: any) => (
                  <Card key={compat.id} className="overflow-hidden border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                    <div 
                      className="flex items-center justify-between p-5 cursor-pointer bg-gradient-to-r from-white to-rose-50/30"
                      onClick={() => handleViewCompatibility(compat.leftSajuId, compat.rightSajuId)}
                    >
                      <div className="flex items-center flex-1">
                        <div className="font-bold text-lg text-gray-800 w-24 text-right truncate">{compat.leftName}</div>
                        <div className="mx-4 text-rose-300"><Heart className="w-6 h-6 fill-rose-100" /></div>
                        <div className="font-bold text-lg text-gray-800 w-24 text-left truncate">{compat.rightName}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-300 hover:text-rose-500 hover:bg-rose-50"
                        onClick={(e) => { e.stopPropagation(); setDeletingCompatId(compat.id); setShowDeleteCompatDialog(true); }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 기존 다이얼로그 모음들 (생략하지 않음) */}
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

        {/* 🔥 궁합 기록 삭제 다이얼로그 */}
        <AlertDialog open={showDeleteCompatDialog} onOpenChange={setShowDeleteCompatDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>궁합 기록 삭제</AlertDialogTitle>
              <AlertDialogDescription>선택하신 궁합 기록을 삭제하시겠습니까? (개별 사주 정보는 삭제되지 않습니다)</AlertDialogDescription>
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