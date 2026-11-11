export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="border-b border-line pb-5">
        <div className="h-2.5 w-40 animate-pulse rounded-[2px] bg-soft" />
        <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-[2px] bg-soft" />
        <div className="mt-3 h-3 w-56 max-w-full animate-pulse rounded-[2px] bg-soft" />
      </div>

      <div className="grid grid-cols-1 border-y-2 border-ink sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-b border-line p-4 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0"
          >
            <div className="h-2.5 w-20 animate-pulse rounded-[2px] bg-soft" />
            <div className="mt-3 h-7 w-28 animate-pulse rounded-[2px] bg-soft" />
            <div className="mt-2 h-2.5 w-24 animate-pulse rounded-[2px] bg-soft" />
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-end justify-between border-b border-line pb-2">
          <div className="h-4 w-32 animate-pulse rounded-[2px] bg-soft" />
          <div className="h-3 w-24 animate-pulse rounded-[2px] bg-soft" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line py-3">
            <div className="h-3 w-6 animate-pulse rounded-[2px] bg-soft" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-40 max-w-full animate-pulse rounded-[2px] bg-soft" />
              <div className="h-2.5 w-24 animate-pulse rounded-[2px] bg-soft" />
            </div>
            <div className="h-4 w-20 animate-pulse rounded-[2px] bg-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
