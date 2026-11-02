import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span className="font-heading text-walnut">Stewards</span>
        <span>— split expenses, faithfully.</span>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms &amp; Conditions
        </Link>
        <a href="mailto:support@stewards.app" className="hover:text-foreground">
          Contact
        </a>
      </div>
    </footer>
  );
}
