export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">Stewards</span>
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get started
          </a>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Split expenses with friends. No spreadsheets needed.
        </h1>
        <p className="mt-4 max-w-md text-lg text-zinc-500">
          Track shared costs, split bills evenly or custom, and settle up — all
          in one place.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <a
            href="/register"
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create your first group
          </a>
          <a
            href="/login"
            className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Sign in
          </a>
        </div>
      </main>
    </div>
  );
}
