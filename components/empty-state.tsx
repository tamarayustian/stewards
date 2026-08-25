import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: ReactNode;
  children?: ReactNode;
} & ComponentProps<typeof Card>;

export function EmptyState({
  icon: Icon,
  title,
  message,
  children,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <Card className={className} {...rest}>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:py-12">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
