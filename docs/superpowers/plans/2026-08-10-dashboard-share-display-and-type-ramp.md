# P1+P3 Dashboard Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surfaces each borrower's own share as the headline amount on dashboard expense rows (fixes critique P1) and aligns all off-ramp micro-text to the 0.75rem Caption token (fixes critique P3).

**Architecture:** Two contained front-end changes. Task 1 swaps three flagged `text-[…rem]` micro-sizes to Tailwind's `text-xs` (= 0.75rem = DESIGN.md Caption). Task 2 rewrites the dashboard row's right-column block so non-payer rows lead with `item.myShare` (Decimal, already returned by `getActivity`) and caption the expense total as `share of $X`; payer rows stay as-is. Task 3 updates AGENTS.md and runs the full verification gate.

**Tech Stack:** Next.js 16 (Turbopack), Tailwind v4, base-ui (render-prop polymorphic components), Prisma Decimal (`myShare`), `formatMoney` from `@/lib/money`.

## Global Constraints

- **No test framework exists in this repo.** The test cycle for every task is: `pnpm exec tsc --noEmit` (whole repo), `pnpm exec eslint <changed-files>` (0 errors), `pnpm exec prettier --check <changed-files>` (or `prettier --write` then `--check`), and a final full `pnpm build`. Escalate if any of these fail.
- Follow AGENTS.md: base-ui render prop (not asChild); no `setState` in effects (lint rule `react-hooks/set-state-in-effect` is error-level); Tailwind v4 token classes only.
- Type ramp (DESIGN.md): Caption = 0.75rem (`text-xs`), Body/Label = 0.875rem (`text-sm`). Do NOT introduce any new `text-[…rem]` values. No pre-existing `text-[0.65rem]`/`text-[0.7rem]`/`text-[0.8rem]` may remain in `app/`, `components/` after Task 1+2 (verify with grep `text-\[[0-9.]+rem\]`).
- `formatMoney` (from `@/lib/money`) already accepts `Prisma.Decimal` — used as `formatMoney(item.myShare)`.
- Commit message style (from repo history): lowercase conventional, e.g. `fix: …`, `feat: …`, `chore: …` / `docs: …`.

---
---

## Task 1: Type-ramp alignment — micro-text → `text-xs` (0.75rem)

**Files:**
- Modify: `components/ui/button.tsx:26`
- Modify: `components/app-shell.tsx:108`
- Modify: `components/settle-expense-button.tsx:33`

**Interfaces:** None outside these files. Do NOT touch `app/(app)/dashboard/page.tsx:133` — Task 2 rewrites that block and resolves it in the same stroke.

**Rationale (for implementer):** `text-xs` = 0.75rem = the DESIGN.md Caption token — the smallest permitted ramp size. Replacing each flagged literal with the ramp token clears the detector's `design-system-font-size` advisory.

- [ ] **Step 1: Edit `components/ui/button.tsx:26`** — in the `size: { sm: … }` string, replace `text-[0.8rem]` with `text-xs`. The sm variant then reads: `sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",`. Leave the `xs` and `default`(text-sm) variants untouched.
- [ ] **Step 2: Edit `components/app-shell.tsx:108`** — replace `text-[0.65rem]` with `text-xs` in the mobile tab-bar Link className (keep everything else in the template string).
- [ ] **Step 3: Edit `components/settle-expense-button.tsx:33`** — the `PaidChip` span: replace `text-[0.7rem]` with `text-xs`.
- [ ] **Step 4: Verify** — run:
  - `pnpm exec tsc --noEmit`
  - `pnpm exec eslint "components/ui/button.tsx" "components/app-shell.tsx" "components/settle-expense-button.tsx"`
  - `pnpm exec prettier --write "components/ui/button.tsx" "components/app-shell.tsx" "components/settle-expense-button.tsx"`
- [ ] **Step 5: Commit** — `git add -A && git commit -m "fix: bump micro-text to caption token (0.75rem)"`

## Task 2: Borrower rows headline their share

**Files:**
- Modify: `app/(app)/dashboard/page.tsx:130-139`

**Interfaces:**
- Consumes: `getActivity` from `@/lib/expenses` provides `ActivityItem.myShare: Prisma.Decimal`, `.isPayer`, `.amount`, `.participantCount` (already in the file's data flow). `formatMoney` accepts Decimals (already imported and used).
- Produces: nothing consumed downstream — this is a pure render change.

**Current block:**
```tsx
<div className="text-right">
  <p className="text-sm font-semibold">{formatMoney(item.amount)}</p>
  {item.isPayer && (
    <p className="text-[0.65rem] text-muted-foreground">
      {item.participantCount === 1
        ? '1 split'
        : `split ${item.participantCount} ways`}
    </p>
  )}
</div>
```

**Replace with:**
```tsx
<div className="text-right">
  <p className="text-sm font-semibold">
    {formatMoney(item.isPayer ? item.amount : item.myShare)}
  </p>
  <p className="text-xs text-muted-foreground">
    {item.isPayer
      ? item.participantCount === 1
        ? '1 split'
        : `split ${item.participantCount} ways`
      : `share of ${formatMoney(item.amount)}`}
  </p>
</div>
```

**Expected behavior (manual check):**
- Payer row: `$100.00` + `split 2 ways` (unchanged).
- Borrower, unsettled: `$21.00` + `share of $100.00` and the existing Mark paid chip in the title line.
- Borrower, settled ($0 myShare): `$0.00` + `share of $100.00`, no chip.
- Neutral foreground per the approved design — do NOT tint the share red.

- [ ] **Step 1: Apply the block replacement above.**
- [ ] **Step 2: Verify** — `pnpm exec tsc --noEmit`, `pnpm exec eslint "app/(app)/dashboard/page.tsx"`, `pnpm exec prettier --write "app/(app)/dashboard/page.tsx"`.
- [ ] **Step 3: Manual UAT (code-level)** — trace the ternary for: payer (amount), non-payer myShare>0 (share), non-payer myShare=0 ($0.00). Confirm no other use of `item.amount` in the right column needs changing, and the Mark paid / PaidChip spans (lines 112-124) are untouched.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "fix: show borrower share as dashboard row amount"`

## Task 3: Docs + final verification gate

**Files:**
- Modify: `AGENTS.md` (the `lib/expenses.ts` bullet in the Architecture section)

**Step 1: Update AGENTS.md** — find the line:
`- \`lib/expenses.ts\` \`getActivity\` returns \`myShare\` (user's split Decimal) so the dashboard can show Mark paid only for unsettled non-zero shares.`
and extend it to:
`- \`lib/expenses.ts\` \`getActivity\` returns \`myShare\` (user's split Decimal) so the dashboard can show Mark paid only for unsettled non-zero shares and headline that share as the amount on borrower rows (with a \`share of <total>\` caption).`

**Step 2: Full gate** — run, in order, all must pass:
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint "app/(app)/dashboard/page.tsx" "components/ui/button.tsx" "components/app-shell.tsx" "components/settle-expense-button.tsx"`
- `pnpm exec prettier --check "app/(app)/dashboard/page.tsx" "components/ui/button.tsx" "components/app-shell.tsx" "components/settle-expense-button.tsx" AGENTS.md`
- `pnpm build` (expect 11 routes, prebuild runs `prisma generate`)
- `grep -rn "text-\[[0-9.]*rem\]" app components` → must return 0 matches
- `node .opencode/skills/impeccable/scripts/detect.mjs --json "app/(app)/dashboard/page.tsx" app components` → no `design-system-font-size` findings

**Step 3: Commit** — `git add -A && git commit -m "docs: note borrower share on dashboard rows"`