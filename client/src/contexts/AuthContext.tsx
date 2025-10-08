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
    // 최대 2초 후 강제로 로딩 해제
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    // Auth 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(loadingTimeout);
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        setGoogleAccessToken(null);
        localStorage.removeItem('googleAccessToken');
      } else {
        const token = localStorage.getItem('googleAccessToken');
        if (token) {
          setGoogleAccessToken(token);
        }
      }
    });

    // 저장된 토큰 확인
    const storedToken = localStorage.getItem('googleAccessToken');
    if (storedToken) {
      setGoogleAccessToken(storedToken);
    }

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, googleAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
