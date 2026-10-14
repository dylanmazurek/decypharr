import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-lg border bg-card shadow-2xl p-3 flex items-center justify-between gap-3 text-xs transition-all animate-fade-in',
              t.type === 'success' && 'border-success/30 text-foreground',
              t.type === 'error' && 'border-destructive/30 text-foreground',
              t.type === 'warning' && 'border-warning/30 text-foreground',
              t.type === 'info' && 'border-border text-foreground'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-destructive-text shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-warning shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-primary shrink-0" />}
              <span className="font-medium truncate">{t.message}</span>
            </div>
            <button
              type="button"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-elevated cursor-pointer shrink-0"
              onClick={() => removeToast(t.id)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
