import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type BannerTone = 'primary' | 'accent';

const TONES: Record<BannerTone, { tile: string; icon: string }> = {
  primary: { tile: 'bg-primary/10', icon: 'text-primary' },
  accent: { tile: 'bg-accent/10', icon: 'text-accent' },
};

interface BannerCardProps {
  icon: LucideIcon;
  tone: BannerTone;
  title: string;
  message: ReactNode;
  action?: ReactNode;
}

export function BannerCard({ icon: Icon, tone, title, message, action }: BannerCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone].tile}`}>
            <Icon className={`size-5 ${TONES[tone].icon}`} />
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
