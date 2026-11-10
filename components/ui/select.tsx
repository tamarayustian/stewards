import { cn } from '@/lib/utils';

const VARIANTS = {
  default:
    'h-10 rounded-md border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-soft disabled:opacity-60',
  compact:
    'h-8 w-full rounded-md border border-line-strong bg-paper px-2.5 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-soft disabled:opacity-60',
} as const;

interface SelectProps extends React.ComponentProps<'select'> {
  variant?: keyof typeof VARIANTS;
}

export function Select({ className, variant = 'default', ...props }: SelectProps) {
  return <select {...props} className={cn(VARIANTS[variant], className)} />;
}
