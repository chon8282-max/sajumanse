import { useState } from 'react';
import BottomNavigation from '../BottomNavigation';

export default function BottomNavigationExample() {
  const [activeTab, setActiveTab] = useState("manse");

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold">현재 활성 탭: {activeTab}</h2>
          <p className="text-muted-foreground">하단 네비게이션을 테스트해보세요</p>
        </div>
        
        <div className="h-96 bg-muted/20 rounded-md flex items-center justify-center">
          <p className="text-muted-foreground">콘텐츠 영역</p>
        </div>
      </div>
      
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}