# Stewards

## Stack

- **Next.js 16** — uses `proxy.ts` (not `middleware.ts`) for route protection. Read `node_modules/next/dist/docs/` before writing code.
- **Prisma 7** — no built-in query engine; requires driver adapter (`@prisma/adapter-pg` + `pg`). Client generated to `lib/generated/prisma` (custom output).
- **shadcn v4 (base-nova style)** — components at `components/ui/`. Uses `@base-ui/react` (not Radix). Use `render` prop for polymorphic components, NOT `asChild`.
- **Supabase Auth** (SSR, cookie-based). Email confirmation is ON — User row is created in `app/auth/callback/route.ts` on confirmation.
- **Tailwind v4** — CSS-based config in `globals.css`, no `tailwind.config.ts`.
- **pnpm** package manager, `.env` single env file.

## Commands

```sh
pnpm dev              # dev server
pnpm build            # production build
pnpm lint             # ESLint
pnpm format           # Prettier write
pnpm format:check     # Prettier check
pnpm prisma:generate  # Prisma client gen
pnpm prisma:push      # Push schema to DB
pnpm prisma:studio    # Prisma Studio
pnpm db:backfill      # Synthetic settlements for legacy settled splits (--dry-run to plan)
pnpm db:reconcile     # Rebuild every pair and assert ledger invariants
tsc --noEmit          # Type check (no script for this)
```

## Architecture

- `proxy.ts` — protects `/dashboard` `/settings` `/expenses` `/people`, redirects auth'd users away from `/login`, `/register`. Uses the canonical Supabase SSR pattern: `setAll` writes refreshed/cleared tokens onto a `supplementalResponse` that is returned on every route (next + redirects), so sessions persist correctly in the browser.
- `app/(public)/` — shared layout (header + footer) for landing/login/register pages. `/login` validates client-side before calling the `login` action (`validate()`: email regex + password ≥ 6), with per-field inline errors. `/register` reads `?name=&email=` query params to prefill the form (wrapped in `Suspense` for `useSearchParams`); phone field with country code dropdown via `CountrySelect` (sourced from `lib/countries.ts`; 14 entries / 13 unique codes, HK +852 default) between email and password; when signup returns `exists: true` it shows a "Sign in" link instead of a duplicate-account error.
- `app/auth/actions.ts` — colocated server actions for signup/login/signout. Signup extracts `countryCode` + `phone` from FormData, validates via `validatePhone`, and passes phone in Supabase signUp metadata (`options: { data: { name, phone } }`). Returns `{ error, exists: true }` when the email already has an account, so the register page can route the user to Sign in.
- `app/auth/callback/route.ts` — handles email confirmation code exchange.
- `app/(app)/actions.ts` — server actions: `createExpense` (direct + group; form picks **who paid** and a per-person amount for each participant; the payer's own share must be `0.00`; sums must equal the total; supports multi-currency with exchange rate), `editExpense` (edit amount / who paid / note / per-person splits; participant set is **locked** to the expense's original splits — TODO: allow add/drop), `addFriend` (creates a name/email contact and returns it to the client), `removeContact`, `deleteGroup`, `deleteExpense` (soft delete via `deletedAt`), `settleExpense` (records one pinned `Settlement` for the tapped share's outstanding — 'Mark paid' / 'Mark received' chips), `unsettleExpense` (its reversible counterpart, reversing the funding payments — 'Mark unpaid' chip), `settleAll` (one settlement per creditor and currency — the `SettleUpCard` 'Mark all as paid' button), `recordSettlement` / `editSettlement` / `deleteSettlement` (manual payments: insert / edit amount+date+note / soft delete), `sendReminder` (creates a `Reminder` row a borrower sees on `/people`), `markRemindersRead` (marks one sender's or all reminders read — nav badge + 'Unread' chips clear), `updateContactPhone` (stores a counterparty's `User.phone`, which powers the WhatsApp button), `updateCurrency` (updates `User.currency`), `createGroup`, `inviteToGroup`, `cancelInvite`, `dismissGroupNotices`, `claimGhost`/`declineGhost`. Mutations revalidate `/dashboard`, `/people`, `/people/{groupId}`, `/expenses`; `settleAll` also revalidates `/expenses`.
  - Expense split semantics: each participant's `amount` is **what they owe back to the payer** — "payer covered it" = payer `0.00`, borrower = full amount. Dashboard "You owe" is the current user's share on expenses someone else paid.
- `lib/db.ts` — Prisma singleton with `Pool` + `PrismaPg` adapter, SSL `rejectUnauthorized: false`.
- `lib/supabase.ts` — browser + server supabase client factories (`createServerClient` has cookie read/write; `createServerClientReadOnly` is for Server Components).
- `lib/auth-validation.ts` — shared validation: `validateEmail` (regex), `validatePassword` (≥ 6 chars), `validatePhone` (country code + digits, 7-15 digits, returns `{ fullPhone } | { error }`). Used by both the register form (client-side) and the signup server action.
- `lib/countries.ts` — single source of truth for phone dial codes: `COUNTRIES` (14 entries / 13 unique codes, `+1` covers US + CA) and `DEFAULT_COUNTRY_CODE` (`+852`). Consumed by the register dropdown, `profile-card.tsx`, and `validatePhone`'s whitelist.
- `lib/users.ts` — `ensureUserRow` (find-or-create/merge auth user's DB row; reads `user_metadata.phone` and writes to `User.phone`), `addContact` (add a lightweight friend contact). Friends can be added by name with an optional email.
- `lib/friends.ts` — pure friend-add/invite helpers (no DB): `buildAddFriendFormData(input)` builds FormData for the `addFriend` action, `buildInviteUrl(name, email, base)` constructs the `/register?name=&email=` invite URL, `copyText(text)` wraps clipboard write into a success boolean; `FriendInput` type. Unit-tested in `lib/friends.test.ts`; consumed by both shared hooks below.
- `lib/claims.ts` — claim/merge logic for pre-registration "ghost" users: pure helpers `normalizeName` / `matchesIdentity` (email / trimmed-name / phone matching) / `filterUnclaimed` / `decideSplitTransfers` / `decideRepoints` (unit-tested in `lib/claims.test.ts`), plus `mergeGhostIntoUser(tx, ghostId, targetUserId)` (re-points expenses/splits/group memberships/contacts onto the real user, summing colliding split amounts, then deletes the ghost), `syncPendingClaims(userId)` (offers ghost matches as pending `UserClaim` rows on every auth entry), `countPendingClaims`, and `listPendingClaims`. Mutating actions `claimGhost` / `declineGhost` live in `app/(app)/actions.ts` (client-importable), not here.
- `app/(app)/auth/claim/page.tsx` — "Is this you?" interstitial at `/auth/claim` (protected via `proxy.ts`); one card per pending claim (ghost name, adder, expense count) with "That's me" / "Not me" buttons. `components/friend-joined-notice.tsx` — dashboard card notifying a contact's adder that they joined ("X joined Stewards"), dismissed via `dismissFriendNotices`; `lib/invites.ts` `listPendingNotices(email, userId)` returns a `kind: 'group' | 'friend'` union.
- `lib/expenses.ts` — balance/activity/group queries. `getBalances` returns `{ youOwe, youAreOwed, unsettledCount, owedCount }` (converted to viewer's home currency via stored rates); `getActivity` returns `myShare` = the amount still **outstanding** on the viewer's share (`amount - settledAmount`) and `shareAmount` = the original split (settled history); `listGroups`/`getGroup` count expenses with an open, non-zero split held by someone other than the payer (`hasUnsettledBorrower` + `openShareSelect`; computed in memory because Prisma cannot compare `split.userId` with the parent `expense.paidById`); `listUsersForDirect` rounds out the file.
- `lib/currencies.ts` — 12 supported currencies (HKD, USD, CNY, JPY, TWD, GBP, EUR, SGD, AUD, KRW, IDR, PHP) with name, symbol, decimals. Exports `Currency` type, `CURRENCIES` constant, `validateCurrency(code)`.
- `lib/money.ts` — `formatMoney(amount, currency)` reads decimals from `CURRENCIES` for proper formatting (0 decimals for JPY/KRW, 2 for others).
- `lib/rates.ts` — `fetchExchangeRate(from, to)` via `/api/rates` proxy (frankfurter.app behind Next.js API route to avoid CORS). Same-currency short-circuit returns `{ rate: 1 }`.
- `app/api/rates/route.ts` — server-side proxy for frankfurter.app exchange rate API (5s timeout, error handling).
- `components/currency-card.tsx` — client component for settings page currency selector (extracted to keep settings as server component).
- `components/password-input.tsx` — shared `PasswordInput` (client) wrapping `Input` with a show/hide eye toggle, used by login + register.
- `components/ui/select.tsx` — two-variant `Select` wrapper (`default` / `compact`) reproducing the card-dialect and expense-dialect native selects; base primitive for `CountrySelect` and `CurrencySelect`.
- `components/country-select.tsx` — renders the phone-dial-code `<select>` from `COUNTRIES`; consumed by register and `profile-card.tsx`. Option keys use `${code}-${label}` (resolves old register/profile-card key divergence).
- `components/currency-select.tsx` — renders the currency `<select>` from `CURRENCIES`; consumed by register, `currency-card.tsx`, and `add-expense-form.tsx`.
- `components/toast.tsx` — client toast notification system: `ToastProvider` (wraps app in root layout), `useToast()` hook returns `{ toast({ title, variant? }) }`. Variants: `success` (4s auto-dismiss), `error` (6s), `info` (4s). Max 3 visible, bottom-right desktop / bottom-center mobile. Exit animations, accessible (`role="status"`, `aria-live="polite"`).
- `components/banner-card.tsx` — shared notice-banner skeleton (icon tile + title + message + optional action); consumed by `settle-up-card.tsx` and `remind-card.tsx`; `group-joined-notice.tsx` intentionally separate (own `bg-accent/10` styling).
- `components/stat-card.tsx` — dashboard stat twins (`destructive` / `accent` tone); icon tile + label + value, used for "To pay" and "To collect" cards.
- `components/empty-state.tsx` — shared empty-state card (icon circle + title + message + optional children; responsive `py-8 sm:py-12`); consumed by `activity-feed.tsx`, `dashboard/page.tsx`, and both `people/page.tsx` sections.
- `components/app-shell.tsx` — desktop sidebar and mobile header + bottom tab bar. `navItems` has 4 items: Dashboard (`/dashboard`, `LayoutDashboard`), Expenses (`/expenses`, `ReceiptText`), People (`/people`, `Users`), Settings (`/settings`, `Settings`). Sign-out is behind avatar menus (Popover on desktop, Drawer on mobile). The Expenses tab shows an `unreadReminders` badge (≥1 count, `9+` cap on mobile).
- `app/(app)/people/page.tsx` — server component listing groups and contacts: a Groups section (with GroupForm and inline ConfirmAction for delete) and a Contacts section (with PeopleForm — add via the shared `useAddFriend` — and inline ConfirmAction for remove). Row actions rendered via `CounterpartyActions`; a `Details` link always goes to `/people/{id}`.
- `app/(app)/people/[id]/page.tsx` — pair detail (server component): headline (owes you / you owe / All settled) in accent/destructive/muted, itemized expense list with 'You paid'/'They paid' + share amount, the same action buttons via `CounterpartyActions`, and a per-sender `MarkRemindersReadButton` when an unread reminder exists. Redirects to `/people` when the pair has no outstanding split or the user doesn't exist.
- `app/(app)/people/[id]/page.tsx` — group detail (server component): group info, members list, invite form, and group-scoped activity feed. "Back to people" links to `/people`.
- `lib/balances.ts` — pair/reminder queries: `getPairBalances(userId)` (per-counterparty nets, filtered to `net != 0`, sorted by `|net|` desc), `getPairOverview(userId)` (pairs + per-pair detail + reminders; it deliberately does **not** load pair credit), `getPairDetail(userId, otherUserId)`, `listReminders(userId)` (drops reminders whose sender you no longer owe), `countUnreadReminders(userId)` (nav badge), and the exported `loadPairCredits(userId)` — the settlement+allocation read for the upcoming Split Ledger UI, kept next to `summarizePairCredits` in `lib/outstanding.ts`.
- `lib/balance-math.ts` — pure money math (no DB): `computePairSummaries`, `buildPairDetail`, `buildWhatsAppDraft`, `formatDay`, `waMeNumber`. **Client-bundle safety**: imports `Prisma` type-only from `@/lib/generated/prisma/client` and the value namespace (`PrismaValue`) from the browser-safe generated entry `@/lib/generated/prisma/browser` — importing the generated client's runtime into a client component breaks `pnpm build` (it drags `node:process`/`node:path`/`node:url`/`node:module` into the app-client chunk). `PairItem` money fields are plain `number` (client DTO — `Prisma.Decimal` class instances crash Server→Client serialization with "Decimal objects are not supported"); `PairDetail`/`PairSummary` totals stay `Prisma.Decimal` server-side.
- `components/counterparty-actions.tsx` — exports the three-way conditional (WhatsApp button, Remind button, or AddPhoneForm); consumed by `balance-list.tsx` and `people/[id]/page.tsx`.
- `components/whatsapp-button.tsx` (client) — `WhatsAppButton({ name, phone, items })` opens `https://wa.me/<digits>?text=<draft>`; the draft (via `buildWhatsAppDraft`) itemizes only the expenses the counterparty owes you. `components/remind-button.tsx` — `RemindButton({ toId })` posts `sendReminder`, shows toast on success. `components/mark-reminders-read-button.tsx` — `MarkRemindersReadButton({ fromId? })` posts `markRemindersRead` (all senders when `fromId` omitted). `components/add-phone-form.tsx` — inline phone input (`+852…`) posting `updateContactPhone`, replaced by the WhatsApp button once a phone is stored.
- `app/(app)/expenses/page.tsx` — all-activity feed and per-person balance list (server component), reached via the dashboard "View all" link and the Expenses nav tab. Has feed/people view toggle.
- `components/activity-feed.tsx` — `ActivityFeed({ items, filter })` server component: filter tabs (`?filter=all|owe|owed|paid`) + row list + per-filter "Nothing here" empty state. Shared by the dashboard and `/expenses`. Filter/view tabs use `PillTabs` (client) which switches params via `useSearchParams` + `router.replace` with `scroll: false` to prevent scroll reset.
- `components/settle-up-card.tsx` — client component `SettleUpCard({ youOwe, unsettledCount })` shown on the dashboard when `youOwe.gt(0) && unsettledCount > 0`; wraps `BannerCard` (primary tone), form posts to `settleAll`, and its submit button disables itself (`useFormStatus`, "Marking…") so a double tap cannot record a second payment.
- `components/use-add-friend.ts` — shared `useAddFriend(onAdded?)` client hook: name/email/phone state + error + transition `pending`; `submit()` posts `addFriend` via `buildAddFriendFormData`, resets fields and fires `onAdded(contact)` on success. Consumed by `people-form.tsx` and `add-expense-form.tsx`.
- `components/use-invite-link.ts` — shared `useInviteLink()` client hook: `copyInviteLink({ name, email })` copies a `buildInviteUrl` link via `copyText`, returns success and flashes `copied` for 2s. Consumed by `invite-friend.tsx` and `add-expense-form.tsx`.
- `components/add-expense-form.tsx` — direct picker's add-friend control is progressive: a collapsed ghost "Add a friend by name" disclosure when the user has friends, and a guided dashed "No friends yet" empty state (panel always open) when they have none — the panel runs on the shared `useAddFriend` (new contact lands pre-selected, panel closes via `onAdded`) with its copy-link button on `useInviteLink`. `components/invite-friend.tsx` copies a sign-up invite link (prefills `/register?name=&email=`) through the same hook. The payer's split row is read-only `0.00` (paid) and never submitted; "Split equally" spreads the total across the borrowers only. Balance preview under splits is sage 'X will owe you/Others will owe you' when you paid, destructive 'You will owe X' otherwise. Currency select with 12 options + rate indicator (fetches exchange rate on currency change); rate stored as hidden inputs on submit.
- `components/confirm-action.tsx` — generic `ConfirmAction` component (client) with controlled `AlertDialog`, used inline at call sites for delete/remove/cancel actions. `components/settle-expense-button.tsx` (`SettleExpenseButton` — 'Mark paid' sage chip for unsettled non-zero shares; `MarkUnpaidButton` — muted 'paid' chip that reverses a settlement) — uses the hand-written `components/ui/alert-dialog.tsx` (base-ui `AlertDialog` named import, controlled `open`; success closes via revalidation, NOT useEffect — lint forbids setState-in-effect).
- `components/back-link.tsx` — shared back-navigation link (Button + ArrowLeft + Link); consumed by pair-detail and group-detail pages.
- `components/error-state.tsx` — shared centered error/404 composition (`icon`, `tone` `destructive|primary`, optional `ghost` watermark string, `title`, `message`, children as action buttons); one authored `motion-safe:` entrance. `components/error-shell.tsx` — branded mini-chrome (logo header + `SiteFooter`) for the root `not-found.tsx` / `error.tsx`, which render outside the route-group layouts. Consumed by all 3 `not-found.tsx` files and all 4 `error.tsx` files. Route-group pages get chrome from their own layouts, so they render `ErrorState` alone.
- `components/site-footer.tsx` — single source for the footer (brand line + Privacy/Terms/Contact links); used by `app/(public)/layout.tsx` and `error-shell.tsx`.
- `lib/fonts.ts` — shared `next/font` instances (`karla`, `fraunces`, `ibmPlexMono`); imported by `app/layout.tsx` and `app/global-error.tsx` (the latter also imports `./globals.css` because it replaces the root layout).
- `lib/expenses.ts` `getActivity` returns `myShare` — the amount still **outstanding** on the viewer's own share (`amount - settledAmount`), not the original split — so the dashboard can show Mark paid only for unsettled, non-zero-outstanding shares and headline that share as the amount on borrower rows (with a `share of <total>` caption). `shareAmount` is the original split amount, used for settled history. The dashboard feed has server-side filter tabs (`?filter=all|owe|owed|paid`).

## Database

- Supabase Session pooler (IPv4, `ssl: { rejectUnauthorized: false }`).
- **Never** add `?sslmode=require` to `DATABASE_URL` — handled in Pool config.
- Models: `User`, `Group`, `GroupMember`, `Contact`, `Expense`, `ExpenseSplit`, `GroupInvite`, `Reminder`, `Feedback`, `UserClaim`, `Notice`, `Settlement`, `SettlementAllocation`, `LedgerEvent` — UUID PKs, `Decimal(12,2)` for money, soft delete via `deletedAt DateTime?` where the model carries it. `User.email` is nullable — contacts (friends added by name) are `User` rows with `email: null`; `User.phone` is nullable and only set by the person adding the contact (powers the WhatsApp button). `User.currency` stores the user's home currency (default HKD). `Expense.rate` and `Expense.rateCurrency` store the exchange rate snapshot at creation time (null for same-currency expenses).
- After schema changes: `pnpm prisma:generate && pnpm prisma:push`.
- **Deploy order for the settlement ledger**: `pnpm prisma:push` → `pnpm db:backfill` → deploy the code → `pnpm db:reconcile`. A settle between the push and the backfill runs a rebuild that silently zeroes legacy `settledAt` rows; only `pnpm db:reconcile`'s pre-flight guard catches that today, so it must run (and pass) after the code is live.
- `pnpm db:backfill [--dry-run]` plans and writes one synthetic `Settlement` per legacy settled split (`requestId = backfill:<splitId>`, `note = 'Backfilled'`, pinned to the split) and writes the projection directly — it never rebuilds. `pnpm db:reconcile` rebuilds every pair the ledger has rows for and asserts the invariants; it has no `--fix`.

## Settlement model (implemented)

An **editable living ledger**: expenses and payments can be edited or deleted at any time. Balances are always a pure function of the current records; nothing is frozen, and a correction never requires reversing a payment first.

### Money and projections

- **`ExpenseSplit.settledAmount` (`Decimal(12,2)`, default 0) is a projection, not immutable truth.** `outstanding = amount - settledAmount`; a person's net is the sum of their outstanding splits. Balances never subtract payments separately — that is what prevents double counting. The projection is rebuilt, never hand-edited: `rebuildPairAllocations` is its only _allocator_, and the only two direct writers are `pnpm db:backfill` (seeding synthetic settlements for legacy rows) and the ghost-merge split transfer in `mergeGhostIntoUser` (`lib/claims.ts`), which sums the ghost's `settledAmount` into the surviving split before its rebuild.
- **`ExpenseSplit.settledAt`** means fully settled only (`settledAmount = amount`) and is set/cleared by the rebuild; a reversed payment reopens the split.
- **The payer's own split is never a debt and must be `0.00`.** The rebuild reads splits pair-scoped, so a split whose debtor is the payer matches neither direction and can never be settled or counted. `createExpense`/`editExpense` reject a non-zero payer share; the form shows that row read-only and "Split equally" spreads the total across the borrowers only. Legacy rows (the dev DB has a few) are ignored by `deleteGroup` and the group unsettled counts so no existing group is wedged.
- **A payment is a `Settlement`** (`fromUserId`, `toUserId`, `amount`, `currency`, `occurredAt`, `note`, `createdById`, optional `groupId`, optional `pinnedSplitId`, unique `requestId`, `deletedAt`) **plus `SettlementAllocation` rows** (`settlementId`, `splitId`, `amount`, unique per pair). Allocations are a rebuildable projection: hard-deleted and recreated by the rebuild, while expenses and settlements only soft-delete.
- **Credit** is the unapplied remainder `settlement.amount - SUM(allocations)` for a pair and currency, derived on read (`summarizePairCredits`), never stored in its own table. The rebuild applies it to future splits; `settleAll` subtracts it before sizing a payment.
- **`LedgerEvent`** is append-only audit (`actorId`, `action`, `entity`, `entityId`, `before`, `after`, `createdAt`). It never participates in balance math.

### Code

- `lib/settlements.ts` — `rebuildPairAllocations(tx, a, b)` (the one rebuild; locks every split of either user `ORDER BY id FOR UPDATE`, releases allocations, re-applies active settlements oldest-first with the pin honoured, clamps `settledAmount`, clears inactive splits), `settlementPairKey`, `toCents` (Decimal → integer minor units, exact), `nextSettledAt`, the row mappers and shared selects.
- `lib/settlement-allocation.ts` — pure allocation engine (`allocateSettlements`): integer cents, same debtor/creditor/currency only, pinned split first then oldest-first, excess summed as credit per currency.
- `lib/settlement-pairs.ts` — `affectedPairsForExpenses` / `mergeAffectedPairs`: the payer × each participant, old and new shape on edit, unioned for ghost merges and deletions.
- `lib/settlement-targets.ts` — `groupSettleAllTargets`: folds outstanding shares into one target per creditor + currency, split ids oldest-first.
- `lib/settlement-unwind.ts` — `planSettlementUnwind`: which payments fund a tapped share and what else they were covering (reports released, not reopened).
- `lib/settlement-input.ts` — `validateSettlementInput` / `validateSettlementEditInput`: form parsing, exact cents, no floats; parties and currency are immutable on edit.
- `lib/outstanding.ts` — `outstandingCents` / `outstandingDecimal` / `hasOutstandingShare` and the credit derivation `summarizePairCredits` (+ `PairCredit` type).
- `lib/ledger-maintenance.ts` — pure decisions for the scripts: `planBackfill`, `backfillBlockerMessage`, `ledgerPairs`, `splitViolations`, `settlementViolations`, `allocationViolations`.
- `scripts/backfill-settlements.ts` (`pnpm db:backfill`) and `scripts/reconcile-settlements.ts` (`pnpm db:reconcile`).
- `lib/expenses.ts` / `lib/balances.ts` read balances from outstanding shares, never from `settledAt` alone.

### Actions

- `settleExpense` ('Mark paid' / 'Mark received'): one `Settlement` pinned to the tapped share for its current outstanding. The transaction locks the pair's splits in id order, then re-reads the amount after the lock, so an overlapping second tap finds nothing left and writes nothing.
- `unsettleExpense` ('Mark unpaid'): soft-deletes the payments that funded the tapped share (whole-payment reversal, ruled correct), rebuilds, and reports the scope (`settlementsClosed`, `allocationsReleased`, `otherSplitsReleased`, `reopened`).
- `settleAll` ('Mark all as paid'): locks the viewer's splits, re-reads them inside the transaction, then writes one settlement per creditor + currency sized from the outstanding amount minus any existing pair credit, allocated oldest-first. The card's submit button is disabled while pending.
- `recordSettlement` / `editSettlement` / `deleteSettlement`: manual payments; create is idempotent through `requestId`, edit touches amount/date/note only, delete is a soft delete plus rebuild.

### Invariants and concurrency

- Rebuilds lock every split of both users `ORDER BY id`, so overlapping rebuilds (e.g. `(a,b)` and `(a,c)`) queue rather than race; `settleExpense`/`settleAll` take the same locks before re-reading. Interactive transactions that rebuild set `{ timeout: 20_000 }` because a group expense runs one rebuild per participant against a remote pooled database — that is every mutating action in `app/(app)/actions.ts` and `ensureUserRow`'s ghost merge in `lib/users.ts`. The two scripts budget 60s instead (`db:backfill`, `db:reconcile`).
- `Settlement.requestId` (unique) makes retries idempotent; the allocation pin keeps a "pay this share" payment on its split when still eligible.
- `pnpm db:reconcile` asserts after every rebuild: `0 <= settledAmount <= amount`; `settledAt` set exactly when a non-zero share is fully cleared; `SUM(allocation.amount) <= settlement.amount`; a soft-deleted settlement holds no allocation; `settledAmount == SUM(active allocations)` per split; no cross-currency allocation; no allocation pointing outside the pair.
- **Oldest-first** means the expense's creation time (`Expense.createdAt`; the model has no separate expense date), then id.

### Not yet built

- **Credit display** — the derivation is tested (`summarizePairCredits`) and `loadPairCredits` is exported, but no UI renders it yet: `getPairOverview` deliberately no longer loads it.
- **Participant editing on an expense** — `editExpense` locks the participant set to the expense's original splits (TODO in the action).
- **Expense-date editing** — there is no `Expense.occurredAt`, so oldest-first is currently creation order; the expense date cannot be changed.
- **Destructive-edit balance preview** — an edit that changes the result does not preview the resulting balance before saving.

## Commit Conventions

Use Conventional Commits specification is a lightweight convention on top of commit messages. It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of. This convention dovetails with SemVer, by describing the features, fixes, and breaking changes made in commit messages.

The commit message should be structured as follows: <type>[optional scope]: <description>
These are the accepted types: feat, fix, refactor, perf, docs, test, chore, style, build, ci
Never write vague messages like "update", "fix stuff", "changes" or "wip".

## Pre-launch TODOs

- **Email invites**: copy-link invites are shipped. Real email invites need `SUPABASE_SERVICE_ROLE_KEY` (already in `.env`, currently unused) via `auth.admin.inviteUserByEmail` — deferred to post-launch.

## Legal

- Privacy Policy and Terms & Conditions are public at `/privacy` and `/terms` (linked in footer).
- For a solo public deployment: policies should reflect actual data (Supabase auth+DB, Vercel hosting, contacts shared between users, reminders, soft deletes). Keep them accurate over time.
