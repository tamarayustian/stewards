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
tsc --noEmit          # Type check (no script for this)
```

## Architecture

- `proxy.ts` — protects `/dashboard` `/settings` `/expenses` `/people`, redirects auth'd users away from `/login`, `/register`. Uses the canonical Supabase SSR pattern: `setAll` writes refreshed/cleared tokens onto a `supplementalResponse` that is returned on every route (next + redirects), so sessions persist correctly in the browser.
- `app/(public)/` — shared layout (header + footer) for landing/login/register pages. `/login` validates client-side before calling the `login` action (`validate()`: email regex + password ≥ 6), with per-field inline errors. `/register` reads `?name=&email=` query params to prefill the form (wrapped in `Suspense` for `useSearchParams`); phone field with country code dropdown via `CountrySelect` (sourced from `lib/countries.ts`; 14 entries / 13 unique codes, HK +852 default) between email and password; when signup returns `exists: true` it shows a "Sign in" link instead of a duplicate-account error.
- `app/auth/actions.ts` — colocated server actions for signup/login/signout. Signup extracts `countryCode` + `phone` from FormData, validates via `validatePhone`, and passes phone in Supabase signUp metadata (`options: { data: { name, phone } }`). Returns `{ error, exists: true }` when the email already has an account, so the register page can route the user to Sign in.
- `app/auth/callback/route.ts` — handles email confirmation code exchange.
- `app/(app)/actions.ts` — server actions: `createExpense` (direct + group; form picks **who paid** and a per-person amount for each participant; sums must equal the total; supports multi-currency with exchange rate), `editExpense` (edit amount / who paid / note / per-person splits; participant set is **locked** to the expense's original splits — TODO: allow add/drop), `addFriend` (creates a name/email contact and returns it to the client), `removeContact`, `deleteGroup`, `deleteExpense` (soft delete via `deletedAt`), `settleExpense` (borrower marks their own unsettled non-zero split `settledAt` — 'Mark paid' chip on feed rows), `unsettleExpense` (its reversible counterpart — 'Mark unpaid' chip on settled rows), `settleAll` (batch `updateMany` marks all of the user's unsettled non-zero debts `settledAt` — the `SettleUpCard` 'Mark all paid' button), `sendReminder` (creates a `Reminder` row a borrower sees on `/people`), `markRemindersRead` (marks one sender's or all reminders read — nav badge + 'Unread' chips clear), `updateContactPhone` (stores a counterparty's `User.phone`, which powers the WhatsApp button), `updateCurrency` (updates `User.currency`), `createGroup`, `inviteToGroup`, `cancelInvite`, `dismissGroupNotices`. Mutations revalidate `/dashboard`, `/people`, `/people/{groupId}`, `/expenses`; `settleAll` also revalidates `/expenses`.
  - Expense split semantics: each participant's `amount` is **what they owe back to the payer** — "payer covered it" = payer `0.00`, borrower = full amount. Dashboard "You owe" is the current user's share on expenses someone else paid.
- `lib/db.ts` — Prisma singleton with `Pool` + `PrismaPg` adapter, SSL `rejectUnauthorized: false`.
- `lib/supabase.ts` — browser + server supabase client factories (`createServerClient` has cookie read/write; `createServerClientReadOnly` is for Server Components).
- `lib/auth-validation.ts` — shared validation: `validateEmail` (regex), `validatePassword` (≥ 6 chars), `validatePhone` (country code + digits, 7-15 digits, returns `{ fullPhone } | { error }`). Used by both the register form (client-side) and the signup server action.
- `lib/countries.ts` — single source of truth for phone dial codes: `COUNTRIES` (14 entries / 13 unique codes, `+1` covers US + CA) and `DEFAULT_COUNTRY_CODE` (`+852`). Consumed by the register dropdown, `profile-card.tsx`, and `validatePhone`'s whitelist.
- `lib/users.ts` — `ensureUserRow` (find-or-create/merge auth user's DB row; reads `user_metadata.phone` and writes to `User.phone`), `addContact` (add a lightweight friend contact). Friends can be added by name with an optional email.
- `lib/friends.ts` — pure friend-add/invite helpers (no DB): `buildAddFriendFormData(input)` builds FormData for the `addFriend` action, `buildInviteUrl(name, email, base)` constructs the `/register?name=&email=` invite URL, `copyText(text)` wraps clipboard write into a success boolean; `FriendInput` type. Unit-tested in `lib/friends.test.ts`; consumed by both shared hooks below.
- `lib/expenses.ts` — balance/activity/group queries. `getBalances` returns `{ youOwe, youAreOwed, unsettledCount }` (converted to viewer's home currency via stored rates); `getActivity`, `listGroups`, `listUsersForDirect` round out the file.
- `lib/currencies.ts` — 12 supported currencies (HKD, USD, CNY, JPY, TWD, GBP, EUR, SGD, AUD, KRW, IDR, PHP) with name, symbol, decimals. Exports `Currency` type, `CURRENCIES` constant, `validateCurrency(code)`.
- `lib/money.ts` — `formatMoney(amount, currency)` reads decimals from `CURRENCIES` for proper formatting (0 decimals for JPY/KRW, 2 for others).
- `lib/rates.ts` — `fetchExchangeRate(from, to)` via `/api/rates` proxy (frankfurter.app behind Next.js API route to avoid CORS). Same-currency short-circuit returns `{ rate: 1 }`.
- `app/api/rates/route.ts` — server-side proxy for frankfurter.app exchange rate API (5s timeout, error handling).
- `components/currency-card.tsx` — client component for settings page currency selector (extracted to keep settings as server component).
- `components/password-input.tsx` — shared `PasswordInput` (client) wrapping `Input` with a show/hide eye toggle, used by login + register.
- `components/ui/select.tsx` — two-variant `Select` wrapper (`default` / `compact`) reproducing the card-dialect and expense-dialect native selects; base primitive for `CountrySelect` and `CurrencySelect`.
- `components/country-select.tsx` — renders the phone-dial-code `<select>` from `COUNTRIES`; consumed by register and `profile-card.tsx`. Option keys use `${code}-${label}` (resolves old register/profile-card key divergence).
- `components/currency-select.tsx` — renders the currency `<select>` from `CURRENCIES`; consumed by register, `currency-card.tsx`, and `add-expense-form.tsx`.
- `components/app-shell.tsx` — desktop sidebar and mobile header + bottom tab bar. `navItems` has 4 items: Dashboard (`/dashboard`, `LayoutDashboard`), Expenses (`/expenses`, `ReceiptText`), People (`/people`, `Users`), Settings (`/settings`, `Settings`). Sign-out is behind avatar menus (Popover on desktop, Drawer on mobile). The Expenses tab shows an `unreadReminders` badge (≥1 count, `9+` cap on mobile).
- `app/(app)/people/page.tsx` — server component listing groups and contacts: a Groups section (with GroupForm and inline ConfirmAction for delete) and a Contacts section (with PeopleForm — add via the shared `useAddFriend` — and inline ConfirmAction for remove). Row actions when `pair.amountOwedToMe.gt(0)`: `RemindButton` (counterparty registered only), `WhatsAppButton` (phone present; precomputed via `getPairDetail`), otherwise an inline `AddPhoneForm`; a `Details` link always goes to `/people/{id}`.
- `app/(app)/people/[id]/page.tsx` — pair detail (server component): headline (owes you / you owe / All settled) in accent/destructive/muted, itemized expense list with 'You paid'/'They paid' + share amount, the same action buttons, and a per-sender `MarkRemindersReadButton` when an unread reminder exists. Redirects to `/people` when the pair has no outstanding split or the user doesn't exist.
- `app/(app)/people/[id]/page.tsx` — group detail (server component): group info, members list, invite form, and group-scoped activity feed. "Back to people" links to `/people`.
- `lib/balances.ts` — pair/reminder queries: `getPairBalances(userId)` (per-counterparty nets, filtered to `net != 0`, sorted by `|net|` desc), `getPairDetail(userId, otherUserId)`, `listReminders(userId)` (drops reminders whose sender you no longer owe), `countUnreadReminders(userId)` (nav badge).
- `lib/balance-math.ts` — pure money math (no DB): `computePairSummaries`, `buildPairDetail`, `buildWhatsAppDraft`, `formatDay`, `waMeNumber`. **Client-bundle safety**: imports `Prisma` type-only from `@/lib/generated/prisma/client` and the value namespace (`PrismaValue`) from the browser-safe generated entry `@/lib/generated/prisma/browser` — importing the generated client's runtime into a client component breaks `pnpm build` (it drags `node:process`/`node:path`/`node:url`/`node:module` into the app-client chunk). `PairItem` money fields are plain `number` (client DTO — `Prisma.Decimal` class instances crash Server→Client serialization with "Decimal objects are not supported"); `PairDetail`/`PairSummary` totals stay `Prisma.Decimal` server-side.
- `components/whatsapp-button.tsx` (client) — `WhatsAppButton({ name, phone, items })` opens `https://wa.me/<digits>?text=<draft>`; the draft (via `buildWhatsAppDraft`) itemizes only the expenses the counterparty owes you. `components/remind-button.tsx` — `RemindButton({ toId })` posts `sendReminder`. `components/mark-reminders-read-button.tsx` — `MarkRemindersReadButton({ fromId? })` posts `markRemindersRead` (all senders when `fromId` omitted). `components/add-phone-form.tsx` — inline phone input (`+852…`) posting `updateContactPhone`, replaced by the WhatsApp button once a phone is stored.
- `app/(app)/expenses/page.tsx` — all-activity feed and per-person balance list (server component), reached via the dashboard "View all" link and the Expenses nav tab. Has feed/people view toggle.
- `components/activity-feed.tsx` — `ActivityFeed({ items, filter })` server component: filter tabs (`?filter=all|owe|owed|paid`) + row list + per-filter "Nothing here" empty state. Shared by the dashboard and `/expenses`.
- `components/settle-up-card.tsx` — `SettleUpCard({ youOwe, unsettledCount })` shown on the dashboard when `youOwe.gt(0) && unsettledCount > 0`; its form posts to `settleAll`.
- `components/use-add-friend.ts` — shared `useAddFriend(onAdded?)` client hook: name/email/phone state + error + transition `pending`; `submit()` posts `addFriend` via `buildAddFriendFormData`, resets fields and fires `onAdded(contact)` on success. Consumed by `people-form.tsx` and `add-expense-form.tsx`.
- `components/use-invite-link.ts` — shared `useInviteLink()` client hook: `copyInviteLink({ name, email })` copies a `buildInviteUrl` link via `copyText`, returns success and flashes `copied` for 2s. Consumed by `invite-friend.tsx` and `add-expense-form.tsx`.
- `components/add-expense-form.tsx` — direct picker's add-friend control is progressive: a collapsed ghost "Add a friend by name" disclosure when the user has friends, and a guided dashed "No friends yet" empty state (panel always open) when they have none — the panel runs on the shared `useAddFriend` (new contact lands pre-selected, panel closes via `onAdded`) with its copy-link button on `useInviteLink`. `components/invite-friend.tsx` copies a sign-up invite link (prefills `/register?name=&email=`) through the same hook. Balance preview under splits is sage 'X will owe you/Others will owe you' when you paid, destructive 'You will owe X' otherwise. Currency select with 12 options + rate indicator (fetches exchange rate on currency change); rate stored as hidden inputs on submit.
- `components/confirm-action.tsx` — generic `ConfirmAction` component (client) with controlled `AlertDialog`, used inline at call sites for delete/remove/cancel actions. `components/settle-expense-button.tsx` (`SettleExpenseButton` — 'Mark paid' sage chip for unsettled non-zero shares; `MarkUnpaidButton` — muted 'paid' chip that reverses a settlement) — uses the hand-written `components/ui/alert-dialog.tsx` (base-ui `AlertDialog` named import, controlled `open`; success closes via revalidation, NOT useEffect — lint forbids setState-in-effect).
- `lib/expenses.ts` `getActivity` returns `myShare` (user's split Decimal) so the dashboard can show Mark paid only for unsettled non-zero shares and headline that share as the amount on borrower rows (with a `share of <total>` caption). The dashboard feed has server-side filter tabs (`?filter=all|owe|owed|paid`).

## Database

- Supabase Session pooler (IPv4, `ssl: { rejectUnauthorized: false }`).
- **Never** add `?sslmode=require` to `DATABASE_URL` — handled in Pool config.
- Models: `User`, `Group`, `GroupMember`, `Expense`, `ExpenseSplit`, `Contact`, `GroupInvite`, `Reminder` — UUID PKs, `Decimal(10,2)` for money, soft delete via `deletedAt DateTime?`. `User.email` is nullable — contacts (friends added by name) are `User` rows with `email: null`; `User.phone` is nullable and only set by the person adding the contact (powers the WhatsApp button). `User.currency` stores the user's home currency (default HKD). `Expense.rate` and `Expense.rateCurrency` store the exchange rate snapshot at creation time (null for same-currency expenses).
- After schema changes: `pnpm prisma:generate && pnpm prisma:push`.

## Pre-launch TODOs

- **Friend identity** (`lib/users.ts`): name-only contacts (`email: null`) never merge when the person later signs up — expenses stay on a standalone "people" row. Only email-matched contacts are silently merged; a person who registers with a different email becomes a duplicate `User` row. Revisit before launch — proposed `/auth/claim` "is this you?" confirmation (match by email + name) plus adder-side notification.
- **Email invites**: copy-link invites are shipped. Real email invites need `SUPABASE_SERVICE_ROLE_KEY` (already in `.env`, currently unused) via `auth.admin.inviteUserByEmail` — deferred to post-launch.
- **Adder-side confirmation**: show "[friend] joined" to the person who added a friend once their claim/registration happens — deferred to post-launch.
- **Tab UX**: Convert filter tabs (All/You owe/Owed/Settled) from `<Link>` to `useSearchParams` + `router.replace` with `scroll: false` to prevent scroll reset on tab switch. View toggle (Feed/By Person) stays URL-based.
- **Toast component**: Build a consistent, reusable toast/notification component for form feedback (success, error, info) across all forms. Currently uses inline text messages.
- **Clipboard copy dedup** (`components/copy-message-button.tsx`): still calls `navigator.clipboard.writeText` directly instead of using `lib/friends.ts` `copyText`. Candidate to fold in, but note the failure semantics differ — `copyText` degrades silently to `false`, whereas `copy-message-button.tsx` throws an unhandled rejection. Needs its own decision on desired behavior before consolidating.
