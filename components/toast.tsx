'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function toastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return <CheckCircle className="size-4 text-accent" />;
    case 'error':
      return <AlertCircle className="size-4 text-destructive" />;
    case 'info':
      return <Info className="size-4 text-muted-foreground" />;
  }
}

function ToastItemView({
  toast: t,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-2',
        'bg-card ring-1 ring-foreground/10 rounded-xl px-4 py-3 shadow-lg',
        'flex items-center gap-3'
      )}
    >
      <div className="shrink-0">{toastIcon(t.variant)}</div>
      <p className="text-sm font-medium flex-1 min-w-0">{t.title}</p>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, variant = 'success' }: { title: string; variant?: ToastVariant }) => {
      const id = crypto.randomUUID();
      const duration = variant === 'error' ? 6000 : 4000;

      setToasts((prev) => {
        const next = [...prev, { id, title, variant }];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });

      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col items-center gap-2 sm:bottom-4 sm:right-4 sm:left-auto sm:items-stretch">
        {toasts.map((t) => (
          <ToastItemView key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
