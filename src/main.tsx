import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign developer-mode Vite/HMR WebSocket connection warnings
if (typeof window !== 'undefined') {
  const isBenignWebsocketError = (message: string): boolean => {
    const low = message.toLowerCase();
    return low.includes('websocket') || low.includes('vite') || low.includes('hmr') || low.includes('closed without opened');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (isBenignWebsocketError(msg)) {
      event.preventDefault();
      event.stopPropagation();
      console.info('[Vite Dev HMR WebSocket Intercepted & Suppressed Safely]:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isBenignWebsocketError(msg)) {
      event.preventDefault();
      event.stopPropagation();
      console.info('[Vite Dev HMR Error Intercepted & Suppressed Safely]:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
