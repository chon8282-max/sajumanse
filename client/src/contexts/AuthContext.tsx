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
    
    // Auth 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Redirect 결과 확인 (PWA에서 redirect 로그인 후 돌아왔을 때)
      // Auth가 ready된 후 한 번만 실행
      if (!redirectCheckCompleted) {
        redirectCheckCompleted = true;
        
        try {
          const result = await getRedirectResult(auth);
          
          if (result) {
            // Redirect 로그인 성공 시 Access token 저장
            const tokenResponse = (result as any)._tokenResponse;
            if (tokenResponse?.oauthAccessToken) {
              const token = tokenResponse.oauthAccessToken;
              localStorage.setItem('googleAccessToken', token);
              setGoogleAccessToken(token);
            }
          }
        } catch (error) {
          // Redirect 에러 발생 시 무시
        }
      }
      
      setUser(currentUser);
      setLoading(false);
      
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
