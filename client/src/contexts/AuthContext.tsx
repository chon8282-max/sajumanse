import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, getRedirectResult } from "firebase/auth";
import { auth, onAuthStateChanged } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        const tokenResponse = (result as any)._tokenResponse;
        if (tokenResponse?.oauthAccessToken) {
          const token = tokenResponse.oauthAccessToken;
          setGoogleAccessToken(token);
          localStorage.setItem('googleAccessToken', token);
        }
      } else {
        const storedToken = localStorage.getItem('googleAccessToken');
        if (storedToken) {
          setGoogleAccessToken(storedToken);
        }
      }
    }).catch((error) => {
      console.error('Error getting redirect result:', error);
      const storedToken = localStorage.getItem('googleAccessToken');
      if (storedToken) {
        setGoogleAccessToken(storedToken);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, googleAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
