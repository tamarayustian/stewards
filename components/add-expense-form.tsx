'use client';

import { Link2, ReceiptText, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition } from 'react';

import { addFriend, createExpense, editExpense } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CURRENCIES, type Currency, validateCurrency } from '@/lib/currencies';
import { formatMoney } from '@/lib/money';
import { fetchExchangeRate } from '@/lib/rates';

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

function totalCents(value: string): number {
  const n = Math.round(parseFloat(value || '0') * 100);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Even split over participants; any rounding remainder lands on the last person.
function equalAmounts(participants: Participant[], amount: string): Record<string, string> {
  const total = totalCents(amount);
  const n = participants.length;
  if (n === 0) return {};

  const base = Math.floor(total / n);
  const remainder = total - base * n;

  const out: Record<string, string> = {};
  participants.forEach((p, index) => {
    out[p.id] = formatAmount(index === n - 1 ? base + remainder : base);
  });
  return out;
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
  const [friendName, setFriendName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [totalAmount, setTotalAmount] = useState(initialExpense?.amount ?? '');
  const [amounts, setAmounts] = useState<Record<string, string>>(initialExpense?.splits ?? {});
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
  const [addPending, startAddTransition] = useTransition();
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

  function resetPayerIfMissing(nextParticipants: Participant[]) {
    if (payerId !== currentUserId && !nextParticipants.some((p) => p.id === payerId)) {
      setPayerId(currentUserId);
    }
  }

  function chooseMode(next: Mode) {
    setMode(next);
    if (next === 'group') {
      const first = groups[0];
      setSelectedGroupId(first?.id ?? '');
      if (first && !customized) {
        const rows = (first.members ?? []).map((m) => ({
          id: m.id,
          name: m.id === currentUserId ? 'You' : m.name,
        }));
        setAmounts(equalAmounts(rows, totalAmount));
      }
    } else if (!customized) {
      setAmounts(equalAmounts(directParticipants, totalAmount));
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

    resetPayerIfMissing(rows);

    if (customized) {
      setAmounts((prev) => {
        const nextAmounts = { ...prev };
        rows.forEach((r) => {
          if (nextAmounts[r.id] === undefined) nextAmounts[r.id] = '0.00';
        });
        return nextAmounts;
      });
    } else {
      setAmounts(equalAmounts(rows, totalAmount));
    }
  }

  function selectGroup(id: string) {
    setSelectedGroupId(id);
    const group = groups.find((g) => g.id === id);
    const rows: Participant[] = (group?.members ?? []).map((m) => ({
      id: m.id,
      name: m.id === currentUserId ? 'You' : m.name,
    }));
    resetPayerIfMissing(rows);
    if (!customized) setAmounts(equalAmounts(rows, totalAmount));
  }

  function handleTotalChange(value: string) {
    setTotalAmount(value);
    if (!customized) setAmounts(equalAmounts(participantsRefresh(), value));
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
    setAmounts(equalAmounts(participantsRefresh(), totalAmount));
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

  function handleAddFriend() {
    const fd = new FormData();
    fd.set('name', friendName);
    if (friendEmail.trim()) fd.set('email', friendEmail.trim());
    if (friendPhone.trim()) fd.set('phone', friendPhone.trim());

    startAddTransition(async () => {
      const result = await addFriend(fd);
      if (result?.contact) {
        const added = result.contact;
        setFriends((prev) => (prev.some((f) => f.id === added.id) ? prev : [...prev, added]));
        setSelectedUsers((prev) => (prev.includes(added.id) ? prev : [...prev, added.id]));
        setFriendName('');
        setFriendEmail('');
        setFriendPhone('');
        setAddError(null);
        setShowAddFriend(false);
      } else if (result?.error) {
        setAddError(result.error);
      }
    });
  }

  function copyInviteLink() {
    const url = new URL('/register', window.location.href);
    if (friendEmail.trim()) url.searchParams.set('email', friendEmail.trim());
    if (friendName.trim()) url.searchParams.set('name', friendName.trim());
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      })
      .catch(() => setAddError('Could not copy the link.'));
  }

  function preventSubmit(event: React.KeyboardEvent) {
    if (event.key === 'Enter') event.preventDefault();
  }

  const addFriendPanel = (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3 ring-1 ring-border">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <UserPlus className="size-3.5" />
        Add a friend by name
      </p>
      <Input
        value={friendName}
        onChange={(e) => setFriendName(e.target.value)}
        onKeyDown={preventSubmit}
        placeholder="Friend's name"
        aria-label="Friend's name"
      />
      <Input
        value={friendEmail}
        onChange={(e) => setFriendEmail(e.target.value)}
        type="email"
        onKeyDown={preventSubmit}
        placeholder="Email (optional — for invite link)"
        aria-label="Friend's email"
      />
      <Input
        value={friendPhone}
        onChange={(e) => setFriendPhone(e.target.value)}
        type="tel"
        onKeyDown={preventSubmit}
        placeholder="Phone (optional — for WhatsApp)"
        aria-label="Friend's phone"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleAddFriend}
          disabled={addPending || friendName.trim().length === 0}
        >
          {addPending ? 'Adding...' : 'Add friend'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={copyInviteLink}>
          <Link2 className="size-3.5" />
          {inviteCopied ? 'Invite link copied' : 'Copy invite link'}
        </Button>
      </div>
      {addError && <p className="text-sm text-destructive">{addError}</p>}
    </div>
  );

  const splitSumCents = participants.reduce((sum, p) => sum + totalCents(amounts[p.id] ?? ''), 0);
  const totalCentsValue = totalCents(totalAmount);
  const diff = totalCentsValue - splitSumCents;

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
    <div className="flex flex-1 justify-center p-6">
      <Card className="w-full max-w-md self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="size-5 text-primary" />
            {initialExpense ? 'Edit expense' : 'Add an expense'}
          </CardTitle>
          <CardDescription>
            {initialExpense
              ? 'Update the amount, who paid, or the split amounts.'
              : 'Split a shared cost with a group or directly with friends.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            {initialExpense && <input type="hidden" name="expenseId" value={initialExpense.id} />}

            {/* Mode selector */}
            {!initialExpense && (
              <div role="radiogroup" aria-label="Split with" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'group'}
                  onClick={() => chooseMode('group')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ring-1 transition-colors ${
                    mode === 'group'
                      ? 'bg-primary/10 text-primary ring-primary/30'
                      : 'text-muted-foreground ring-border hover:bg-muted'
                  }`}
                >
                  <Users className="size-4" />
                  In a group
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'direct'}
                  onClick={() => chooseMode('direct')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ring-1 transition-colors ${
                    mode === 'direct'
                      ? 'bg-primary/10 text-primary ring-primary/30'
                      : 'text-muted-foreground ring-border hover:bg-muted'
                  }`}
                >
                  <ReceiptText className="size-4" />
                  Direct
                </button>
              </div>
            )}

            {/* Group picker */}
            {!initialExpense && mode === 'group' && (
              <div className="space-y-2">
                <Label>Group</Label>
                <select
                  name="groupId"
                  value={selectedGroupId}
                  onChange={(e) => selectGroup(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direct friend picker */}
            {!initialExpense && mode === 'direct' && (
              <div className="space-y-2">
                <Label>Split with</Label>
                <p className="text-xs text-muted-foreground">
                  You&apos;re included automatically. Select{' '}
                  {selectedUsers.length === 0 ? '1+ friends' : 'more friends'} to split with.
                </p>

                {friends.length > 0 ? (
                  <>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {friends.map((u) => {
                        const checked = selectedUsers.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ring-1 transition-colors ${
                              checked
                                ? 'bg-primary/10 text-foreground ring-primary/30'
                                : 'text-muted-foreground ring-border hover:bg-muted'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="participantId"
                              value={u.id}
                              checked={checked}
                              onChange={() => toggleUser(u.id)}
                              className="size-4 accent-primary"
                            />
                            {u.name}
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
                        className="text-primary"
                      >
                        <UserPlus className="size-3.5" />
                        Add a friend by name
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 rounded-lg border border-dashed px-4 py-5 text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                      <Users className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No one to split with yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add people on the People page, or add a friend by name below.
                    </p>
                    {addFriendPanel}
                  </div>
                )}
              </div>
            )}

            {/* Who paid */}
            <div className="space-y-2">
              <Label htmlFor="paidBy">Who paid?</Label>
              <select
                id="paidBy"
                name="paidById"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {payerOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  {CURRENCIES[currency].symbol}
                </span>
                <Input
                  id="amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-6"
                  value={totalAmount}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
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
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.symbol} — {info.name}
                  </option>
                ))}
              </select>
              {rateLoading && (
                <p className="text-xs text-muted-foreground">Fetching exchange rate…</p>
              )}
              {rateError && <p className="text-xs text-destructive">{rateError}</p>}
              {rateInfo && (
                <p className="text-xs text-muted-foreground">
                  Rate: 1 {CURRENCIES[rateInfo.from].name} = {rateInfo.rate}{' '}
                  {CURRENCIES[rateInfo.to].name}
                </p>
              )}
            </div>

            {/* Split */}
            <div className="space-y-2">
              <Label>Split</Label>
              <p className="text-xs text-muted-foreground">
                Each amount is what that person owes back to {payerName}.
              </p>
              <div className="flex flex-wrap gap-1.5">
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
              <div className="space-y-1">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    <div className="relative w-28">
                      <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                        {CURRENCIES[currency].symbol}
                      </span>
                      <Input
                        name={`amount_${p.id}`}
                        type="text"
                        inputMode="decimal"
                        value={amounts[p.id] ?? ''}
                        onChange={(e) => handleAmountChange(p.id, e.target.value)}
                        placeholder="0.00"
                        className="h-8 pl-6 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {balancePreview && (
                <p
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 ${
                    previewTone === 'accent'
                      ? 'bg-accent/10 text-accent ring-accent/20'
                      : 'bg-destructive/10 text-destructive ring-destructive/20'
                  }`}
                >
                  {balancePreview}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                name="note"
                type="text"
                placeholder="Dinner at the cafe"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {diff !== 0 && (
              <p className={`text-xs ${diff > 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                {diff > 0
                  ? `${formatAmount(diff)} left to assign — splits total ${formatAmount(
                      splitSumCents,
                    )} of ${formatAmount(totalCentsValue)}.`
                  : `Splits total ${formatAmount(splitSumCents)} — that's ${formatAmount(
                      Math.abs(diff),
                    )} over the amount.`}
              </p>
            )}

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

            {rateInfo && (
              <>
                <input type="hidden" name="rate" value={String(rateInfo.rate)} />
                <input type="hidden" name="rateCurrency" value={rateInfo.from} />
              </>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {initialExpense
                ? pending
                  ? 'Saving changes...'
                  : 'Save changes'
                : pending
                  ? 'Adding expense...'
                  : 'Add expense'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push(returnTo)}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
