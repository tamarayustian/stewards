export default function ActivityLoading() {
  return (
    <div className="space-y-8">
      <div className="border-b border-line pb-5">
        <div className="h-2.5 w-36 animate-pulse rounded-[2px] bg-soft" />
        <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-[2px] bg-soft" />
        <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded-[2px] bg-soft" />
      </div>

      <div className="grid grid-cols-1 border-y-2 border-ink sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-b border-line p-4 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0"
          >
            <div className="h-2.5 w-20 animate-pulse rounded-[2px] bg-soft" />
            <div className="mt-3 h-6 w-28 animate-pulse rounded-[2px] bg-soft" />
            <div className="mt-2 h-2.5 w-24 animate-pulse rounded-[2px] bg-soft" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-48 animate-pulse rounded-full bg-soft" />
        <div className="h-3 w-36 animate-pulse rounded-[2px] bg-soft" />
      </div>

      <div>
        <div className="flex gap-5 border-b border-line pb-2">
          {[40, 56, 72, 40].map((w, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded-[2px] bg-soft"
              style={{ width: w }}
            />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line py-3">
            <div className="hidden h-3 w-16 animate-pulse rounded-[2px] bg-soft min-[1240px]:block" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-40 max-w-full animate-pulse rounded-[2px] bg-soft" />
              <div className="h-2.5 w-28 animate-pulse rounded-[2px] bg-soft" />
            </div>
            <div className="h-4 w-20 animate-pulse rounded-[2px] bg-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
