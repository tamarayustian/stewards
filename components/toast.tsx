'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  variant: ToastVariant;
  closing: boolean;
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
        t.closing
          ? 'animate-out fade-out-0 slide-out-to-bottom-2'
          : 'animate-in fade-in-0 slide-in-from-bottom-2',
        'bg-card ring-1 ring-foreground/10 rounded-xl px-4 py-3 shadow-lg',
        'flex items-center gap-3'
      )}
    >
      <div className="shrink-0">{toastIcon(t.variant)}</div>
      <p className="text-sm font-medium flex-1 min-w-0">{t.title}</p>
      <button
        type="button"
        aria-label="Dismiss"
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
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const map = timeouts.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id && !t.closing ? { ...t, closing: true } : t))
      );
      const timer = setTimeout(() => {
        timeouts.current.delete(id);
        remove(id);
      }, 200);
      timeouts.current.set(id, timer);
    },
    [remove]
  );

  const toast = useCallback(
    ({ title, variant = 'success' }: { title: string; variant?: ToastVariant }) => {
      const id = crypto.randomUUID();
      const duration = variant === 'error' ? 6000 : 4000;

      setToasts((prev) => {
        const next = [...prev, { id, title, variant, closing: false }];
        if (next.length <= 3) return next;
        const evicted = next[0];
        const timer = setTimeout(() => {
          timeouts.current.delete(evicted.id);
          remove(evicted.id);
        }, 200);
        timeouts.current.set(evicted.id, timer);
        return next.map((t, i) => (i === 0 ? { ...t, closing: true } : t));
      });

      const timer = setTimeout(() => {
        timeouts.current.delete(id);
        dismiss(id);
      }, duration);
      timeouts.current.set(id, timer);
    },
    [dismiss, remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 left-4 right-4 z-50 flex flex-col items-center gap-2 sm:bottom-4 sm:right-4 sm:left-auto sm:items-stretch"
      >
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
