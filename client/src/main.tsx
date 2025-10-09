import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
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
