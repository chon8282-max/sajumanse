import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Hide loading screen when React app is ready
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 300);
  }
};

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Render React app and hide loading screen
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
  setTimeout(hideLoadingScreen, 500);
} else {
  console.error('Root element not found');
  hideLoadingScreen();
}
