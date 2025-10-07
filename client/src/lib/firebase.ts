import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged, getRedirectResult } from "firebase/auth";

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

// PWA (Progressive Web App) 환경 감지
const isPWA = () => {
  // Standalone 모드 (홈 화면에 추가된 상태)
  return window.matchMedia('(display-mode: standalone)').matches || 
         (navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

// WebView 환경 감지 (Android 및 iOS) - PWA 제외
const isWebView = () => {
  // PWA는 WebView가 아님
  if (isPWA()) {
    console.log('[Firebase] PWA detected - not a WebView');
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Android WebView 감지
  const isAndroidWebView = (
    userAgent.includes('wv') || // Android WebView 표시자
    /; wv\)/.test(userAgent) || // WebView 패턴
    (userAgent.includes('android') && userAgent.includes('version/') && !userAgent.includes('chrome')) // 구형 Android WebView
  );
  
  // iOS WebView 감지
  const isIOSDevice = userAgent.includes('iphone') || userAgent.includes('ipad');
  
  if (!isIOSDevice) {
    return isAndroidWebView;
  }
  
  // iOS 정상 브라우저 확인 (이들은 WebView가 아님)
  const isLegitimateIOSBrowser = (
    userAgent.includes('crios') || // Chrome iOS
    userAgent.includes('fxios') || // Firefox iOS
    userAgent.includes('opios') || // Opera iOS
    userAgent.includes('edgios') || // Edge iOS
    (userAgent.includes('safari') && userAgent.includes('version/')) // 정품 Safari
  );
  
  if (isLegitimateIOSBrowser) {
    return false; // 정상 브라우저는 WebView 아님
  }
  
  // iOS WebView 특정 앱 시그니처 또는 일반 WebView 패턴
  const hasIOSWebViewSignature = (
    userAgent.includes('fbios') || // Facebook iOS
    userAgent.includes('fban') || // Facebook 앱
    userAgent.includes('instagram') || // Instagram
    userAgent.includes('line/') || // Line
    userAgent.includes('kakaotalk') || // KakaoTalk
    userAgent.includes('twitter') || // Twitter
    userAgent.includes('gsa/') || // Google App
    userAgent.includes('messenger') || // Facebook Messenger
    /mobile\/\d+(?!.*safari)/i.test(navigator.userAgent) // iOS WebView 패턴 (Safari 토큰 없음)
  );
  
  // iOS 디바이스이면서 정상 브라우저가 아니고 WebView 시그니처가 있거나 Safari 토큰이 없으면 WebView
  return hasIOSWebViewSignature || !userAgent.includes('safari');
};

export const signInWithGoogle = async () => {
  console.log('[Firebase] signInWithGoogle called');
  
  // WebView 환경이면 외부 브라우저로 열기
  if (isWebView()) {
    console.log('[Firebase] WebView detected, opening in external browser');
    const currentUrl = window.location.href;
    
    // 외부 브라우저로 URL 열기 시도
    const opened = window.open(currentUrl, '_system') || window.open(currentUrl, '_blank');
    
    if (opened) {
      return Promise.reject(new Error('WEBVIEW_EXTERNAL_BROWSER_OPENED'));
    } else {
      // 외부 브라우저 열기 실패 시 클립보드 복사 시도
      try {
        await navigator.clipboard.writeText(currentUrl);
        return Promise.reject(new Error('WEBVIEW_CLIPBOARD_SUCCESS'));
      } catch (e) {
        console.error('[Firebase] Clipboard copy failed:', e);
        return Promise.reject(new Error('WEBVIEW_CLIPBOARD_FAILED'));
      }
    }
  }
  
  console.log('[Firebase] Starting popup for Google login');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('[Firebase] Popup login successful:', result.user.email);
    
    // Access token 저장
    const tokenResponse = (result as any)._tokenResponse;
    if (tokenResponse?.oauthAccessToken) {
      const token = tokenResponse.oauthAccessToken;
      localStorage.setItem('googleAccessToken', token);
      console.log('[Firebase] Access token saved from popup');
    }
    
    return result;
  } catch (error: any) {
    console.error('[Firebase] Popup login error:', error);
    console.error('[Firebase] Error code:', error?.code);
    console.error('[Firebase] Error message:', error?.message);
    throw error;
  }
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
