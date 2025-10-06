import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("Firebase Config Check:", {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.appdata');

googleProvider.setCustomParameters({
  access_type: 'offline',
  prompt: 'consent'
});

// WebView 환경 감지
const isWebView = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('wv') || // Android WebView
    userAgent.includes('webview') ||
    (userAgent.includes('android') && !userAgent.includes('chrome')) ||
    /; wv\)/.test(userAgent)
  );
};

export const signInWithGoogle = async () => {
  console.log('[Firebase] signInWithGoogle called');
  
  // WebView 환경이면 브라우저로 열기 안내
  if (isWebView()) {
    console.log('[Firebase] WebView detected, showing alert');
    const currentUrl = window.location.href;
    
    // 클립보드 복사 시도
    try {
      await navigator.clipboard.writeText(currentUrl);
      alert('앱 내부 브라우저에서는 로그인이 불가능합니다.\n\nChrome이나 Safari에서 열어주세요.\n\n(주소가 복사되었습니다)');
    } catch (e) {
      alert('앱 내부 브라우저에서는 로그인이 불가능합니다.\n\nChrome이나 Safari에서 열어주세요.');
    }
    
    return Promise.reject(new Error('WebView에서는 로그인이 지원되지 않습니다'));
  }
  
  console.log('[Firebase] Starting redirect to Google login');
  return signInWithRedirect(auth, googleProvider);
};

export const signOut = async () => {
  console.log('[Firebase] signOut called');
  try {
    localStorage.removeItem('googleAccessToken');
    await firebaseSignOut(auth);
    console.log('[Firebase] Sign out successful');
  } catch (error) {
    console.error('[Firebase] Sign out error:', error);
    throw error;
  }
};

export { onAuthStateChanged, getRedirectResult };
