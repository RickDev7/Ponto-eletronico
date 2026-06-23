# FeldOps Design System Audit & Migration Plan

> **Official standard:** [`DESIGN_BIBLE.md`](./DESIGN_BIBLE.md) — mandatory for all UI work.  
> Generated as part of the enterprise UI unification initiative.  
> **Source of truth:** `src/app/globals.css` + `src/config/design-tokens.ts`

---

## Executive Summary

The platform had **three parallel UI layers** (`ui/`, `shared/`, `design-system/`) with tokens defined but rarely consumed, **fragmented auth visuals** (dark login vs light register), and **duplicate KPI/card/header patterns** across feature modules.

**Phase 1 (completed in this pass)** establishes the foundation: unified theme tokens, auth shell, sidebar hierarchy, component consolidation entry points, and marketing theme alignment.

**Phase 2–4** roll the same language through every module view without adding business features.

---

## 1. UI Inconsistencies Found

| Area | Issue | Severity |
|------|-------|----------|
| Auth | Login used hardcoded dark zinc/glass; register/reset used light split layout | Critical |
| Auth | Onboarding used separate dark grid layout | High |
| Marketing | Hex colors hardcoded (`#F8FAFC`, `#2563EB`); no dark mode | High |
| Tokens | `--ds-*` utilities defined in CSS but unused in TSX | Medium |
| Tokens | `tailwind.config.ts` exported stale dark-only hex values | Medium |
| Cards | `ui/card` uses `rounded-xl`; `shared/card` used `rounded-md` | Medium |
| KPI | Three KPI implementations (design-system, shared, finance) | Medium |
| Page headers | Two `PageHeader` components with different typography | Medium |
| Empty states | Two `EmptyState` components | Low |
| Sidebar | Shadcn `ui/sidebar.tsx` (~700 lines) unused; custom sidebar active | Low |
| Semantic colors | `emerald-600 dark:emerald-400` inline across features | Medium |
| Tables | Mixed density; no unified toolbar pattern | Medium |
| Mobile PWA | Separate nav shell (intentional) but spacing differs from dashboard | Low |

---

## 2. Duplicate Components

| Keep (canonical) | Deprecate / merge | Notes |
|------------------|-------------------|-------|
| `ui/button.tsx` | — | Added `loading` prop |
| `ui/card.tsx` | — | Base primitive |
| `shared/card.tsx` | — | App-level variants aligned to tokens |
| `shared/page-header.tsx` | `design-system/page-header.tsx` | DS now re-exports shared |
| `shared/empty-state.tsx` | `design-system/empty-state.tsx` | DS now re-exports shared |
| `design-system/layout/sidebar.tsx` | `ui/sidebar.tsx` | Remove Shadcn sidebar when confirmed zero imports |
| `shared/kpi-card.tsx` | `design-system/kpi-card.tsx` | Merge in Phase 2 |
| `finance-kpi-card.tsx` | — | Refactor strips to use unified KPI in Phase 2 |
| `auth-shell.tsx` | `auth-centered-layout.tsx` | Centered layout wraps AuthShell |
| `marketing/device-frame.tsx` | — | Now uses CSS variables |

---

## 3. Duplicate Styles

- **Backgrounds:** `bg-zinc-900`, `bg-[#0A0A0A]`, `bg-background` used interchangeably
- **Borders:** `border-white/[0.08]`, `border-border/60`, `ring-foreground/10`
- **Text:** `text-zinc-500` vs `text-muted-foreground`
- **Radius:** `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` without system
- **Shadows:** Custom box-shadow strings vs `shadow-ds-soft/medium/large`

**Rule going forward:** Use semantic tokens only — `bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `shadow-ds-*`, `rounded-lg`.

---

## 4. Pages Needing Redesign (by priority)

### P0 — Auth & first impression ✅ (Phase 1)
- [x] Login
- [x] Register
- [x] Reset password
- [x] Update password
- [x] Onboarding (minimal shell)

### P1 — Marketing & public
- [ ] Landing (`landing-page.tsx`) — replace hex with tokens
- [ ] Pricing
- [ ] Features / Demo / Contact
- [ ] Legal pages

### P2 — Dashboard shell (partial ✅)
- [x] Sidebar sections & active states
- [ ] App header density alignment
- [ ] Bottom nav mobile polish

### P3 — Module views (same pattern each)
Apply: `PageHeader` + KPI strip + `Card` + `EmptyState` + table toolbar

| Module | View file(s) |
|--------|--------------|
| Dashboard | `dashboard-view.tsx` |
| CRM | `crm-*`, `leads-view`, `clients-view` |
| Operations | `operations-*-view.tsx` |
| Workforce | `workforce-*`, `personnel-planning-view` |
| Finance | `finance/*`, `invoices-view`, `contracts-view` |
| Analytics | `analytics-*` |
| Settings | `settings-view`, `*-form.tsx` |
| Client portal | `client-portal-*` |
| Super admin | `platform-shell` |
| Mobile PWA | `employee-*`, `mobile/*` |

---

## 5. Design System Structure

```
src/app/globals.css          ← CSS tokens (:root, .dark, --ds-*)
src/config/design-tokens.ts  ← TS reference (non-authoritative)
src/config/theme.ts          ← next-themes (light / dark / system)

src/components/ui/           ← Shadcn primitives (Button, Input, Card, Table…)
src/components/shared/       ← App wrappers (Card, PageHeader, EmptyState, workspace)
src/components/design-system/← Layout shell, re-exports, KPI primitives
src/components/auth/         ← AuthShell, AuthBrandPanel, forms
src/components/marketing/    ← Public pages (migrate to tokens)
src/components/features/     ← Domain views (consume shared/DS only)
```

### Token namespaces

| Token | Light | Dark | Tailwind |
|-------|-------|------|----------|
| background | `#F8FAFC` | `#0F172A` | `bg-background` |
| foreground | `#0F172A` | `#F8FAFC` | `text-foreground` |
| card | `#FFFFFF` | `#1E293B` | `bg-card` |
| border | `#E2E8F0` | `#334155` | `border-border` |
| primary | `#2563EB` | `#3B82F6` | `bg-primary` |
| sidebar | `#FFFFFF` | `#111827` | `bg-sidebar` |
| success | `#22C55E` | `#22C55E` | `text-success` |
| warning | `#F59E0B` | `#F59E0B` | `text-warning` |
| danger | `#EF4444` | `#EF4444` | `text-destructive` |

### Theme modes
- ☀ Light (default)
- 🌙 Dark (`.dark` class on `<html>`)
- 💻 System (`next-themes` + `localStorage` key `feldops-theme`)

---

## 6. Migration Plan

### Phase 1 — Foundation ✅
1. Align CSS + TS tokens
2. Unified `AuthShell` (60/40 brand + form)
3. Standardize login form on design tokens
4. Sidebar sections + active indicators
5. Card / Button / EmptyState / PageHeader consolidation entry points
6. Marketing layout → `bg-background`

### Phase 2 — Primitives rollout (1–2 sprints)
1. Unified `KpiCard` — merge `shared/kpi-card`, `design-system/kpi-card`, simplify `FinanceKpiCard`
2. `TableToolbar` component (search, filters, bulk actions, pagination slot)
3. `FormField` density standard (`h-10` inputs in forms, `h-8` in dense tables)
4. Replace inline semantic colors with `text-success`, `text-warning`, `StatusBadge`
5. Delete `ui/sidebar.tsx` orphan

### Phase 3 — Module pass (parallel by squad)
For each module view:
1. Replace ad-hoc headers → `PageHeader`
2. Replace empty divs → `EmptyState` with primary + secondary action
3. Replace custom cards → `shared/Card`
4. Replace hex/Tailwind palette → semantic tokens
5. Verify light + dark + responsive

### Phase 4 — Polish
1. Dashboard template (KPI row + chart + activity + AI dock spacing)
2. Motion consistency (`ds-transition`, 150–200ms)
3. Accessibility audit (contrast, focus rings, touch targets ≥ 44px mobile)
4. Visual regression (Playwright screenshots)

---

## 7. Components to Keep

- `ui/button`, `ui/input`, `ui/select`, `ui/table`, `ui/dialog`, `ui/form`
- `shared/card`, `shared/page-header`, `shared/empty-state`, `shared/workspace`
- `design-system/layout/*` (shell, sidebar, header)
- `auth/auth-shell`, `auth/auth-brand-panel`, `auth/auth-form-header`
- `theme/theme-provider`, `theme-switcher-dropdown`
- `marketing/device-frame` (token-aligned)

---

## 8. Components to Replace

| Replace | With |
|---------|------|
| Dark login glass card | `AuthShell` |
| `AuthCenteredLayout` direct usage | `AuthShell` |
| `design-system/page-header` (old) | Re-export of `shared/page-header` |
| `design-system/empty-state` (old) | Re-export of `shared/empty-state` |
| `FinanceKpiCard` in all `*-kpi-strip.tsx` | Unified `KpiCard` |
| `MarketingCard` hex styles | `Card` + tokens |
| Inline `Loader2` in buttons | `Button loading` prop |
| `ui/sidebar.tsx` | Delete (unused) |

---

## Auth Shell — Visual Standard

```
┌──────────────────────────────┬─────────────────┐
│  60% Brand Panel             │  40% Form Panel │
│  • Headline + value prop     │  • Logo         │
│  • Feature checklist         │  • Welcome      │
│  • Browser frame preview     │  • Form         │
│  • Floating KPI cards        │  • Theme switch │
│  • Trust footer              │  • Footer links │
└──────────────────────────────┴─────────────────┘
```

Mobile: brand panel hidden; form full width.

---

## Success Criteria

The platform should feel:
- **Premium** — generous whitespace, subtle shadows, no pure black
- **Enterprise** — consistent hierarchy, predictable layouts
- **Fast** — minimal decoration, 150–200ms transitions
- **Trustworthy** — light default, accessible contrast, professional auth

Target quality bar: **Linear** navigation clarity + **Stripe** auth polish + **Notion** content density options.

---

## Next Actions (recommended)

1. Run Phase 2 KPI unification (`*-kpi-strip.tsx` × ~10 files)
2. Migrate `landing-page.tsx` + `marketing-ui.tsx` off hardcoded hex
3. Add `TableToolbar` to `shared/workspace`
4. Module-by-module grep: `zinc-|slate-|#[0-9A-Fa-f]` → replace with tokens
5. Playwright visual snapshots for auth + dashboard + one module per domain
