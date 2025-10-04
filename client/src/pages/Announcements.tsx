import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { type Announcement } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";

export default function Announcements() {
  const [, setLocation] = useLocation();

  const { data: announcementsData, isLoading } = useQuery<{ success: boolean; data: Announcement[] }>({
    queryKey: ["/api/announcements"],
    staleTime: 1000 * 60 * 5,
  });

  const announcements = announcementsData?.data || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 max-w-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">알립니다</h1>
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
              <Card
                key={announcement.id}
                onClick={() => setLocation(`/announcements/${announcement.id}`)}
                data-testid={`announcement-card-${announcement.id}`}
                className="hover-elevate active-elevate-2 cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="text-base font-semibold mb-2 line-clamp-2">
                    {announcement.title}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {announcement.content}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {announcement.createdAt && format(new Date(announcement.createdAt), 'yyyy년 M월 d일', { locale: ko })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="h-24" />
      </div>
    </div>
  );
}
