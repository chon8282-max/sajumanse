import { useState } from 'react';
import MobileHeader from '../MobileHeader';

export default function MobileHeaderExample() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    console.log('Theme toggled:', !isDarkMode ? 'dark' : 'light');
  };

  const handleMenuClick = () => {
    console.log('Menu clicked');
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        currentDate={new Date()}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        onMenuClick={handleMenuClick}
        userName="홍길동"
      />
      <div className="p-4">
        <p className="text-center text-muted-foreground">
          헤더 테스트 영역
        </p>
      </div>
    </div>
  );
}