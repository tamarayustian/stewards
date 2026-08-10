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

- `proxy.ts` — protects `/dashboard` `/groups` `/settings` `/expenses`, redirects auth'd users away from `/login`, `/register`. Uses the canonical Supabase SSR pattern: `setAll` writes refreshed/cleared tokens onto a `supplementalResponse` that is returned on every route (next + redirects), so sessions persist correctly in the browser.
- `app/(public)/` — shared layout (header + footer) for landing/login/register pages. `/register` reads `?name=&email=` query params to prefill the form (wrapped in `Suspense` for `useSearchParams`).
- `app/auth/actions.ts` — colocated server actions for signup/login/signout.
- `app/auth/callback/route.ts` — handles email confirmation code exchange.
- `app/(app)/actions.ts` — server actions: `createExpense` (direct + group; form picks **who paid** and a per-person amount for each participant; sums must equal the total), `editExpense` (edit amount / who paid / note / per-person splits; participant set is **locked** to the expense's original splits — TODO: allow add/drop), `addFriend` (creates a name/email contact and returns it to the client), `deleteGroup`, `deleteExpense` (soft delete via `deletedAt`), `settleExpense` (borrower marks their own unsettled non-zero split `settledAt` — 'Mark paid' chip on dashboard rows).
  - Expense split semantics: each participant's `amount` is **what they owe back to the payer** — "payer covered it" = payer `0.00`, borrower = full amount. Dashboard "You owe" is the current user's share on expenses someone else paid.
- `lib/db.ts` — Prisma singleton with `Pool` + `PrismaPg` adapter, SSL `rejectUnauthorized: false`.
- `lib/supabase.ts` — browser + server supabase client factories (`createServerClient` has cookie read/write; `createServerClientReadOnly` is for Server Components).
- `lib/users.ts` — `ensureUserRow` (find-or-create/merge auth user's DB row), `addContact` (add a lightweight friend contact). Friends can be added by name with an optional email.
- `lib/expenses.ts` — balance/activity/group queries (`getBalances`, `getActivity`, `listGroups`, `listUsersForDirect`).
- `components/app-shell.tsx` — desktop sidebar (logout + avatar) and mobile header (logout icon) + bottom tab bar.
- `components/add-expense-form.tsx` — direct picker includes an inline "Add a friend by name" control; `components/invite-friend.tsx` copies a sign-up invite link (prefills `/register?name=&email=`). Balance preview under splits is sage 'X will owe you/Others will owe you' when you paid, destructive 'You will owe X' otherwise.
- `components/delete-expense-button.tsx`, `components/settle-expense-button.tsx` (Mark paid chip + static PaidChip), `components/delete-group-button.tsx` — all use the hand-written `components/ui/alert-dialog.tsx` (base-ui `AlertDialog` named import, controlled `open`; success closes via revalidation, NOT useEffect — lint forbids setState-in-effect).
- `lib/expenses.ts` `getActivity` returns `myShare` (user's split Decimal) so the dashboard can show Mark paid only for unsettled non-zero shares.

## Database

- Supabase Session pooler (IPv4, `ssl: { rejectUnauthorized: false }`).
- **Never** add `?sslmode=require` to `DATABASE_URL` — handled in Pool config.
- Models: `User`, `Group`, `GroupMember`, `Expense`, `ExpenseSplit` — UUID PKs, `Decimal(10,2)` for money, soft delete via `deletedAt DateTime?`. `User.email` is nullable — contacts (friends added by name) are `User` rows with `email: null`.
- After schema changes: `pnpm prisma:generate && pnpm prisma:push`.

## Pre-launch TODOs

- **Friend identity** (`lib/users.ts`): name-only contacts (`email: null`) never merge when the person later signs up — expenses stay on a standalone "people" row. Only email-matched contacts are silently merged; a person who registers with a different email becomes a duplicate `User` row. Revisit before launch — proposed `/auth/claim` "is this you?" confirmation (match by email + name) plus adder-side notification.
- **Email invites**: copy-link invites are shipped. Real email invites need `SUPABASE_SERVICE_ROLE_KEY` (already in `.env`, currently unused) via `auth.admin.inviteUserByEmail` — deferred to post-launch.
- **Adder-side confirmation**: show "[friend] joined" to the person who added a friend once their claim/registration happens — deferred to post-launch.
