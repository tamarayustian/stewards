import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { claimGhost, declineGhost } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { listPendingClaims } from '@/lib/claims';
import { createServerClientReadOnly } from '@/lib/supabase';

async function onSubmitClaim(formData: FormData) {
  'use server';
  await claimGhost({}, formData);
}

async function onSubmitDecline(formData: FormData) {
  'use server';
  await declineGhost({}, formData);
}

export default async function ClaimPage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const claims = await listPendingClaims(user.id);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">{claims.length > 0 ? 'Is this you?' : 'You\u2019re all set'}</h1>
      <p className="text-sm text-muted-foreground">
        {claims.length > 0
          ? 'These contacts were added before you joined. Claim the ones that are you to bring your expenses together.'
          : 'Nothing to claim \u2014 your account is ready.'}
      </p>

      {claims.length > 0 ? (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.claimId} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div>
                <p className="text-sm font-medium">{claim.ghostName}</p>
                <p className="text-xs text-muted-foreground">
                  {claim.adderName ? `Added by ${claim.adderName}` : 'Contact record'} ·{' '}
                  {claim.sharedExpenseCount} shared {claim.sharedExpenseCount === 1 ? 'expense' : 'expenses'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={onSubmitClaim}>
                  <input type="hidden" name="claimId" value={claim.claimId} />
                  <Button type="submit">That&apos;s me</Button>
                </form>
                <form action={onSubmitDecline}>
                  <input type="hidden" name="claimId" value={claim.claimId} />
                  <Button type="submit" variant="outline">
                    Not me
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          Continue
        </Button>
      )}
    </div>
  );
}
