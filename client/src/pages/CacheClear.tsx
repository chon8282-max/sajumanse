import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function CacheClear() {
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<string>("");
  const { toast } = useToast();

  const handleClearCache = async () => {
    setClearing(true);
    setResult("캐시 삭제 중...");

    try {
      // 1. 모든 캐시 삭제
      const cacheNames = await caches.keys();
      console.log("Found caches:", cacheNames);
      setResult(prev => prev + `\n발견된 캐시: ${cacheNames.join(", ")}`);

      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log("Deleted cache:", cacheName);
        setResult(prev => prev + `\n삭제: ${cacheName}`);
      }

      // 2. Service Worker 등록 해제
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log("Found SW registrations:", registrations.length);
        setResult(prev => prev + `\n\nService Worker 등록: ${registrations.length}개`);

        for (const registration of registrations) {
          await registration.unregister();
          console.log("Unregistered SW:", registration.scope);
          setResult(prev => prev + `\n등록 해제: ${registration.scope}`);
        }
      }

      setResult(prev => prev + "\n\n✅ 캐시 완전 삭제 완료!");
      
      toast({
        title: "캐시 삭제 완료",
        description: "3초 후 앱이 새로고침됩니다.",
        duration: 2000,
      });

      // 3. 3초 후 강제 새로고침
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);

    } catch (error) {
      console.error("Cache clear error:", error);
      setResult(prev => prev + `\n\n❌ 에러: ${error}`);
      toast({
        title: "캐시 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 에러",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">캐시 완전 삭제</h1>
        <p className="text-muted-foreground mb-6">
          PWA 앱의 모든 캐시와 Service Worker를 완전히 삭제합니다.
          <br />
          이 작업 후 앱이 자동으로 새로고침됩니다.
        </p>

        <Button 
          onClick={handleClearCache} 
          disabled={clearing}
          className="w-full mb-4"
          size="lg"
        >
          {clearing ? "삭제 중..." : "캐시 완전 삭제"}
        </Button>

        {result && (
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {result}
          </pre>
        )}
      </Card>
    </div>
  );
}
