import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth, onAuthStateChanged } from "@/lib/firebase";

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
    console.log('[AuthContext] Initializing auth state');
    
    // 저장된 토큰 확인 (팝업 방식에서는 signInWithGoogle에서 직접 저장함)
    const storedToken = localStorage.getItem('googleAccessToken');
    if (storedToken) {
      setGoogleAccessToken(storedToken);
      console.log('[AuthContext] Loaded stored token');
    }

    // Auth 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[AuthContext] Auth state changed:', currentUser ? currentUser.email : 'No user');
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        // 로그아웃 시 토큰도 삭제
        console.log('[AuthContext] User logged out, clearing tokens');
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

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, googleAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
