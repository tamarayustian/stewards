import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-5 py-6 font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-muted sm:px-10">
        <span>Stewards — split expenses, faithfully.</span>
        <nav className="flex flex-wrap items-center gap-4" aria-label="Legal">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <a href="mailto:support@stewards.app" className="hover:text-ink">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
