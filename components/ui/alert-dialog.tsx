'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';

import { cn } from '@/lib/utils';

function AlertDialogRoot(props: AlertDialog.Root.Props) {
  return <AlertDialog.Root {...props} />;
}

function AlertDialogTrigger(props: AlertDialog.Trigger.Props) {
  return <AlertDialog.Trigger {...props} />;
}

function AlertDialogPortal(props: AlertDialog.Portal.Props) {
  return <AlertDialog.Portal {...props} />;
}

function AlertDialogBackdrop(props: AlertDialog.Backdrop.Props) {
  return (
    <AlertDialog.Backdrop
      className={cn('fixed inset-0 z-50 bg-foreground/15 backdrop-blur-[2px]', props.className)}
      {...props}
    />
  );
}

function AlertDialogPopup({ className, ...props }: AlertDialog.Popup.Props) {
  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/15 backdrop-blur-[2px]" />
      <AlertDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-5 text-sm text-card-foreground shadow-lg ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95',
          className,
        )}
        {...props}
      />
    </AlertDialog.Portal>
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialog.Title.Props) {
  return (
    <AlertDialog.Title
      className={cn('font-heading text-base leading-snug font-medium', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: AlertDialog.Description.Props) {
  return (
    <AlertDialog.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function AlertDialogClose(props: AlertDialog.Close.Props) {
  return <AlertDialog.Close {...props} />;
}

export {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
};
