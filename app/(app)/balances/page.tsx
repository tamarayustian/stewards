import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { BalanceList } from '@/components/balance-list';
import { getPairBalances, getPairDetail, listReminders } from '@/lib/balances';
import { type Currency } from '@/lib/currencies';
import db from '@/lib/db';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function BalancesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [pairs, reminders] = await Promise.all([getPairBalances(user.id), listReminders(user.id)]);

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { currency: true } });
  const userCurrency = (profile?.currency ?? 'HKD') as Currency;

  const rows = await Promise.all(
    pairs.map(async (pair) => {
      const canWhatsApp = Boolean(pair.counterparty.phone) && pair.amountOwedToMe.gt(0);
      const detail = canWhatsApp ? await getPairDetail(user.id, pair.counterparty.id) : null;
      return { pair, detail };
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Balances</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What each person owes you and what you owe them.
        </p>
      </div>

      <BalanceList reminders={reminders} rows={rows} userCurrency={userCurrency} />
    </div>
  );
}
