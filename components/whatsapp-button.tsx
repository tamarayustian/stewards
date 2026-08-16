'use client';

import { MessageCircle } from 'lucide-react';

import { buildWhatsAppDraft, waMeNumber, type PairItem } from '@/lib/balance-math';
import { Button } from '@/components/ui/button';

export function WhatsAppButton({
  name,
  phone,
  items,
}: {
  name: string;
  phone: string;
  items: PairItem[];
}) {
  function openWhatsApp() {
    const draft = buildWhatsAppDraft(name, items, window.location.origin);
    const url = `https://wa.me/${waMeNumber(phone)}?text=${encodeURIComponent(draft)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={openWhatsApp} className="gap-1.5">
      <MessageCircle className="size-3.5" />
      WhatsApp
    </Button>
  );
}
