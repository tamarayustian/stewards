import type { ReactNode } from 'react';
import type { Counterparty, PairItem } from '@/lib/balance-math';
import type { Currency } from '@/lib/currencies';
import { RemindButton } from '@/components/remind-button';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { CopyMessageButton } from '@/components/copy-message-button';
import { AddPhoneForm } from '@/components/add-phone-form';

interface CounterpartyActionsProps {
  hasOwedToMe: boolean;
  counterparty: Counterparty;
  items: PairItem[];
  viewerCurrency?: Currency;
  children?: ReactNode;
}

export function CounterpartyActions({
  hasOwedToMe,
  counterparty,
  items,
  viewerCurrency,
  children,
}: CounterpartyActionsProps) {
  if (!hasOwedToMe) return null;
  return (
    <>
      {counterparty.isRegistered ? (
        <>
          {counterparty.phone ? (
            <WhatsAppButton
              name={counterparty.name}
              phone={counterparty.phone}
              items={items}
              viewerCurrency={viewerCurrency}
            />
          ) : (
            <RemindButton toId={counterparty.id} />
          )}
        </>
      ) : counterparty.phone ? (
        <CopyMessageButton
          name={counterparty.name}
          items={items}
          viewerCurrency={viewerCurrency}
        />
      ) : (
        <AddPhoneForm userId={counterparty.id} />
      )}
      {children}
    </>
  );
}
