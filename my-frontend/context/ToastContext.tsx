'use client';

import { createContext, useCallback, useState, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    toast(message, 'success', duration);
  }, [toast]);

  const error = useCallback((message: string, duration?: number) => {
    toast(message, 'error', duration ?? 5000); // Errors stay longer
  }, [toast]);

  const warning = useCallback((message: string, duration?: number) => {
    toast(message, 'warning', duration);
  }, [toast]);

  const info = useCallback((message: string, duration?: number) => {
    toast(message, 'info', duration);
  }, [toast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextType = { toast, success, error, warning, info, dismiss };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const getStyles = (type: ToastType) => {
    const baseStyles = 'rounded-lg px-4 py-3 text-white font-medium shadow-lg';
    const typeStyles = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500',
    };
    return `${baseStyles} ${typeStyles[type]}`;
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={getStyles(t.type)}
          onClick={() => onDismiss(t.id)}
          style={{ cursor: 'pointer' }}
        >
          <div className="flex items-center justify-between gap-3">
            <p>{t.message}</p>
            <button className="text-white hover:opacity-80">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
