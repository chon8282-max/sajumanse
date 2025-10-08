import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRd2cll1CHIm0C-SExgHdUUz6Q0SuHlWE",
  authDomain: "sajuacademy-9c161.firebaseapp.com",
  projectId: "sajuacademy-9c161",
  storageBucket: "sajuacademy-9c161.firebasestorage.app",
  appId: "1:910226841507:web:532fffb471f6ccd549c416",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.appdata');

googleProvider.setCustomParameters({
  client_id: '910226841507-7h9ecupr3cd3sctqivsbaev8k8erogds.apps.googleusercontent.com',
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
  // WebView 환경이면 외부 브라우저로 열기
  if (isWebView()) {
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
        return Promise.reject(new Error('WEBVIEW_CLIPBOARD_FAILED'));
      }
    }
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Access token 저장
    const tokenResponse = (result as any)._tokenResponse;
    if (tokenResponse?.oauthAccessToken) {
      const token = tokenResponse.oauthAccessToken;
      localStorage.setItem('googleAccessToken', token);
    }
    
    return result;
  } catch (error: any) {
    // 팝업 실패 시 리디렉션 시도 (모바일에서 자주 발생)
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError: any) {
        throw redirectError;
      }
    }
    
    throw error;
  }
};

export const signOut = async () => {
  try {
    localStorage.removeItem('googleAccessToken');
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export { onAuthStateChanged, getRedirectResult };
