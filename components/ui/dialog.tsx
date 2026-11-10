'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';

function Dialog(props: BaseDialog.Root.Props) {
  return <BaseDialog.Root {...props} />;
}

function DialogTrigger(props: BaseDialog.Trigger.Props) {
  return <BaseDialog.Trigger {...props} />;
}

function DialogClose(props: BaseDialog.Close.Props) {
  return <BaseDialog.Close {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: BaseDialog.Popup.Props) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-ink/40" />
      <BaseDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line-strong bg-paper p-6 text-sm text-ink shadow-[0_24px_60px_-40px_rgba(18,19,26,0.5)] outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <BaseDialog.Close
          aria-label="Close"
          className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
            <path
              d="M3 3l10 10M13 3L3 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-5 space-y-1.5 pr-8', className)} {...props} />;
}

function DialogTitle({ className, ...props }: BaseDialog.Title.Props) {
  return (
    <BaseDialog.Title
      className={cn(
        'font-heading text-[22px] leading-tight font-extrabold tracking-[-0.03em] text-ink',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: BaseDialog.Description.Props) {
  return (
    <BaseDialog.Description
      className={cn('text-[13px] leading-relaxed text-body', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-6 flex flex-wrap justify-end gap-2', className)} {...props} />;
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
