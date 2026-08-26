'use client';

export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={`text-xs text-destructive${className ? ` ${className}` : ''}`}>
      {message}
    </p>
  );
}

export function FormSuccess({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return <p className={`text-xs text-accent${className ? ` ${className}` : ''}`}>{message}</p>;
}
