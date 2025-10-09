import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA with auto-update
if ('serviceWorker' in navigator) {
  let refreshing = false;
  
  // 새 SW가 제어권을 가져오면 페이지 새로고침
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('🔄 New Service Worker activated - reloading page');
      window.location.reload();
    }
  });
  
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ SW registered:', registration.scope);
        
        // 새 SW 업데이트 확인 (1분마다)
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // 새 SW 발견 시 즉시 활성화
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('🆕 New Service Worker found - installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 새 SW가 설치됨 - skipWaiting()이 호출되면 자동으로 활성화
                console.log('📦 New Service Worker installed - will activate soon');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ SW registration failed:', error);
      });
  });
}

// Render React app
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error('Root element not found');
}
