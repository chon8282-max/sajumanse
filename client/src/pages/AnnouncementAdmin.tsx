import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { type Announcement } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export default function AnnouncementAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const currentUser = auth.currentUser;

  const { data: announcementsData, isLoading } = useQuery<{ success: boolean; data: Announcement[] }>({
    queryKey: ["/api/announcements"],
    staleTime: 1000 * 60 * 5,
  });

  const announcements = announcementsData?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; authorId: string }) => {
      const response = await apiRequest("POST", "/api/announcements", data);
      if (!(response as any).success) {
        throw new Error((response as any).error || "공지사항 작성에 실패했습니다.");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setShowCreateDialog(false);
      setTitle("");
      setContent("");
      toast({
        title: "작성 완료",
        description: "공지사항이 성공적으로 작성되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "작성 오류",
        description: error instanceof Error ? error.message : "공지사항 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string }) => {
      const response = await apiRequest("PUT", `/api/announcements/${data.id}`, {
        title: data.title,
        content: data.content,
      });
      if (!(response as any).success) {
        throw new Error((response as any).error || "공지사항 수정에 실패했습니다.");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setShowEditDialog(false);
      setSelectedAnnouncement(null);
      setTitle("");
      setContent("");
      toast({
        title: "수정 완료",
        description: "공지사항이 성공적으로 수정되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "수정 오류",
        description: error instanceof Error ? error.message : "공지사항 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/announcements/${id}`);
      if (!(response as any).success) {
        throw new Error((response as any).error || "공지사항 삭제에 실패했습니다.");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
      toast({
        title: "삭제 완료",
        description: "공지사항이 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "삭제 오류",
        description: error instanceof Error ? error.message : "공지사항 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!currentUser?.uid) {
      toast({
        title: "권한 오류",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      authorId: currentUser.uid,
    });
  };

  const handleEdit = () => {
    if (!selectedAnnouncement) return;

    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: selectedAnnouncement.id,
      title: title.trim(),
      content: content.trim(),
    });
  };

  const handleDelete = () => {
    if (!selectedAnnouncement) return;
    deleteMutation.mutate(selectedAnnouncement.id);
  };

  const openEditDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDeleteDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold">공지사항 관리</h1>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setTitle("");
                setContent("");
                setShowCreateDialog(true);
              }}
              data-testid="button-create-announcement"
            >
              <Plus className="w-4 h-4 mr-1" />
              새 공지
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            로딩중...
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            공지사항이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id} data-testid={`admin-announcement-card-${announcement.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="text-base font-semibold mb-1">
                        {announcement.title}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(announcement)}
                        data-testid={`button-edit-${announcement.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(announcement)}
                        data-testid={`button-delete-${announcement.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {announcement.createdAt && format(new Date(announcement.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="h-24" />
      </div>

      {/* 작성 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-announcement">
          <DialogHeader>
            <DialogTitle>새 공지사항 작성</DialogTitle>
            <DialogDescription>
              새로운 공지사항을 작성합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지사항 제목을 입력하세요"
                data-testid="input-announcement-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">내용</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지사항 내용을 입력하세요"
                rows={8}
                data-testid="textarea-announcement-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-create"
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? "작성중..." : "작성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit-announcement">
          <DialogHeader>
            <DialogTitle>공지사항 수정</DialogTitle>
            <DialogDescription>
              공지사항을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지사항 제목을 입력하세요"
                data-testid="input-edit-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">내용</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지사항 내용을 입력하세요"
                rows={8}
                data-testid="textarea-edit-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              data-testid="button-cancel-edit"
            >
              취소
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? "수정중..." : "수정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-announcement">
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="button-confirm-delete"
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "삭제중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
