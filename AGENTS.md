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

- `proxy.ts` — protects `/dashboard`, redirects auth'd users away from `/login`, `/register`.
- `app/(public)/` — shared layout (header + footer) for landing/login/register pages.
- `app/auth/actions.ts` — colocated server actions for signup/login/signout.
- `app/auth/callback/route.ts` — handles email confirmation code exchange, creates `User` row.
- `lib/db.ts` — Prisma singleton with `Pool` + `PrismaPg` adapter, SSL `rejectUnauthorized: false`.
- `lib/supabase.ts` — browser and server supabase client factories.

## Database

- Supabase Session pooler (IPv4, `ssl: { rejectUnauthorized: false }`).
- **Never** add `?sslmode=require` to `DATABASE_URL` — handled in Pool config.
- Models: `User`, `Group`, `GroupMember` — UUID PKs, `Decimal(10,2)` for money, soft delete via `deletedAt DateTime?`.
- After schema changes: `pnpm prisma:generate && pnpm prisma:push`.
