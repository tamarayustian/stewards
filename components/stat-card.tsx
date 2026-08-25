import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type StatTone = 'destructive' | 'accent';

const TONES: Record<StatTone, { tile: string; icon: string; value: string }> = {
  destructive: { tile: 'bg-destructive/10', icon: 'text-destructive', value: 'text-destructive' },
  accent: { tile: 'bg-accent/10', icon: 'text-accent', value: 'text-accent' },
};

interface StatCardProps {
  icon: LucideIcon;
  tone: StatTone;
  label: string;
  value: string;
}

export function StatCard({ icon: Icon, tone, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex size-10 items-center justify-center rounded-xl ${TONES[tone].tile}`}>
          <Icon className={`size-5 ${TONES[tone].icon}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-semibold ${TONES[tone].value}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
