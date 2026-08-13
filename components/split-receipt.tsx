import { Sprout } from 'lucide-react';

export function SplitReceipt() {
  const items = [
    { name: 'Cindy', detail: 'paid · HK$584.32', amount: 'HK$292.16' },
    { name: 'You', detail: 'share', amount: 'HK$292.16' },
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -right-2 -top-3 rotate-[-2deg] bg-walnut/10 px-2 py-0.5 font-heading text-xs italic text-walnut">
        ✓ Cindy settled · HK$292.16
      </div>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="receipt-tear" aria-hidden="true" />
        <div className="receipt-row">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-primary/10">
              <Sprout className="size-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Dinner at Cindy&apos;s</p>
              <p className="text-xs text-muted-foreground">shared table · receipt</p>
            </div>
          </div>
        </div>
        <div className="receipt-line" aria-hidden="true" />
        {items.map((item, index) => (
          <div
            key={item.name}
            className="receipt-row flex items-center justify-between px-5 py-2"
            style={{ animationDelay: `${0.15 + index * 0.2}s` }}
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <p className="font-mono text-sm">{item.amount}</p>
          </div>
        ))}
        <div className="receipt-line" aria-hidden="true" />
        <div className="receipt-row flex items-center justify-between px-5 py-3">
          <p className="text-sm font-medium">You owe</p>
          <p className="font-mono text-sm font-semibold text-destructive">HK$292.16</p>
        </div>
        <div className="flex justify-center px-5 pb-5">
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            ✓ Settled
          </span>
        </div>
      </div>
    </div>
  );
}
