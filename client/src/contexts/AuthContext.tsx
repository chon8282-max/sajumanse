import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth, onAuthStateChanged, getRedirectResult } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  googleAccessToken: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  googleAccessToken: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    let redirectCheckCompleted = false;
    
    // Redirect 결과 확인 (최대 3초 대기, timeout으로 로딩 지연 방지)
    const checkRedirectResult = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redirect check timeout')), 3000)
        );
        
        const result = await Promise.race([
          getRedirectResult(auth),
          timeoutPromise
        ]) as any;
        
        if (result) {
          const tokenResponse = result._tokenResponse;
          if (tokenResponse?.oauthAccessToken) {
            const token = tokenResponse.oauthAccessToken;
            localStorage.setItem('googleAccessToken', token);
            setGoogleAccessToken(token);
          }
        }
      } catch (error) {
        // Timeout 또는 redirect 에러 발생 시 무시
      }
    };
    
    // Auth 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // 첫 번째 auth 상태 확인 시 즉시 로딩 해제
      setUser(currentUser);
      setLoading(false);
      
      // Redirect 결과는 한 번만 확인 (비동기로 처리)
      if (!redirectCheckCompleted) {
        redirectCheckCompleted = true;
        checkRedirectResult();
      }
      
      if (!currentUser) {
        // 로그아웃 시 토큰도 삭제
        setGoogleAccessToken(null);
        localStorage.removeItem('googleAccessToken');
      } else {
        // 사용자가 로그인했을 때 토큰 재확인
        const token = localStorage.getItem('googleAccessToken');
        if (token) {
          setGoogleAccessToken(token);
        }
      }
    });

    // 저장된 토큰 확인 (팝업 방식에서는 signInWithGoogle에서 직접 저장함)
    const storedToken = localStorage.getItem('googleAccessToken');
    if (storedToken) {
      setGoogleAccessToken(storedToken);
    }

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, googleAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
