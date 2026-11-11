import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signout } from '@/app/auth/actions';
import { EmailCard, PasswordCard } from '@/components/account-card';
import { ConfirmAction } from '@/components/confirm-action';
import { CurrencyCard } from '@/components/currency-card';
import { FeedbackCard } from '@/components/feedback-card';
import { InviteFriend } from '@/components/invite-friend';
import { PageHead } from '@/components/page-head';
import { ProfileCard } from '@/components/profile-card';
import { SettingsBlock } from '@/components/settings-block';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import type { Currency } from '@/lib/currencies';
import db from '@/lib/db';

const indexItems = [
  { id: 'profile', number: '01', label: 'Profile' },
  { id: 'email', number: '02', label: 'Email' },
  { id: 'password', number: '03', label: 'Password' },
  { id: 'currency', number: '04', label: 'Currency' },
  { id: 'invite', number: '05', label: 'Invite' },
  { id: 'feedback', number: '06', label: 'Feedback' },
  { id: 'signout', number: '07', label: 'Sign out' },
];

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true, currency: true },
  });

  const name = profile?.name ?? (user.user_metadata?.name as string | undefined) ?? 'You';
  const email = profile?.email ?? user.email ?? null;
  const phone = profile?.phone ?? null;
  const currency = (profile?.currency ?? 'HKD') as Currency;

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow={`Settings · ${name}`}
        title="A tab with your name on it."
        sub="Your details, your currency, your record."
        actions={
          <Link href="/dashboard" className="eyebrow whitespace-nowrap text-cobalt hover:underline">
            ← Back to ledger
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <p className="eyebrow">Sections</p>
          <ul className="mt-3 flex gap-5 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
            {indexItems.map((item) => (
              <li key={item.id} className="shrink-0 lg:border-t lg:border-line">
                <a
                  href={`#${item.id}`}
                  className="flex items-center gap-3 py-2 text-[12.5px] text-body transition-colors hover:text-ink"
                >
                  <span className="num text-[9px] text-cobalt">{item.number}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <SettingsBlock
            id="profile"
            number="01"
            title="Profile"
            description="Your name and phone number. Used when friends add you to a tab."
          >
            <ProfileCard name={name} phone={phone} />
          </SettingsBlock>

          <SettingsBlock
            id="email"
            number="02"
            title="Email"
            description="Change the address you sign in with. We send a confirmation link first."
          >
            <EmailCard email={email} />
          </SettingsBlock>

          <SettingsBlock
            id="password"
            number="03"
            title="Password"
            description="Choose a new password. At least six characters."
          >
            <PasswordCard />
          </SettingsBlock>

          <SettingsBlock
            id="currency"
            number="04"
            title="Currency"
            description="Your home currency. Every balance is shown in it."
          >
            <CurrencyCard currentCurrency={currency} />
          </SettingsBlock>

          <SettingsBlock
            id="invite"
            number="05"
            title="Invite a friend"
            description="Copy a sign-up link with a friend's details pre-filled."
          >
            <InviteFriend bare />
          </SettingsBlock>

          <SettingsBlock
            id="feedback"
            number="06"
            title="Feedback"
            description="Tell us what is working, what is broken, or what is missing."
          >
            <FeedbackCard email={email ?? ''} />
          </SettingsBlock>

          <SettingsBlock
            id="signout"
            number="07"
            title="Sign out"
            description="End this session on this device. Your ledger stays where it is."
          >
            <ConfirmAction
              action={signout}
              fields={[]}
              title="Sign out?"
              description="You can sign back in at any time."
              confirmLabel="Sign out"
              pendingLabel="Signing out…"
              trigger={
                <Button type="button" variant="outline" className="text-rust">
                  Sign out
                </Button>
              }
            />
          </SettingsBlock>
        </div>
      </div>
    </div>
  );
}
