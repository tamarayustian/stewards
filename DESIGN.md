---
name: Stewards
description: Split expenses with friends. No spreadsheets needed.
colors:
  background: oklch(0.983 0.008 85)
  foreground: oklch(0.12 0.015 50)
  card: oklch(0.995 0.004 85)
  card-foreground: oklch(0.12 0.015 50)
  fired-clay: oklch(0.62 0.12 35)
  fired-clay-foreground: oklch(0.985 0 0)
  warm-beige: oklch(0.95 0.01 85)
  warm-beige-foreground: oklch(0.2 0.015 50)
  muted: oklch(0.96 0.008 85)
  muted-foreground: oklch(0.5 0.015 50)
  sage-leaf: oklch(0.52 0.08 140)
  sage-leaf-foreground: oklch(0.985 0 0)
  destructive: oklch(0.577 0.18 27)
  border: oklch(0.9 0.008 85)
  input: oklch(0.9 0.008 85)
  ring: oklch(0.62 0.12 35)
  dark-background: oklch(0.15 0.012 50)
  dark-foreground: oklch(0.95 0.008 85)
  dark-card: oklch(0.185 0.012 50)
  dark-fired-clay: oklch(0.72 0.1 35)
  dark-warm-beige: oklch(0.25 0.01 50)
typography:
  body:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "clamp(2.25rem, 7vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "'Plus Jakarta Sans', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
  mono:
    fontFamily: "'Geist Mono', monospace"
    fontSize: "0.875rem"
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
components:
  button-default:
    backgroundColor: oklch(0.62 0.12 35)
    textColor: oklch(0.985 0 0)
    rounded: 0.625rem
    padding: 8px 16px
    height: 32px
  button-default-hover:
    backgroundColor: oklch(0.62 0.12 35 / 0.8)
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: 0.625rem
    borderColor: "{colors.border}"
    padding: 8px 16px
    height: 32px
  button-outline-hover:
    backgroundColor: "{colors.warm-beige}"
  button-ghost:
    rounded: 0.625rem
    padding: 8px 16px
    height: 32px
  button-ghost-hover:
    backgroundColor: "{colors.warm-beige}"
  button-destructive:
    backgroundColor: oklch(0.577 0.18 27 / 0.1)
    textColor: oklch(0.577 0.18 27)
    rounded: 0.625rem
  input:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    borderColor: "{colors.input}"
    rounded: 0.625rem
    height: 32px
    padding: 4px 10px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: 0.875rem
    padding: 16px
---

# Design System: Stewards

## 1. Overview

**Creative North Star: "The Shared Table"**

Stewards' visual system is gathered around a warm wooden table — communal, grounded, generous. The palette draws from fired clay, dried herbs, and well-worn surfaces. The system rejects cold corporate finance aesthetics (no navy-on-gray dashboards, no mint-green data viz) and anything that feels like accounting software. Instead, it feels like sorting out the bill at the end of a good dinner: warm lighting, trusted company, no confusion.

The aesthetic is warm-flat: no shadows, no glassmorphism, no gradient text. Depth is conveyed through tonal layering of warm earth surfaces. Typography is friendly and approachable (Plus Jakarta Sans everywhere), with generous spacing that gives the interface room to breathe. Motion, when added, should feel like a considered response — never decorative or bouncy.

**Key Characteristics:**
- Warm, flat, tonal — depth through surface color, not shadows
- Clay and herb palette (terracotta primary, sage accent, warm neutrals)
- Single sans-serif family for harmony; weight and size carry hierarchy
- Generous whitespace — nothing feels cramped or dense
- Friendly without being childish; trustworthy without being corporate

## 2. Colors

A warm earth palette anchored by fired clay, cooled subtly by sage leaf. Neutrals are tinted warm (chroma ~0.008 toward 85°) rather than pure gray, giving the entire interface a gentle ambient warmth.

### Primary
- **Fired Clay** (`oklch(0.62 0.12 35)`): The primary interactive color — buttons, links, active states, the brand's most visible voice. On dark backgrounds shifts to `oklch(0.72 0.1 35)` for readability.
- **Fired Clay Glow** (`oklch(0.62 0.12 35 / 0.8)`): Hover state for primary buttons.

### Accent
- **Sage Leaf** (`oklch(0.52 0.08 140)`): Secondary accent for positive signals (settled balances, success messages, "you're owed" amounts). On dark backgrounds shifts to `oklch(0.65 0.08 140)`.

### Neutral
- **Warm Paper** (`oklch(0.995 0.004 85)`): Surface background for cards and raised containers. Nearly white with a whisper of warmth.
- **Ambient** (`oklch(0.983 0.008 85)`): Page background. Barely-there warmth, never cream.
- **Warm Beige** (`oklch(0.95 0.01 85)`): Muted surfaces, hover states, secondary backgrounds.
- **Warm Sand** (`oklch(0.9 0.008 85)`): Borders, input strokes, dividers.
- **Clay Ink** (`oklch(0.12 0.015 50)`): Body text, headings — a deep warm brown, never pure black.
- **Muted Ink** (`oklch(0.5 0.015 50)`): Secondary text, placeholders, muted labels.

### Feedback
- **Warm Red** (`oklch(0.577 0.18 27)`): Destructive actions, error states, "you owe" amounts.

### Named Rules
**The One Hue Rule.** All neutrals are tinted toward the same warm hue (85°). No cool grays anywhere in the system. A gray element is an error.

**The Rarity Rule.** The fired clay primary accent should occupy ≤15% of any given screen. Its restraint is what gives it impact. Overuse makes the interface feel hot and aggressive.

## 3. Typography

**Display & Body Font:** Plus Jakarta Sans (with system sans-serif fallback)
**Mono Font:** Geist Mono (code, amounts, email addresses)

**Character:** Plus Jakarta Sans is a warm humanist sans-serif — rounded without being soft, friendly without being casual. It carries the brand's warmth at every weight. The single-family approach means hierarchy is carried entirely through size, weight, and spacing, not font switches.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 7vw, 3.5rem)`, 1.1, `-0.03em`): Hero headlines only. `text-wrap: balance`. Cap at 6rem max.
- **Headline** (600, `1.25rem`, 1.3): Section headings.
- **Title** (600, `1rem`, 1.4): Card titles, small section headers.
- **Body** (400, `0.875rem`, 1.5): Paragraphs, descriptions, most UI text. Max line length 70ch.
- **Label** (500, `0.875rem`, 1): Form labels, small metadata. All sentence case.
- **Caption** (400, `0.75rem`, 1.4): Auxiliary text, timestamps, helper text.

## 4. Elevation

**Flat by default.** Stewards uses no shadows. Depth is conveyed entirely through tonal layering: a darker surface sits behind, a lighter surface sits in front. The card variant uses a subtle `ring-1 ring-foreground/10` for edge definition instead of a drop shadow.

The system never uses:
- Box shadows of any kind
- Backdrop blur or glass effects
- Gradient overlays for depth

Hover states on interactive elements use background-color shifts, not lift (translateY or shadow). The single exception: pressed state uses `translate-y-px` for tactile feedback on buttons.

## 5. Components

### Buttons

Confident, warm, slightly rounded. All buttons share `rounded-lg` (0.625rem) and the same base typography (500 weight, `0.875rem`). Default height is 32px.

- **Primary (Fired Clay):** Background `oklch(0.62 0.12 35)`, white text. Hover shifts to 80% opacity of the same color. Pressed shifts down 1px. Focus-visible uses a ring ring.
- **Outline:** Transparent background, `warm-sand` border, body text color. Hover fills with warm beige. Used for secondary actions (Sign in, Cancel).
- **Ghost:** No border or background at rest. Hover fills with warm beige. Used for minimal actions (icon buttons, less prominent controls).
- **Destructive:** Transparent background with `warm-red` at 10% opacity, warm red text. Hover doubles the tint.
- **Link:** Text only with underline-on-hover. Used for inline navigation.

All buttons use `transition-all` with default timing (150–200ms). Icons inside buttons are `size-4`, inline with `gap-1.5` spacing.

### Cards

Raised containers with `rounded-xl` (0.875rem), warm white (`--card`) background, and a subtle `ring-1 ring-foreground/10` border. Internal padding is 16px (`p-4`). No shadows. Cards have a `sm` variant with 12px internal spacing.

Card groups in grids use gap-4 spacing. Nested cards are forbidden — if a section needs grouping within a card, use a different container pattern (separator, inset group).

### Inputs

Clean, minimal text fields with `rounded-lg` (0.625rem), transparent background, and a `warm-sand` (`--input`) border stroke. Height is 32px. Focus draws the border to the ring color (`fired clay`) and adds a subtle `3px ring-ring/50` glow. Disabled fields recolor to 50% opacity with a tinted background. Placeholder text uses `muted-ink` (`oklch(0.5 0.015 50)`).

### Avatar

Circular (`rounded-full`), 32px default. Fallback initials on a warm beige background in muted ink. Sizes: sm (24px), default (32px), lg (40px). Used primarily for user profiles in the dashboard header.

### Separator

A single horizontal/vertical stroke in `warm-sand` (`--border`). No frills, no ornamentation. Used to divide content sections and list items.

## 6. Do's and Don'ts

### Do:
- **Do** use the warm earth palette exclusively — no cool grays, no pure white (`#fff`), no pure black (`#000`).
- **Do** keep primary (fired clay) usage under 15% of any screen to preserve its impact.
- **Do** use tonal layering for depth instead of shadows.
- **Do** use Plus Jakarta Sans for all UI text — no swapping to another face for variety.
- **Do** keep body text at `muted-ink` or darker for WCAG AA contrast against the warm off-white background.
- **Do** use `text-wrap: balance` on headings, `text-wrap: pretty` on body.
- **Do** keep card usage purposeful — not as a default layout container for every section.

### Don't:
- **Don't** use shadows, box-shadows, backdrop-filter, or glass effects.
- **Don't** use gradient text, gradient backgrounds, or gradient overlays.
- **Don't** use side-stripe borders (border-left > 1px as a colored accent on cards or list items).
- **Don't** use the hero-metric template (big number + small label + gradient accent).
- **Don't** use dense gray-on-gray tables or spreadsheet-style layouts — this is not accounting software.
- **Don't** use tiny uppercase tracked eyebrow text above sections.
- **Don't** nest cards.
- **Don't** default to pure white or pure black anywhere — always use the warm-toned tokens.
- **Don't** let text overflow its container at any breakpoint.
- **Don't** add animations that don't respect `prefers-reduced-motion`.
