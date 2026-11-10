'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { createExpense, editExpense } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Money } from '@/components/money';
import { PersonAvatar } from '@/components/person-avatar';
import { FormError } from '@/components/form-message';
import { useAddFriend } from '@/components/use-add-friend';
import { useInviteLink } from '@/components/use-invite-link';
import { CURRENCIES, type Currency, validateCurrency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';
import { fetchExchangeRate } from '@/lib/rates';
import { equalAmounts, formatAmount, totalCents } from '@/lib/splits';

type Mode = 'group' | 'direct';

interface MemberOption {
  id: string;
  name: string;
}

interface GroupOption {
  id: string;
  name: string;
  memberCount: number;
  members: MemberOption[];
}

interface UserOption {
  id: string;
  name: string;
}

export type InitialExpense = {
  id: string;
  groupId: string | null;
  amount: string;
  note: string | null;
  paidById: string;
  participants: Participant[];
  splits: Record<string, string>;
  currency?: Currency;
};

interface Participant {
  id: string;
  name: string;
}

export function AddExpenseForm({
  groups,
  users,
  currentUserId,
  initialExpense,
  homeCurrency = 'HKD',
  returnTo = '/dashboard',
}: {
  groups: GroupOption[];
  users: UserOption[];
  currentUserId: string;
  initialExpense?: InitialExpense;
  homeCurrency?: Currency;
  returnTo?: string;
}) {
  const [mode, setMode] = useState<Mode>(
    initialExpense
      ? initialExpense.groupId
        ? 'group'
        : 'direct'
      : groups.length > 0
        ? 'group'
        : 'direct',
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    initialExpense?.groupId ?? groups[0]?.id ?? '',
  );
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    initialExpense
      ? initialExpense.participants.filter((p) => p.id !== currentUserId).map((p) => p.id)
      : [],
  );
  const [friends, setFriends] = useState<UserOption[]>(users);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [totalAmount, setTotalAmount] = useState(initialExpense?.amount ?? '');
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const initial = { ...(initialExpense?.splits ?? {}) };
    // Legacy expenses may carry a non-zero payer share. The server now rejects
    // one, so start the form from the corrected shape the user has to assign.
    if (initialExpense) initial[initialExpense.paidById] = '0.00';
    return initial;
  });
  const [note, setNote] = useState(initialExpense?.note ?? '');
  const [customized, setCustomized] = useState(Boolean(initialExpense));
  const [payerId, setPayerId] = useState<string>(initialExpense?.paidById ?? currentUserId);
  const [currency, setCurrency] = useState<Currency>(initialExpense?.currency ?? 'HKD');
  const [rateInfo, setRateInfo] = useState<{ rate: number; from: Currency; to: Currency } | null>(
    null,
  );
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(currency !== homeCurrency);
  const [state, action, pending] = useActionState(
    initialExpense ? editExpense : createExpense,
    undefined,
  );
  const friend = useAddFriend((added) => {
    setFriends((prev) => (prev.some((f) => f.id === added.id) ? prev : [...prev, added]));
    setSelectedUsers((prev) => (prev.includes(added.id) ? prev : [...prev, added.id]));
    setShowAddFriend(false);
  });
  const { copied, copyInviteLink } = useInviteLink();

  function copyInviteToClipboard() {
    void copyInviteLink({ name: friend.name, email: friend.email }).then((ok) => {
      if (!ok) friend.setError('Could not copy the link.');
    });
  }
  const router = useRouter();

  useEffect(() => {
    if (currency === homeCurrency) return;

    let cancelled = false;

    fetchExchangeRate(currency, homeCurrency).then((result) => {
      if (cancelled) return;
      setRateLoading(false);
      if ('error' in result) {
        setRateError(result.error);
        setRateInfo(null);
      } else {
        setRateInfo({ rate: result.rate, from: currency, to: homeCurrency });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currency, homeCurrency]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const directParticipants: Participant[] = [
    { id: currentUserId, name: 'You' },
    ...selectedUsers.map((id) => ({
      id,
      name: friends.find((f) => f.id === id)?.name ?? 'Friend',
    })),
  ];

  const groupParticipants: Participant[] = (selectedGroup?.members ?? []).map((m) => ({
    id: m.id,
    name: m.id === currentUserId ? 'You' : m.name,
  }));

  // Editing locks the participant set to the expense's original splits.
  const participants: Participant[] = initialExpense
    ? initialExpense.participants
    : mode === 'group'
      ? groupParticipants
      : directParticipants;

  const payerOptions: Participant[] = [
    { id: currentUserId, name: 'You' },
    ...participants.filter((p) => p.id !== currentUserId),
  ];

  // The payer must be one of the people in the split. Returns the payer id that
  // will be in effect after this change, so the equal split can be spread with
  // it in the same tick: `setPayerId` alone would leave the caller computing the
  // split against the stale id and hand a share to the viewer's read-only row,
  // which is never submitted.
  function resolvePayer(nextParticipants: Participant[]): string {
    if (payerId !== currentUserId && !nextParticipants.some((p) => p.id === payerId)) {
      setPayerId(currentUserId);
      return currentUserId;
    }
    return payerId;
  }

  function chooseMode(next: Mode) {
    setMode(next);
    if (next === 'group') {
      const first = groups[0];
      setSelectedGroupId(first?.id ?? '');
      const rows = (first?.members ?? []).map((m) => ({
        id: m.id,
        name: m.id === currentUserId ? 'You' : m.name,
      }));
      const payer = resolvePayer(rows);
      if (first && !customized) {
        setAmounts(equalAmounts(rows, totalAmount, payer));
      }
    } else {
      const payer = resolvePayer(directParticipants);
      if (!customized) {
        setAmounts(equalAmounts(directParticipants, totalAmount, payer));
      }
    }
  }

  function toggleUser(id: string) {
    const next = selectedUsers.includes(id)
      ? selectedUsers.filter((u) => u !== id)
      : [...selectedUsers, id];

    setSelectedUsers(next);

    const rows: Participant[] = [
      { id: currentUserId, name: 'You' },
      ...next.map((u) => ({ id: u, name: friends.find((f) => f.id === u)?.name ?? 'Friend' })),
    ];

    const payer = resolvePayer(rows);

    if (customized) {
      setAmounts((prev) => {
        const nextAmounts = { ...prev };
        rows.forEach((r) => {
          if (nextAmounts[r.id] === undefined) nextAmounts[r.id] = '0.00';
        });
        return nextAmounts;
      });
    } else {
      setAmounts(equalAmounts(rows, totalAmount, payer));
    }
  }

  function selectGroup(id: string) {
    setSelectedGroupId(id);
    const group = groups.find((g) => g.id === id);
    const rows: Participant[] = (group?.members ?? []).map((m) => ({
      id: m.id,
      name: m.id === currentUserId ? 'You' : m.name,
    }));
    const payer = resolvePayer(rows);
    if (!customized) setAmounts(equalAmounts(rows, totalAmount, payer));
  }

  function handleTotalChange(value: string) {
    setTotalAmount(value);
    if (!customized) setAmounts(equalAmounts(participantsRefresh(), value, payerId));
  }

  function participantsRefresh(): Participant[] {
    if (initialExpense) return participants;
    return mode === 'group'
      ? groupParticipants
      : [
          { id: currentUserId, name: 'You' },
          ...selectedUsers.map((id) => ({
            id,
            name: friends.find((f) => f.id === id)?.name ?? 'Friend',
          })),
        ];
  }

  function splitEquallyNow() {
    setAmounts(equalAmounts(participantsRefresh(), totalAmount, payerId));
    setCustomized(false);
  }

  function handleAmountChange(id: string, value: string) {
    setAmounts((prev) => ({ ...prev, [id]: value }));
    setCustomized(true);
  }

  function presetICoveredIt() {
    const totalStr = formatAmount(totalCentsValue);
    const next: Record<string, string> = {};
    participantsRefresh().forEach((p) => {
      next[p.id] = p.id === currentUserId ? '0.00' : totalStr;
    });
    setAmounts(next);
    setCustomized(true);
  }

  function presetOtherCoveredIt() {
    const rows = participantsRefresh();
    if (rows.length !== 2 || payerId === currentUserId) return;
    const totalStr = formatAmount(totalCentsValue);
    const next: Record<string, string> = {};
    rows.forEach((p) => {
      next[p.id] = p.id === currentUserId ? totalStr : '0.00';
    });
    setAmounts(next);
    setCustomized(true);
  }

  function preventSubmit(event: React.KeyboardEvent) {
    if (event.key === 'Enter') event.preventDefault();
  }

  const addFriendPanel = (
    <div className="mt-2 space-y-2 border border-line bg-soft p-3">
      <p className="eyebrow">Add a friend by name</p>
      <Input
        value={friend.name}
        onChange={(e) => friend.setName(e.target.value)}
        onKeyDown={preventSubmit}
        placeholder="Friend's name"
        aria-label="Friend's name"
      />
      <Input
        value={friend.email}
        onChange={(e) => friend.setEmail(e.target.value)}
        type="email"
        onKeyDown={preventSubmit}
        placeholder="Email (optional — for invite link)"
        aria-label="Friend's email"
      />
      <Input
        value={friend.phone}
        onChange={(e) => friend.setPhone(e.target.value)}
        type="tel"
        onKeyDown={preventSubmit}
        placeholder="Phone (optional — for WhatsApp)"
        aria-label="Friend's phone"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={friend.submit}
          disabled={friend.pending || friend.name.trim().length === 0}
        >
          {friend.pending ? 'Adding...' : 'Add friend'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={copyInviteToClipboard}>
          {copied ? 'Invite link copied' : 'Copy invite link'}
        </Button>
      </div>
      {friend.error && <p className="text-[12px] text-rust">{friend.error}</p>}
    </div>
  );

  // The payer's row is rendered read-only and never submitted, so its amount is
  // not part of the split the server will validate.
  const splitSumCents = participants.reduce(
    (sum, p) => (p.id === payerId ? sum : sum + totalCents(amounts[p.id] ?? '')),
    0,
  );
  const totalCentsValue = totalCents(totalAmount);
  const borrowerCount = participants.filter((p) => p.id !== payerId).length;
  const diff = totalCentsValue - splitSumCents;
  // A payer-only participant set has nothing to assign: the server rejects the
  // resulting 0.00 sum, so say why instead of surfacing that error.
  const noBorrowers = !participants.some((p) => p.id !== payerId);

  const payerName = participants.find((p) => p.id === payerId)?.name ?? 'You';
  const myShareCents = totalCents(amounts[currentUserId] ?? '');
  const others = participants.filter((p) => p.id !== currentUserId);
  const othersShareCents = others.reduce((sum, p) => sum + totalCents(amounts[p.id] ?? ''), 0);

  const balancePreview: string | null =
    payerId === currentUserId
      ? othersShareCents > 0
        ? others.length === 1
          ? `${others[0].name} will owe you ${formatMoney(othersShareCents / 100, currency)}`
          : `Others will owe you ${formatMoney(othersShareCents / 100, currency)}`
        : null
      : myShareCents > 0
        ? `You will owe ${payerName} ${formatMoney(myShareCents / 100, currency)}`
        : null;

  const canICoveredIt = participants.length === 2 && payerId === currentUserId;
  const canOtherCoveredIt = participants.length === 2 && payerId !== currentUserId;

  const previewTone =
    balancePreview === null ? null : payerId === currentUserId ? 'accent' : 'destructive';

  return (
    <form
      action={action}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_346px] lg:items-start"
    >
      {initialExpense && <input type="hidden" name="expenseId" value={initialExpense.id} />}

      <div className="min-w-0 border-t-2 border-ink">
        <section className="border-b border-line py-5">
          <Label htmlFor="amount">Amount</Label>
          <div className="mt-2 flex items-baseline gap-3 border-b border-ink pb-2 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ink">
            <span className="text-[17px] text-ink-muted">{CURRENCIES[currency].symbol}</span>
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
              required
              className="num min-w-0 flex-1 border-0 bg-transparent p-0 text-[52px] leading-none tracking-[-0.06em] text-tangerine outline-none placeholder:text-ink-muted/40"
            />
            <select
              name="currency"
              aria-label="Currency"
              value={currency}
              onChange={(e) => {
                const next = validateCurrency(e.target.value) ?? 'HKD';
                setCurrency(next);
                if (next === homeCurrency) {
                  setRateInfo(null);
                  setRateError(null);
                  setRateLoading(false);
                } else {
                  setRateLoading(true);
                  setRateError(null);
                }
              }}
              className="num shrink-0 border-0 bg-transparent py-1 text-[13px] text-ink-muted outline-none"
            >
              {Object.keys(CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          {rateLoading && <p className="mt-2 text-[11px] text-ink-muted">Fetching exchange rate…</p>}
          {rateError && <p className="mt-2 text-[11px] text-rust">{rateError}</p>}
          {rateInfo && (
            <p className="mt-2 text-[11px] text-ink-muted">
              Rate: 1 {CURRENCIES[rateInfo.from].name} = {rateInfo.rate}{' '}
              {CURRENCIES[rateInfo.to].name}
            </p>
          )}
        </section>

        <section className="border-b border-line py-5">
          <Label htmlFor="note">Description</Label>
          <Input
            id="note"
            name="note"
            type="text"
            placeholder="Dinner at the cafe"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2"
          />
        </section>

        {!initialExpense && (
          <section className="border-b border-line py-5">
            <Label>Split with</Label>
            <div role="radiogroup" aria-label="Split with" className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'group'}
                onClick={() => chooseMode('group')}
                className={`flex items-center justify-center rounded-[7px] px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
                  mode === 'group'
                    ? 'bg-ink text-paper'
                    : 'border border-line-strong text-ink-muted hover:bg-soft hover:text-ink'
                }`}
              >
                In a group
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'direct'}
                onClick={() => chooseMode('direct')}
                className={`flex items-center justify-center rounded-[7px] px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
                  mode === 'direct'
                    ? 'bg-ink text-paper'
                    : 'border border-line-strong text-ink-muted hover:bg-soft hover:text-ink'
                }`}
              >
                Direct
              </button>
            </div>
          </section>
        )}

        {!initialExpense && mode === 'group' && (
          <section className="border-b border-line py-5">
            <Label htmlFor="groupId">Group</Label>
            <Select
              id="groupId"
              variant="compact"
              name="groupId"
              className="mt-2"
              value={selectedGroupId}
              onChange={(e) => selectGroup(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                </option>
              ))}
            </Select>
          </section>
        )}

        {!initialExpense && mode === 'direct' && (
          <section className="border-b border-line py-5">
            <Label>Split with</Label>
            <p className="mt-1 text-[11px] text-ink-muted">
              You&apos;re included automatically. Select{' '}
              {selectedUsers.length === 0 ? '1+ friends' : 'more friends'} to split with.
            </p>

            {friends.length > 0 ? (
              <>
                <div className="mt-3 max-h-56 divide-y divide-line overflow-y-auto border-y border-line">
                  {friends.map((u) => {
                    const checked = selectedUsers.includes(u.id);
                    const share = totalCents(amounts[u.id] ?? '') / 100;
                    return (
                      <label
                        key={u.id}
                        className={`flex cursor-pointer items-center gap-3 py-2.5 text-[13px] transition-opacity ${
                          checked ? 'text-ink' : 'text-ink-muted opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="participantId"
                          value={u.id}
                          checked={checked}
                          onChange={() => toggleUser(u.id)}
                          className="size-4 accent-cobalt"
                        />
                        <PersonAvatar name={u.name} size="xs" />
                        <span className="min-w-0 flex-1 truncate">{u.name}</span>
                        {checked && <Money amount={share} currency={currency} className="text-[12px]" />}
                      </label>
                    );
                  })}
                </div>
                {showAddFriend ? (
                  addFriendPanel
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddFriend(true)}
                    className="mt-2 text-cobalt"
                  >
                    Add a friend by name
                  </Button>
                )}
              </>
            ) : (
              <div className="mt-3 border border-dashed border-line-strong px-4 py-5 text-center">
                <p className="text-[13px] font-medium text-ink">No one to split with yet</p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Add people on the People page, or add a friend by name below.
                </p>
                <div className="mt-3 text-left">{addFriendPanel}</div>
              </div>
            )}
          </section>
        )}

        <section className="border-b border-line py-5">
          <Label htmlFor="paidBy">Who paid?</Label>
          <Select
            id="paidBy"
            variant="compact"
            name="paidById"
            className="mt-2"
            value={payerId}
            onChange={(e) => {
              const next = e.target.value;
              setPayerId(next);
              setAmounts((prev) =>
                customized
                  ? { ...prev, [next]: '0.00' }
                  : equalAmounts(participantsRefresh(), totalAmount, next),
              );
            }}
          >
            {payerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </section>

        <section className="border-b border-line py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>Split</Label>
            <span className="text-[11px] text-ink-muted">
              Each amount is what that person owes back to {payerName}.
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {canICoveredIt && (
              <Button type="button" variant="outline" size="sm" onClick={presetICoveredIt}>
                I covered it
              </Button>
            )}
            {canOtherCoveredIt && (
              <Button type="button" variant="outline" size="sm" onClick={presetOtherCoveredIt}>
                {payerName} covered it
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={splitEquallyNow}>
              Split equally
            </Button>
          </div>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {participants.map((p) =>
              p.id === payerId ? (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <PersonAvatar name={p.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}</span>
                  <span className="num text-[11px] text-ink-muted">
                    Paid · {CURRENCIES[currency].symbol}0.00
                  </span>
                </div>
              ) : (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <PersonAvatar name={p.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-ink-muted">{CURRENCIES[currency].symbol}</span>
                    <input
                      name={`amount_${p.id}`}
                      type="text"
                      inputMode="decimal"
                      value={amounts[p.id] ?? ''}
                      onChange={(e) => handleAmountChange(p.id, e.target.value)}
                      placeholder="0.00"
                      aria-label={`${p.name}'s share`}
                      className="num w-24 border-0 bg-transparent p-0 text-right text-[13px] text-ink outline-none placeholder:text-ink-muted/40"
                    />
                  </div>
                </div>
              ),
            )}
          </div>
          {balancePreview && (
            <p
              className={`mt-3 px-3 py-2 text-[12.5px] font-medium ${
                previewTone === 'accent' ? 'bg-sage/10 text-sage' : 'bg-rust/10 text-rust'
              }`}
            >
              {balancePreview}
            </p>
          )}
          {noBorrowers ? (
            <p className="mt-3 border border-line bg-soft px-3 py-2 text-[12px] text-ink-muted">
              There&apos;s nobody to share this with yet — add or invite someone first.
            </p>
          ) : diff !== 0 ? (
            <p className={`mt-3 text-[11px] ${diff > 0 ? 'text-ink-muted' : 'text-rust'}`}>
              {diff > 0
                ? `${formatAmount(diff)} left to assign — splits total ${formatAmount(
                    splitSumCents,
                  )} of ${formatAmount(totalCentsValue)}.`
                : `Splits total ${formatAmount(splitSumCents)} — that's ${formatAmount(
                    Math.abs(diff),
                  )} over the amount.`}
            </p>
          ) : null}
        </section>

        <div className="py-5">
          <FormError message={state?.error} />
        </div>
      </div>

      <aside className="border-t-2 border-cobalt bg-tint p-5 lg:sticky lg:top-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow text-cobalt">The split</span>
          <span className="num text-[10px] text-ink-muted">{participants.length} ways</span>
        </div>
        <p className="eyebrow mt-5">Each pays</p>
        <Money
          amount={totalCentsValue / 100 / Math.max(1, borrowerCount)}
          currency={currency}
          className="mt-1 block text-[29px] leading-none text-ink"
        />
        <div className="mt-5 divide-y divide-line border-y border-line">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5">
              <PersonAvatar name={p.name} size="xs" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.name}</span>
              <span className="eyebrow">
                {p.id === currentUserId ? 'You' : initialExpense?.groupId || mode === 'group' ? 'Group' : 'Direct'}
              </span>
              <Money
                amount={p.id === payerId ? 0 : totalCents(amounts[p.id] ?? '') / 100}
                currency={currency}
                className="text-[13px] text-ink"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2 text-[11px] text-ink-muted">
          <span>Total</span>
          <Money amount={totalCentsValue / 100} currency={currency} className="text-[11px]" />
        </div>
        <p className="mt-1 text-[10px] leading-snug text-ink-muted">
          Remainder cents are assigned automatically when the split doesn&apos;t divide evenly.
        </p>

        {rateInfo && (
          <>
            <input type="hidden" name="rate" value={String(rateInfo.rate)} />
            <input type="hidden" name="rateCurrency" value={rateInfo.from} />
          </>
        )}

        <Button type="submit" disabled={pending || noBorrowers} className="mt-5 w-full">
          {initialExpense
            ? pending
              ? 'Saving changes...'
              : 'Save changes'
            : pending
              ? 'Splitting...'
              : 'Save expense'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => router.push(returnTo)}
        >
          Cancel
        </Button>
      </aside>
    </form>
  );
}
