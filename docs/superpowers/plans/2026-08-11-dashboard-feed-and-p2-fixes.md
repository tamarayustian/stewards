# Dashboard Feed & P2 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining critique backlog: reversible settle, feed filter tabs, 44px touch targets, a11y error announcements, honest delete copy, and the small polish items — in five independent tasks.

**Architecture:** All changes are server-rendered except the new `MarkUnpaidButton` (a `useActionState` chip mirroring `SettleExpenseButton`). Filters are **server-side** via `?filter=` `searchParams` + a `filter` param on `getActivity` — no server→client serialization of `Prisma.Decimal`, no client-component extraction. Tap targets use a pure-CSS `after:` pseudo-element expansion (visual size unchanged, hit area 44px).

**Tech Stack:** Next.js 16, Prisma 7, Tailwind v4, base-ui (`render` prop, never `asChild`).

## Global Constraints

- **No test framework.** Test cycle per task: `pnpm exec tsc --noEmit` · `pnpm exec eslint <changed-files>` · `pnpm exec prettier --check <changed-files>` (run `--write` if drift) · final `pnpm build` (expect 11 routes, incl. Proxy).
- No new `text-[…rem]` arbitrary values — tokens only (`text-xs` = 0.75rem caption, `size-*`, etc.).
- `formatMoney(amount: Prisma.Decimal, currency = 'HKD')` signature unchanged; all amounts stay `Prisma.Decimal` on the server.
- `react-hooks/set-state-in-effect` is an **error** — never setState inside useEffect.
- Keep `getActivity`'s base guards intact: `deletedAt: null`, group not deleted, user involved (`paidById` or split).
- Expense mutations revalidate `/dashboard`, `/groups`, and `/groups/{groupId}`.
- Lowercase conventional commits. Sequential tasks (never parallel implementers); Task N starts from Task N-1's head.

---

### Task 1: Un-settle reversal — "Mark unpaid" toggle

**Files:**
- Modify: `app/(app)/actions.ts` (after `settleExpense`, ~line 225)
- Modify: `components/settle-expense-button.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

**Produces:** `unsettleExpense` action, `MarkUnpaidButton` component (replaces `PaidChip`), chip moved out of the truncating note paragraph.

**Interfaces:**
- Consumes: existing `settleExpense` guard pattern, `SettleExpenseButton`'s `useActionState` chip pattern, `ActivityItem.myShare`/`hasSettled`/`unsettled` fields.
- Produces: `unsettleExpense(_prev: unknown, formData: FormData)`; `MarkUnpaidButton({ expenseId }: { expenseId: string })`.

- [ ] **Step 1** — Add `unsettleExpense` (mirror of `settleExpense`, guard `settledAt: { not: null }`, writes `settledAt: null`):

```ts
// Reverts a mistaken 'Mark paid': clears settledAt on the current user's split.
export async function unsettleExpense(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const expenseId = formData.get('expenseId') as string;
  const expense = await db.expense.findFirst({
    where: {
      id: expenseId,
      deletedAt: null,
      paidById: { not: user.id },
      splits: { some: { userId: user.id, settledAt: { not: null }, amount: { gt: 0 } } },
      OR: [{ groupId: null }, { group: { deletedAt: null } }],
    },
    select: { groupId: true },
  });
  if (!expense) {
    return { error: 'Nothing to un-settle on this expense.' };
  }
  await db.expenseSplit.update({
    where: { expenseId_userId: { expenseId, userId: user.id } },
    data: { settledAt: null },
  });
  revalidatePath('/dashboard');
  revalidatePath('/groups');
  if (expense.groupId) {
    revalidatePath(`/groups/${expense.groupId}`);
  }
}
```

- [ ] **Step 2** — In `components/settle-expense-button.tsx`: import `unsettleExpense`; **remove `PaidChip`**; add `MarkUnpaidButton`:

```tsx
export function MarkUnpaidButton({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(unsettleExpense, undefined);
  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="relative h-6 rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground after:absolute after:-inset-2.5 after:content-['']"
        disabled={pending}
        title="Mark this share as unpaid"
      >
        <CheckCheck className="size-3" />
        {pending ? 'Marking…' : 'paid'}
      </Button>
      {state?.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}
```

- [ ] **Step 3** — Dashboard: import `{ MarkUnpaidButton, SettleExpenseButton }` (drop `PaidChip`). Replace the title `<p>` (lines 111–124) with a flex line that keeps the note truncating while the chip stays visible:

```tsx
<div className="min-w-0 flex-1">
  <div className="flex min-w-0 items-center gap-2">
    <p className="min-w-0 truncate text-sm font-medium">{item.note ?? item.context}</p>
    {!item.isPayer && item.unsettled && item.myShare.gt(0) && (
      <span className="shrink-0">
        <SettleExpenseButton expenseId={item.id} />
      </span>
    )}
    {!item.isPayer && !item.unsettled && item.hasSettled && (
      <span className="shrink-0">
        <MarkUnpaidButton expenseId={item.id} />
      </span>
    )}
  </div>
  <p className="truncate text-xs text-muted-foreground">
    {item.isPayer ? 'You paid' : `${item.paidByName} paid`} · {item.context} ·{' '}
    {timeAgo(item.createdAt)}
  </p>
</div>
```

- [ ] **Step 4** — Gate: `pnpm exec tsc --noEmit`, `pnpm exec eslint` (3 files), `pnpm exec prettier --check` (3 files).
- [ ] **Step 5** — Commit: `feat: allow marking a share unpaid`.

---

### Task 2: Feed filter tabs (server-side)

**Files:**
- Modify: `lib/expenses.ts`
- Modify: `app/(app)/dashboard/page.tsx`

**Consumes:** unchanged `ActivityItem`. **Produces:** `ActivityFilter` type, `getActivity(userId, filter, take)`.

- [ ] **Step 1** — In `lib/expenses.ts`, add type + filter clause to `getActivity`:

```ts
export type ActivityFilter = 'all' | 'owe' | 'owed' | 'paid';

export async function getActivity(
  userId: string,
  filter: ActivityFilter = 'all',
  take = 20,
): Promise<ActivityItem[]> {
  const baseAnd = [
    { OR: [{ groupId: null }, { group: { deletedAt: null } }] },
    { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
  ];
  let filterClause: Prisma.ExpenseWhereInput | null = null;
  switch (filter) {
    case 'owe':
      filterClause = {
        paidById: { not: userId },
        splits: { some: { userId, settledAt: null, amount: { gt: 0 } } },
      };
      break;
    case 'owed':
      filterClause = {
        paidById: userId,
        splits: { some: { settledAt: null, amount: { gt: 0 }, userId: { not: userId } } },
      };
      break;
    case 'paid':
      filterClause = {
        OR: [
          { paidById: { not: userId }, splits: { some: { userId, settledAt: { not: null } } } },
          { paidById: userId, splits: { none: { settledAt: null, amount: { gt: 0 } } } },
        ],
      };
      break;
  }
  const expenses = await db.expense.findMany({
    where: { deletedAt: null, AND: filterClause ? [...baseAnd, filterClause] : baseAnd },
    include: {
      paidBy: { select: { name: true } },
      group: { select: { name: true } },
      splits: { where: { userId }, select: { settledAt: true, amount: true } },
      _count: { select: { splits: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
  // mapping to ActivityItem unchanged
}
```

- [ ] **Step 2** — Dashboard: page signature becomes `DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> })`. Derive `const filter: ActivityFilter = filterParam === 'owe' || filterParam === 'owed' || filterParam === 'paid' ? filterParam : 'all';` (validate the raw string; invalid → 'all'). Pass `filter` to `getActivity`. Render a segmented control (only when `hasActivity`) above the list:

```tsx
<div className="mt-3 flex w-fit gap-1 rounded-lg bg-muted p-1">
  {[
    { key: 'all', label: 'All' },
    { key: 'owe', label: 'You owe' },
    { key: 'owed', label: 'Owed to you' },
    { key: 'paid', label: 'Paid' },
  ].map((f) => (
    <Link
      key={f.key}
      href={f.key === 'all' ? '/dashboard' : `/dashboard?filter=${f.key}`}
      className={`rounded-md px-3 py-1 text-xs font-medium ${
        filter === f.key
          ? 'bg-card text-foreground ring-1 ring-foreground/10'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {f.label}
    </Link>
  ))}
</div>
```

When `filter !== 'all' && activity.length === 0`, render a slim empty Card ("Nothing here" + per-filter line: `filter === 'owe'` → "You don't owe anything right now." / `filter === 'owed'` → "No one owes you right now." / `filter === 'paid'` → "No settled expenses yet."). The full "No expenses yet" empty state stays for `hasActivity === false`.

- [ ] **Step 3** — Gate: `pnpm exec tsc --noEmit`, `pnpm exec eslint` (2 files), `pnpm exec prettier --check` (2 files).
- [ ] **Step 4** — Commit: `feat: add filter tabs to dashboard activity`.

---

### Task 3: 44px touch targets (CSS hit-area, no visual change)

**Files:**
- Modify: `app/(app)/dashboard/page.tsx` (edit pencil)
- Modify: `components/delete-expense-button.tsx` (trash trigger)
- Modify: `components/settle-expense-button.tsx` (Mark paid chip)
- Modify: `components/delete-group-button.tsx` (Delete text button)
- Modify: `components/app-shell.tsx` (two signout icon buttons)

- [ ] **Step 1** — Append `relative after:absolute after:content-['']` + inset to each flagged control's existing `className`:

| Control | Base size | Add |
| --- | --- | --- |
| Edit pencil (`dashboard`, size-icon size-7) | 28px | `after:-inset-2` (→44px) |
| Delete trash trigger (`delete-expense-button`, size-icon size-7) | 28px | `after:-inset-2` |
| Mark paid chip (`SettleExpenseButton`, h-6) | 24px | `after:-inset-2.5` |
| Mark unpaid chip (from Task 1) | 24px | already has it |
| Delete group (`delete-group-button`, size sm text button) | 28px | `after:-inset-2` |
| Signout (`app-shell`, ×2, size-icon) | 32px | `after:-inset-1.5` |

- [ ] **Step 2** — Gate: `pnpm exec tsc --noEmit`, `pnpm exec eslint` (5 files), `pnpm exec prettier --check` (5 files).
- [ ] **Step 3** — Commit: `fix: expand touch targets to 44px`.

---

### Task 4: A11y announcements + honest delete copy

**Files:**
- Modify: `components/settle-expense-button.tsx:26`
- Modify: `components/delete-expense-button.tsx:54` + `:39`
- Modify: `components/delete-group-button.tsx:68` + `:48`

- [ ] **Step 1** — Add `role="alert"` to the three action-state error spans (`{state?.error && …}` in settle, delete-expense, delete-group).
- [ ] **Step 2** — Rewrite dialog body copy to reflect the soft delete (no restore path, but hidden from everyone, not "permanently destroyed"):
  - delete-expense line 39: `This permanently removes the expense and its splits. It can't be undone.` → `The expense and its splits will be hidden from you and everyone else.`
  - delete-group line 48: `This permanently removes the group and its expenses. It can't be undone.` → `The group and its expenses will be hidden from everyone.`
- [ ] **Step 3** — Gate: `pnpm exec tsc --noEmit`, `pnpm exec eslint` (3 files), `pnpm exec prettier --check` (3 files).
- [ ] **Step 4** — Commit: `fix: announce action errors and soften delete copy`.

---

### Task 5: Visual & microcopy polish

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1** — **Sage double-duty:** borrower ("someone else paid") icon tile → neutral. Payer keeps `bg-primary/10` + `text-primary`; borrower becomes `bg-muted` tile + `text-muted-foreground` icon.
- [ ] **Step 2** — **Legend** under the balance-card grid (sentence-case, `text-xs text-muted-foreground`): `“You owe” is your share of expenses others paid; “You are owed” is others’ shares of expenses you paid.`
- [ ] **Step 3** — **Split rhythm:** replace `item.participantCount === 1 ? '1 split' : \`split ${item.participantCount} ways\`` with `` `split ${item.participantCount} ${item.participantCount === 1 ? 'way' : 'ways'}` ``.
- [ ] **Step 4** — **Empty-state invite CTA:** wrap the empty-state button in `flex flex-col items-center gap-2 sm:flex-row` and add a second outline `Button` → `/settings`, `Invite friends` (lucide `UserPlus`).
- [ ] **Step 5** — Gate: `pnpm exec tsc --noEmit`, `pnpm exec eslint`, `pnpm exec prettier --check`.
- [ ] **Step 6** — Commit: `fix: neutral sage tiles, add legend and invite cta`.

---

**Final gate (whole branch):** `pnpm build` (11 routes) · `grep -rn "text-\[[0-9.]*rem\]" app components` → 0 · `node .opencode/skills/impeccable/scripts/detect.mjs --json "app/(app)/dashboard/page.tsx" app components` → no findings. Then whole-branch review + finish.
