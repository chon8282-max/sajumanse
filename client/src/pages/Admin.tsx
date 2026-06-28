import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Plus, Trash2, Send } from "lucide-react";

export default function Admin() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: authData } = useQuery({ queryKey: ["/api/auth/me"], retry: false });
  const userId = (authData as any)?.user?.id;

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["/api/announcements"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, authorId: userId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setTitle("");
      setContent("");
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await fetch("/api/fcm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">관리자 페이지</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 새 공지 작성 버튼 */}
        <Button
          className="w-full"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          새 공지사항 작성
        </Button>

        {/* 공지 작성 폼 */}
        {showForm && (
          <Card className="p-4 space-y-3">
            <Input
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="내용"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => createMutation.mutate()}
                disabled={!title || !content}
              >
                저장
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  createMutation.mutate();
                  setTimeout(() => {
                    if (title && content) {
                      pushMutation.mutate({ title, content });
                    }
                  }, 500);
                }}
                disabled={!title || !content}
              >
                <Bell className="w-4 h-4 mr-2" />
                저장+푸시발송
              </Button>
            </div>
          </Card>
        )}

        {/* 공지 목록 */}
        <h2 className="font-semibold text-lg">공지사항 목록</h2>
        {isLoading && <p className="text-muted-foreground">로딩 중...</p>}
        {(announcements as any)?.data?.map((item: any) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex gap-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pushMutation.mutate({ title: item.title, content: item.content })}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}