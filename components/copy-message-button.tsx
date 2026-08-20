'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { buildWhatsAppDraft, type PairItem } from '@/lib/balance-math';
import { type Currency } from '@/lib/currencies';
import { Button } from '@/components/ui/button';

export function CopyMessageButton({
  name,
  items,
  viewerCurrency,
}: {
  name: string;
  items: PairItem[];
  viewerCurrency?: Currency;
}) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    const draft = buildWhatsAppDraft(name, items, window.location.origin, viewerCurrency);
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copyMessage}
      className="gap-1.5"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied!' : 'Copy message'}
    </Button>
  );
}
