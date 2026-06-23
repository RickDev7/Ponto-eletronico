# FeldOps Design Bible

> **Version:** 1.0.0  
> **Status:** Official — mandatory for all UI work  
> **Last updated:** June 2026  
> **Owners:** Design System + Platform Engineering

This document is the **single source of truth** for FeldOps visual language, interaction patterns, and component usage. No page, feature, or marketing surface may deviate from this system without an approved exception (see §12 Design Governance).

**Implementation references:**

| Layer | Path |
|-------|------|
| CSS tokens (canonical) | `src/app/globals.css` |
| TypeScript token mirror | `src/config/design-tokens.ts` |
| Component exports | `src/components/design-system/index.ts` |
| Navigation structure | `src/config/navigation.ts` |
| Migration audit | `docs/DESIGN_SYSTEM_AUDIT.md` |

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Theme System](#2-theme-system)
3. [Color Palette & Theme Tokens](#3-color-palette--theme-tokens)
4. [Typography](#4-typography)
5. [Spacing System](#5-spacing-system)
6. [Elevation, Radius & Motion](#6-elevation-radius--motion)
7. [Button System](#7-button-system)
8. [Card System](#8-card-system)
9. [Form System](#9-form-system)
10. [Table System](#10-table-system)
11. [Sidebar System](#11-sidebar-system)
12. [Empty States](#12-empty-states)
13. [Dashboard Standard](#13-dashboard-standard)
14. [Component Catalog](#14-component-catalog)
15. [UX Rules](#15-ux-rules)
16. [Responsive Rules](#16-responsive-rules)
17. [Design Governance](#17-design-governance)

---

## 1. Design Principles

FeldOps is an **enterprise field-service platform**. Every screen must feel:

| Principle | Meaning | Anti-patterns |
|-----------|---------|---------------|
| **Premium** | Refined surfaces, intentional whitespace, no visual noise | Gradients everywhere, heavy shadows, decorative clutter |
| **Enterprise** | Dense-but-readable data, role-aware navigation, audit-friendly | Consumer-game UI, playful copy in admin areas |
| **Fast** | Skeleton loaders, optimistic UI where safe, ≤200ms transitions | Blocking spinners on full pages, layout shift |
| **Clean** | One primary action per region, clear hierarchy | Competing CTAs, mixed alignment |
| **Modern** | Flat cards, subtle borders, token-based color | Hardcoded hex in feature code, legacy Bootstrap patterns |
| **Trustworthy** | Consistent states, accessible contrast, explicit errors | Silent failures, ambiguous destructive actions |

**North-star references:** Stripe (density + clarity), Linear (speed + focus), Attio (CRM polish), Notion (content hierarchy), Monday (operational boards).

**Golden rule:** If a token exists, use it. Never invent a one-off color, radius, or shadow in feature code.

---

## 2. Theme System

### 2.1 Modes

| Mode | Default | Behavior |
|------|---------|----------|
| **Light** | ✅ Yes | Application default for new users |
| **Dark** | — | Full token swap via `.dark` on `<html>` |
| **System** | — | Follows `prefers-color-scheme`; persisted preference wins |

### 2.2 Implementation

- **Provider:** `next-themes` with storage key `feldops-theme`
- **Profile sync:** `ThemePreferenceSync` reads `profiles.theme`
- **CSS:** Semantic tokens (`--background`, `--foreground`, `--primary`, …) in `:root` and `.dark`
- **Design namespace:** `--ds-*` mirrors for documentation and marketing fallbacks

### 2.3 Rules

1. All product UI must render correctly in **both** light and dark.
2. Marketing pages use the same token stack (no isolated dark-only auth islands).
3. Charts use `--chart-1` … `--chart-5` (theme-aware).
4. Never hardcode `#FFFFFF` / `#0F172A` in TSX — use `bg-background`, `text-foreground`, etc.
5. Sidebar uses dedicated `--sidebar-*` tokens (distinct surface in dark mode).

---

## 3. Color Palette & Theme Tokens

### 3.1 Light Palette (default)

| Token | Hex | Tailwind / CSS | Usage |
|-------|-----|----------------|-------|
| Background | `#F8FAFC` | `bg-background` | App canvas |
| Sidebar | `#FFFFFF` | `bg-sidebar` | Primary navigation |
| Card | `#FFFFFF` | `bg-card` | Panels, KPIs, tables |
| Border | `#E2E8F0` | `border-border` | Dividers, inputs |
| Text Primary | `#0F172A` | `text-foreground` | Headings, body |
| Text Secondary | `#64748B` | `text-muted-foreground` | Labels, hints |
| Primary | `#2563EB` | `bg-primary`, `text-primary` | CTAs, links, focus ring |
| Success | `#22C55E` | `text-success`, `--success` | Completed, positive trend |
| Warning | `#F59E0B` | `text-warning`, `--warning` | Pending, attention |
| Danger | `#EF4444` | `text-destructive`, `--destructive` | Errors, delete |
| Muted surface | `#F1F5F9` | `bg-muted` | Hover, secondary fills |
| Accent | `#EFF6FF` | `bg-accent` | Selected row, subtle highlight |

### 3.2 Dark Palette

| Token | Hex | Tailwind / CSS | Usage |
|-------|-----|----------------|-------|
| Background | `#0F172A` | `bg-background` | App canvas |
| Sidebar | `#111827` | `bg-sidebar` | Navigation (deeper than canvas) |
| Card | `#1E293B` | `bg-card` | Elevated surfaces |
| Border | `#334155` | `border-border` | Dividers |
| Text Primary | `#F8FAFC` | `text-foreground` | Headings, body |
| Text Secondary | `#CBD5E1` | `text-muted-foreground` | Labels |
| Primary | `#3B82F6` | `bg-primary` | CTAs (lighter for contrast) |
| Success | `#22C55E` | unchanged | Semantic |
| Warning | `#F59E0B` | unchanged | Semantic |
| Danger | `#EF4444` | unchanged | Semantic |

### 3.3 CSS Variable Map

```css
/* Light + dark defined in src/app/globals.css */
--ds-color-background
--ds-color-foreground
--ds-color-surface
--ds-color-border
--ds-color-primary
--ds-color-secondary
--ds-color-muted
--ds-color-success
--ds-color-warning
--ds-color-danger
```

Tailwind utilities: `bg-ds-background`, `text-ds-primary`, `shadow-ds-soft`, `rounded-ds-lg`, `spacing-ds-16`, `text-h1`, `text-body`, `text-small`.

### 3.4 Semantic Color Usage

| Intent | Light/Dark token | Never use |
|--------|------------------|-----------|
| Primary action | `primary` | Random blue hex |
| Destructive | `destructive` | `bg-red-600` inline |
| Success KPI | `success` | `text-emerald-600` |
| Warning badge | `warning` | `text-amber-600` |
| Disabled | `opacity-50` + `pointer-events-none` | Gray custom hex |

---

## 4. Typography

### 4.1 Font Family

**Official:** Inter  
**Fallback stack:** `Inter, ui-sans-serif, system-ui, sans-serif`

> **Migration note:** Root layout currently loads Geist Sans. New work must not add Geist-specific assumptions. Typography scale below is font-agnostic; switch to Inter via `next/font/google` in a dedicated migration PR.

### 4.2 Type Scale

| Role | Size | Line height | Weight | Letter-spacing | CSS utility | Use |
|------|------|-------------|--------|----------------|-------------|-----|
| **Display** | 48px / 3rem | 1.1 | 700 | -0.02em | `text-display` | Marketing hero only |
| **H1** | 36px / 2.25rem | 1.2 | 600 | -0.015em | `text-h1` | Page titles (rare) |
| **H2** | 30px / 1.875rem | 1.25 | 600 | -0.01em | `text-h2` | Section titles (marketing) |
| **H3** | 24px / 1.5rem | 1.3 | 600 | -0.005em | `text-h3` | Modal titles, major sections |
| **H4** | 20px / 1.25rem | 1.35 | 600 | 0 | `text-base font-semibold` | Card headers, subsections |
| **Body** | 16px / 1rem | 1.5 | 400 | 0 | `text-body` / `text-sm` | Default UI copy |
| **Caption** | 12px / 0.75rem | 1.4 | 400 | 0 | `text-[12px]` | Meta, timestamps, table hints |

**Product default:** Page chrome uses **H4-equivalent** via `PageHeader` (`text-base font-semibold`). Reserve H1–H3 for marketing and empty states.

### 4.3 Typography Rules

1. **One H1 per route** — via `PageHeader` or marketing hero.
2. **Tabular numbers** for KPIs and financial data: `tabular-nums`.
3. **Truncation:** `truncate` on labels in tables and sidebar; full text in tooltip.
4. **No ALL CAPS** except sidebar section labels (`text-[10px] uppercase tracking-wider`).
5. **i18n:** German copy may run longer — always test `de`/`pt`/`en` without fixed-width containers.

---

## 5. Spacing System

**Base unit:** 4px. Use only this scale globally.

| Token | px | rem | Tailwind | Typical use |
|-------|-----|-----|----------|-------------|
| `ds-4` | 4 | 0.25 | `p-1`, `gap-1` | Icon padding, tight chips |
| `ds-8` | 8 | 0.5 | `p-2`, `gap-2` | Button groups, inline gaps |
| `ds-12` | 12 | 0.75 | `p-3`, `gap-3` | Compact card padding |
| `ds-16` | 16 | 1 | `p-4`, `gap-4` | Standard card body, form fields |
| `ds-24` | 24 | 1.5 | `p-6`, `gap-6` | Section spacing |
| `ds-32` | 32 | 2 | `p-8`, `gap-8` | Page sections |
| `ds-48` | 48 | 3 | `py-12` | Empty states |
| `ds-64` | 64 | 4 | `py-16` | Marketing sections |

**Layout rhythm:**

- Page horizontal padding: `px-4 lg:px-6`
- Stack gap between sections: `gap-6` (24px)
- Card internal padding: `p-4` (16px) default, `p-3` compact
- Form field vertical gap: `space-y-4`

---

## 6. Elevation, Radius & Motion

### 6.1 Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `ds-sm` | 4px | Badges, tiny chips |
| `ds-md` | 8px | Inputs, buttons (internal `--radius`) |
| `ds-lg` | 12px | **Cards (default)**, dropdowns |
| `ds-xl` | 16px | Modals, marketing device frames |

**Rule:** Cards and buttons use `rounded-lg`. Do not mix `rounded-xl` / `rounded-2xl` in product UI without approval.

### 6.2 Shadows

| Token | Use |
|-------|-----|
| `shadow-ds-soft` | Cards at rest, inputs |
| `shadow-ds-medium` | Dropdowns, popovers |
| `shadow-ds-large` | Modals, command palette |

Dark mode shadows are stronger (see `globals.css`).

### 6.3 Motion

| Token | Duration | Use |
|-------|----------|-----|
| `ds-duration-fast` | 150ms | Hover, toggle |
| `ds-duration-normal` | 200ms | Sidebar collapse, theme switch |
| `ds-duration-slow` | 300ms | Page transitions ( sparingly ) |

Utility: `ds-transition` on interactive elements.

**Reduced motion:** Respect `prefers-reduced-motion` for decorative animations (KPI float, marketing).

---

## 7. Button System

**Canonical component:** `src/components/ui/button.tsx`

### 7.1 Variants

| Variant | Token basis | When to use |
|---------|-------------|-------------|
| **Primary** (`default`) | `bg-primary text-primary-foreground` | One main action per view region |
| **Secondary** | `bg-secondary` | Alternative positive actions |
| **Outline** | `border-border bg-background` | Secondary actions, filters |
| **Ghost** | transparent + `hover:bg-muted` | Toolbar, table row actions |
| **Danger** (`destructive`) | `bg-destructive/10 text-destructive` | Delete, irreversible (confirm first) |
| **Link** | `text-primary underline` | Inline text actions |

### 7.2 Sizes

| Size | Height | Use |
|------|--------|-----|
| `xs` | 24px | Dense tables |
| `sm` | 28px | Toolbars |
| `default` | 32px | **Standard** |
| `lg` | 36px | Auth forms, marketing CTAs |
| `icon` | 32×32 | Icon-only actions |

### 7.3 States

| State | Implementation |
|-------|----------------|
| **Loading** | `loading={true}` — shows spinner, disables click |
| **Disabled** | `disabled` — 50% opacity, no pointer events |
| **Focus** | `focus-visible:ring-3 ring-ring/50` |
| **Invalid** | `aria-invalid` — destructive ring on form submit |

### 7.4 Rules

1. Max **one** primary button in `PageHeader.actions`.
2. Destructive actions require **Confirmation Dialog** (see §14).
3. Never use raw `<button>` with custom colors in feature code.
4. Icon + label: icon 16px (`size-4`), gap 6px.

---

## 8. Card System

**Canonical primitives:**

- Base: `src/components/ui/card.tsx` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`)
- App-level: `src/components/shared/card.tsx`, `SectionCard`, `KpiCard`

### 8.1 Standard Card Spec

| Property | Value |
|----------|-------|
| Background | `bg-card` |
| Border | `border border-border` |
| Radius | `rounded-lg` (12px) |
| Shadow | none at rest; optional `shadow-ds-soft` on hover for clickable cards |
| Padding | `p-4` (16px) — header/content/footer |
| Header | Title H4 + optional description caption |
| Footer | `border-t border-border pt-4` when actions present |

### 8.2 Card Types

| Type | Component | Use |
|------|-----------|-----|
| **Section** | `SectionCard` | Grouped settings, form sections |
| **KPI** | `KpiCard` | Metrics strip / dashboard |
| **Stat strip** | `KpiCard variant="strip"` | Stripe-style inline metrics |

### 8.3 Rules

1. One concept per card — don't nest cards more than one level deep.
2. Clickable entire card: use `KpiCard href` or wrap with semantic link + hover `bg-muted/20`.
3. Loading: `DashboardSkeleton` or card-level `animate-pulse` — never blank flash.

---

## 9. Form System

**Primitives:** `Input`, `Label`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Form` (react-hook-form + zod) in `src/components/ui/`.

### 9.1 Field Anatomy

```
Label (text-sm font-medium)
Control (h-10 rounded-lg border-input)
Hint / FormMessage (text-xs text-muted-foreground | text-destructive)
```

### 9.2 Control Specs

| Control | Height | Radius | Notes |
|---------|--------|--------|-------|
| Input | 40px (`h-10`) | `rounded-lg` | `aria-invalid` on error |
| Select | 40px | match input | Same width as sibling inputs |
| Textarea | min 80px | `rounded-lg` | Auto-resize optional |
| Search | 32–40px | with leading icon | Debounce 300ms |
| Date picker | 40px | calendar popover | Locale-aware (`de-DE` default) |

### 9.3 Validation

1. **Client:** zod schema + `@hookform/resolvers/zod`
2. **Server:** action returns `{ success: false, error }` → toast + field errors
3. **Inline errors:** `FormMessage` below field — never only toast for field-level issues
4. **Required:** asterisk in label OR `(required)` in caption — consistent per module

### 9.4 Form Layout

- Single column on mobile; two-column `grid md:grid-cols-2 gap-4` on desktop for short fields
- Primary submit bottom-right or full-width on mobile
- Cancel = `outline` or `ghost`, left of submit

---

## 10. Table System

**Primitive:** `src/components/ui/table.tsx` + feature wrappers.

### 10.1 Required Features (all data tables)

| Feature | Requirement |
|---------|-------------|
| **Sticky header** | `sticky top-0 z-10 bg-card` on `<thead>` |
| **Search** | Debounced; persists in URL `?q=` when paginated |
| **Filters** | Filter bar above table; active count badge |
| **Bulk actions** | Appear when rows selected; bar above table |
| **Pagination** | Bottom-right; page size 25 default (`PAGINATION.defaultPageSize`) |
| **Empty state** | Full `EmptyState` when zero rows (not empty table body) |
| **Loading** | Skeleton rows or `DashboardSkeleton` |

### 10.2 Density

| Mode | Row padding | Activation |
|------|-------------|------------|
| Comfortable | `--ui-table-cell-py: 0.625rem` | Default |
| Compact | `0.375rem` | `html[data-density="compact"]` |

Apply class `ui-density-table` on `<table>`.

### 10.3 Row States

- Hover: `hover:bg-muted/40`
- Selected: `bg-primary/5`
- Clickable row: cursor-pointer + navigate on click (preserve checkbox hit area)

---

## 11. Sidebar System

**Canonical:** `src/components/design-system/layout/sidebar.tsx` + `AppSidebar`

### 11.1 Structure

| Section | Nav key | Icon family |
|---------|---------|-------------|
| Overview | Dashboard, Tasks, Calendar | `LayoutDashboard`, `ClipboardList`, `CalendarDays` |
| CRM & Sales | Commercial group | `Target` |
| Operations | Operations group | `ClipboardList` |
| Workforce | Workforce group | `Briefcase` |
| Assets | Assets group | `Package` |
| Finance | Finance group | `Wallet` |
| Analytics | Analytics group | `BarChart3` |
| Reports | Reports item | `FileText` |
| Automations | Automations item | `Zap` |
| AI | AI Assistant | `Sparkles` |
| Settings | Settings item | `Settings` |

Defined in `src/config/navigation.ts` — **do not duplicate** nav items in feature code.

### 11.2 Dimensions

| State | Width |
|-------|-------|
| Expanded | `16rem` (256px) |
| Collapsed | `3.25rem` (icon rail) |
| Mobile | Sheet `min(18rem, 100vw)` |

### 11.3 Spacing & Typography

- Section label: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2.5 pt-2`
- Nav item: `px-2.5 py-2 rounded-md gap-2.5 text-sm`
- Icon: `size-4 shrink-0`
- Item vertical gap: `space-y-0.5`

### 11.4 Active States

| State | Style |
|-------|-------|
| **Active item** | `bg-primary/10 text-primary font-medium` |
| **Hover** | `hover:bg-muted hover:text-foreground` |
| **Group expanded** | Chevron rotate; children indented |
| **Collapsed + active** | Tooltip with label on hover |

### 11.5 Collapse

- Toggle: `SidebarCollapseTrigger` in footer
- Persist: `SidebarProvider` + localStorage
- Keyboard: focus trap in mobile sheet only

---

## 12. Empty States

**Canonical:** `EmptyState` (`src/components/shared/empty-state.tsx`)

### 12.1 Required Anatomy

Every list/table/dashboard **must** implement:

1. **Icon** — Lucide, in muted container `rounded-xl border bg-muted/30`
2. **Title** — `text-sm font-medium`
3. **Description** — `text-sm text-muted-foreground max-w-sm`
4. **Primary action** — `Button` default variant
5. **Secondary action** (optional) — `Button variant="outline"` or link

### 12.2 Sizes

| Size | Padding | Use |
|------|---------|-----|
| `sm` | `py-6` | Inline panel |
| `md` | `py-10` | **Default** full page area |
| `lg` | `py-16` | Onboarding-style |

### 12.3 Copy Guidelines

- Title: state fact ("No invoices yet")
- Description: next step ("Create your first invoice to send to clients.")
- Primary CTA: verb + object ("Create invoice")

---

## 13. Dashboard Standard

Every module dashboard (Finance, Operations, Workforce, Analytics, Command Center) **must** include:

### 13.1 Layout Grid

```
PageHeader (title + actions)
KPI strip (4–6 KpiCards, responsive grid)
Main content (2/3) + Sidebar panel (1/3) — optional
Recent activity OR table preview
AI insight slot (when role permits)
```

### 13.2 Required Blocks

| Block | Component | Notes |
|-------|-----------|-------|
| **KPI Cards** | `KpiCard` | 4-up grid `grid-cols-2 lg:grid-cols-4 gap-3` |
| **Charts** | Chart primitive + `--chart-*` tokens | Legend + tooltip mandatory |
| **Quick actions** | `Button outline` row below KPIs | Max 4 actions |
| **Recent activity** | Timeline / activity feed | Last 10 items |
| **AI insights** | `AiAssistantDock` / domain widget | Supervisor+ only |

### 13.3 Loading

Use `DashboardSkeleton` until all critical KPI queries resolve. Never show partial KPIs with spinners mixed with data.

---

## 14. Component Catalog

### 14.1 Layout & Chrome

| Component | Path | Purpose |
|-----------|------|---------|
| `AppShell` | `design-system/app-shell.tsx` | Root dashboard frame |
| `PageHeader` | `shared/page-header.tsx` | Title, description, breadcrumbs, actions |
| `Header` | `design-system/layout/header.tsx` | Top bar primitives |
| `Sidebar*` | `design-system/layout/sidebar.tsx` | Nav shell |
| `AuthShell` | `auth/auth-shell.tsx` | 60/40 auth split |

### 14.2 Data Display

| Component | Path | Purpose |
|-----------|------|---------|
| `KpiCard` | `shared/kpi-card.tsx` | Metric display |
| `MetricCard` | alias `KpiCard variant="strip"` | Inline metrics |
| `StatBadge` | `ui/badge.tsx` | Status chips — use semantic variants |
| `SectionCard` | `design-system/section-card.tsx` | Grouped content |
| `DataTable` | `ui/table.tsx` + toolbar wrapper | **Pattern** — build per feature using §10 |
| `Timeline` | feature components | Audit / activity — vertical line + nodes |
| `ActivityFeed` | `activity-view` patterns | Avatar + action + timestamp |

### 14.3 Inputs & Actions

| Component | Path | Purpose |
|-----------|------|---------|
| `Button` | `ui/button.tsx` | All actions |
| `Search Input` | `Input` + icon | Command palette, table search |
| `FilterBar` | **Pattern** | `task-filters`, `address-filters` as reference |
| `EmptyState` | `shared/empty-state.tsx` | Zero-data UX |

### 14.4 Overlays

| Component | Path | Purpose |
|-----------|------|---------|
| `Dialog` / `Modal` | `ui/dialog.tsx` | Forms, detail quick-view |
| `Sheet` / `Drawer` | `ui/sheet.tsx` | Mobile nav, filters panel |
| `AlertDialog` | `ui/alert-dialog.tsx` | **Confirmation Dialog** — delete/destructive |
| `DropdownMenu` | `ui/dropdown-menu.tsx` | Row actions, user menu |
| `Command` | `ui/command.tsx` | Command palette (⌘K) |

### 14.5 Import Convention

```tsx
// Preferred — public API
import { PageHeader, KpiCard, EmptyState, AppShellPage } from "@/components/design-system";

// Primitives
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
```

---

## 15. UX Rules

### 15.1 Navigation

1. User always knows: **where am I** (header title), **where can I go** (sidebar), **how to go back** (breadcrumbs on depth ≥ 2).
2. Role-gated items hidden, not disabled (except upsell surfaces).
3. Employee role → mobile workspace; never show admin nav items.

### 15.2 Feedback

| Event | Pattern |
|-------|---------|
| Success | `toast.success` — short, past tense |
| Error | `toast.error` + inline field errors for forms |
| Destructive confirm | `AlertDialog` with explicit object name |
| Long operation | Button `loading` or progress bar — not blocking modal |

### 15.3 Content

1. Sentence case for buttons ("Create invoice", not "Create Invoice").
2. Numbers: locale formatting (`de-DE` currency, dates).
3. Timestamps: relative in feeds (< 24h), absolute in audits.

### 15.4 Accessibility (minimum)

- Focus visible on all interactive elements (`ds-focus-ring`)
- Icon buttons: `sr-only` label
- Color never sole indicator — pair with icon or text
- WCAG AA contrast on text (verified for token pairs above)

### 15.5 Performance UX

- Route-level loading: `loading.tsx` skeleton matching final layout
- Prefer server components; client only for interactivity
- Images: optimized, explicit dimensions

---

## 16. Responsive Rules

### 16.1 Breakpoints (Tailwind defaults)

| Name | Min width | Layout |
|------|-----------|--------|
| Mobile | < 640px | Single column, bottom nav / sheet sidebar |
| Tablet | 640–1024px | Collapsed sidebar optional, 2-col grids |
| Laptop | 1024–1280px | Full sidebar, standard dashboard |
| Desktop | ≥ 1280px | Max content width where applicable |
| PWA | mobile viewport | Employee mobile shell — touch targets ≥ 44px |

### 16.2 Shell Behavior

| Viewport | Sidebar | Header | Notes |
|----------|---------|--------|-------|
| `< lg` | Sheet overlay | Hamburger + compact header | `MobileSidebar` |
| `≥ lg` | Fixed left | Full `AppHeader` | Collapse to icon rail |
| Employee PWA | Hidden / bottom nav | Minimal sticky header | `MobileEmployeeShell` — see **[`MOBILE_DESIGN_BIBLE.md`](./MOBILE_DESIGN_BIBLE.md)** (separate system) |

### 16.3 Touch & PWA

- Minimum tap target: **44×44px** on mobile/PWA
- Safe areas: `safe-area-pb` on bottom navigation
- Offline: `OfflineBadge` + queue indicator in employee app

### 16.4 Grid Collapse Order

1. KPI grid: `4 → 2 → 1` columns
2. Dashboard split: sidebar panel stacks below main on `< lg`
3. Tables: horizontal scroll with sticky first column optional for wide datasets

---

## 17. Design Governance

### 17.1 Authority

This Design Bible supersedes ad-hoc UI decisions. When in conflict:

1. **Design Bible** (this document)
2. **`globals.css` tokens**
3. **`DESIGN_SYSTEM_AUDIT.md`** migration status
4. Feature-specific READMEs

### 17.2 Compliance Checklist (PR review)

Every UI PR must satisfy:

- [ ] Uses semantic tokens only (no new hardcoded hex in TSX)
- [ ] Light + dark tested
- [ ] Uses canonical components from §14
- [ ] Page has `PageHeader` where applicable
- [ ] Lists/tables have `EmptyState`
- [ ] Destructive flows use `AlertDialog`
- [ ] Forms use zod + `FormMessage`
- [ ] Responsive at mobile + desktop
- [ ] Nav items added only via `navigation.ts`

### 17.3 Exception Process

1. Open issue tagged `design-exception`
2. Document: surface, rationale, duration, screenshot
3. Approval: product + design system maintainer
4. Must include removal/migration ticket if temporary

### 17.4 Versioning

| Change type | Version bump |
|-------------|--------------|
| Token value change | Minor (1.x) + migration note |
| New component in catalog | Minor |
| Breaking component API | Major (x.0) |
| New required dashboard block | Minor + audit update |

### 17.5 Migration Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Tokens, auth shell, sidebar, core exports | ✅ Done |
| **Phase 2** | Unified KPI, table toolbar, remove hex from marketing | In progress |
| **Phase 3** | All module views → Design Bible compliance | Planned |
| **Phase 4** | Inter font migration, Storybook / visual regression | Planned |

### 17.6 Anti-Patterns (automatic reject)

- Hardcoded colors: `bg-[#2563EB]`, `text-zinc-500`, `border-white/10`
- Duplicate components when canonical exists
- New sidebar nav hardcoded in feature folder
- Multiple primary buttons in one header
- Tables without empty state
- `window.confirm` for destructive actions
- Client-side only auth gates without server guards

---

## Appendix A — Quick Token Reference

```ts
// src/config/design-tokens.ts
designTokens.colors.light.background  // #F8FAFC
designTokens.colors.light.primary     // #2563EB
designTokens.colors.dark.background   // #0F172A
designTokens.colors.dark.primary      // #3B82F6
designTokens.spacing[16]              // 1rem
designTokens.typography.h3.size         // 1.5rem
```

## Appendix B — Auth & Marketing

Auth surfaces use `AuthShell` (60% brand panel / 40% form). Marketing uses same tokens as product — see `marketing-ui.tsx` for approved preview components.

## Appendix C — Related Documents

- `docs/DESIGN_SYSTEM_AUDIT.md` — gap analysis and file-level migration tracker
- `docs/ARCHITECTURE.md` — routing and layout architecture
- `AGENTS.md` — agent rules for Next.js conventions

---

*FeldOps Design Bible v1.0.0 — All interfaces must conform. No exceptions without governance approval.*
