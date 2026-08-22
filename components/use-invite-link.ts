'use client';

import { useState } from 'react';
import { buildInviteUrl, copyText } from '@/lib/friends';

export function useInviteLink() {
  const [copied, setCopied] = useState(false);

  async function copyInviteLink(input: { name: string; email: string }): Promise<boolean> {
    const url = buildInviteUrl(input.name, input.email, window.location.href);
    const ok = await copyText(url.toString());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    return ok;
  }

  return { copied, copyInviteLink };
}
