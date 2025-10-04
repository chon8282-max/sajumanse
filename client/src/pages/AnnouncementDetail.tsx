import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { type Announcement } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";

export default function AnnouncementDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: announcementData, isLoading } = useQuery<{ success: boolean; data: Announcement }>({
    queryKey: ["/api/announcements", id],
    enabled: !!id,
  });

  const announcement = announcementData?.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 max-w-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/announcements")}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">공지사항</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            로딩중...
          </div>
        ) : !announcement ? (
          <div className="text-center py-8 text-muted-foreground">
            공지사항을 찾을 수 없습니다.
          </div>
        ) : (
          <Card data-testid="card-announcement-detail">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-3">{announcement.title}</h2>
              <div className="text-xs text-muted-foreground mb-6 pb-4 border-b">
                {announcement.createdAt && format(new Date(announcement.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {announcement.content}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="h-24" />
      </div>
    </div>
  );
}
