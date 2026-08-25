import { cn } from '@/lib/utils';

const VARIANTS = {
  default: 'h-10 rounded-md border border-input bg-background px-3 text-sm',
  compact:
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
} as const;

interface SelectProps extends React.ComponentProps<'select'> {
  variant?: keyof typeof VARIANTS;
}

export function Select({ className, variant = 'default', ...props }: SelectProps) {
  return <select {...props} className={cn(VARIANTS[variant], className)} />;
}
