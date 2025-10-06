import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, getRedirectResult } from "firebase/auth";
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
    
    // 1. 먼저 리다이렉트 결과 확인
    getRedirectResult(auth)
      .then((result) => {
        console.log('[AuthContext] Redirect result:', result ? 'User found' : 'No result');
        console.log('[AuthContext] Full redirect result:', result);
        if (result?.user) {
          console.log('[AuthContext] Redirect login successful:', result.user.email);
          const tokenResponse = (result as any)._tokenResponse;
          if (tokenResponse?.oauthAccessToken) {
            const token = tokenResponse.oauthAccessToken;
            setGoogleAccessToken(token);
            localStorage.setItem('googleAccessToken', token);
            console.log('[AuthContext] Access token saved');
          }
        } else {
          // 리다이렉트 결과가 없으면 저장된 토큰 확인
          const storedToken = localStorage.getItem('googleAccessToken');
          if (storedToken) {
            setGoogleAccessToken(storedToken);
            console.log('[AuthContext] Loaded stored token');
          }
        }
      })
      .catch((error) => {
        console.error('[AuthContext] Redirect error:', error);
        console.error('[AuthContext] Error code:', error?.code);
        console.error('[AuthContext] Error message:', error?.message);
        console.error('[AuthContext] Full error object:', JSON.stringify(error, null, 2));
        // 에러가 발생해도 저장된 토큰 확인
        const storedToken = localStorage.getItem('googleAccessToken');
        if (storedToken) {
          setGoogleAccessToken(storedToken);
        }
      });

    // 2. Auth 상태 변화 감지
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[AuthContext] Auth state changed:', currentUser ? currentUser.email : 'No user');
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        // 로그아웃 시 토큰도 삭제
        console.log('[AuthContext] User logged out, clearing tokens');
        setGoogleAccessToken(null);
        localStorage.removeItem('googleAccessToken');
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
