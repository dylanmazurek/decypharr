import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { RouterProvider } from './context/RouterContext';
import { ToastProvider } from './context/ToastContext';
import '@fontsource-variable/source-sans-3';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';

async function enableMocking() {
  if (import.meta.env.VITE_MOCK !== 'true' && import.meta.env.MODE !== 'mock') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <RouterProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </RouterProvider>
      </React.StrictMode>
    );
  }
});
