import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontType = 'chosunkm' | 'chosungs';

interface FontContextType {
  font: FontType;
  setFont: (font: FontType) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontType>(() => {
    const saved = localStorage.getItem('ganji-font');
    return (saved as FontType) || 'chosungs';
  });

  useEffect(() => {
    localStorage.setItem('ganji-font', font);
    
    // CSS 변수 업데이트 (한글 폴백 폰트 추가)
    const fontFamily = font === 'chosungs' 
      ? "'ChosunGsFont', Pretendard, -apple-system, sans-serif"
      : "'ChosunKmFont', Pretendard, -apple-system, sans-serif";
    
    document.documentElement.style.setProperty('--ganji-font-family', fontFamily);
  }, [font]);

  const setFont = (newFont: FontType) => {
    setFontState(newFont);
  };

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
