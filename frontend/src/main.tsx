import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { RouterProvider } from './context/RouterContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

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
