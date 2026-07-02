import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA with immediate auto-update
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
  
  // SW에서 강제 리로드 메시지 수신
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FORCE_RELOAD') {
      console.log('🔄 Force reload requested by SW - reloading page');
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    }
  });
  
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ SW registered:', registration.scope);
        
        // 즉시 업데이트 확인
        registration.update();
        
        // 정기적으로 업데이트 확인 (10초마다)
        setInterval(() => {
          console.log('🔍 Checking for updates...');
          registration.update();
        }, 10000);
        
        // 페이지 포커스될 때마다 업데이트 확인
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            console.log('👀 Page focused - checking for updates...');
            registration.update();
          }
        });
        
        // 새 SW 발견 시 즉시 활성화
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('🆕 New Service Worker found - installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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
