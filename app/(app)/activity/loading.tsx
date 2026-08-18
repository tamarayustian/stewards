export default function ActivityLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-1.5">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <div className="h-7 w-10 animate-pulse rounded-md bg-background" />
        <div className="h-7 w-16 animate-pulse rounded-md bg-background" />
        <div className="h-7 w-20 animate-pulse rounded-md bg-background" />
        <div className="h-7 w-10 animate-pulse rounded-md bg-background" />
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <div className="h-6 w-8 animate-pulse rounded-md bg-background" />
        <div className="h-6 w-16 animate-pulse rounded-md bg-background" />
        <div className="h-6 w-20 animate-pulse rounded-md bg-background" />
        <div className="h-6 w-8 animate-pulse rounded-md bg-background" />
      </div>

      <div className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-9 animate-pulse rounded-lg bg-muted" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-44 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
