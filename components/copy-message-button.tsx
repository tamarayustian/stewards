'use client';

import { Copy } from 'lucide-react';

import { useToast } from '@/components/toast';
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
  const { toast } = useToast();

  async function copyMessage() {
    const draft = buildWhatsAppDraft(name, items, window.location.origin, viewerCurrency);
    try {
      await navigator.clipboard.writeText(draft);
      toast({ title: 'Copied to clipboard', variant: 'success' });
    } catch {
      toast({ title: 'Could not copy', variant: 'error' });
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copyMessage} className="gap-1.5">
      <Copy className="size-3.5" />
      Copy message
    </Button>
  );
}
