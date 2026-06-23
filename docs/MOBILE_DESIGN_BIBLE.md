# FeldOps Mobile Design Bible

> **Version:** 2.0.0  
> **Status:** Official — mandatory for all Employee PWA work  
> **Audience:** Field employees (`role: employee`)  
> **Last updated:** June 2026  
> **Owners:** Mobile UX + Field Product + Platform Engineering

This document is the **single source of truth** for the **Employee PWA** (`/{slug}/mobile`). It is **completely independent** from the Desktop SaaS Design Bible ([`DESIGN_BIBLE.md`](./DESIGN_BIBLE.md)).

| Surface | User | Design system |
|---------|------|---------------|
| Desktop SaaS | Managers, supervisors, admins | `DESIGN_BIBLE.md` |
| Employee PWA | Field workers | **This document** |

**Implementation references:**

| Layer | Path |
|-------|------|
| Mobile tokens (TypeScript) | `src/config/mobile-design-tokens.ts` |
| Mobile CSS surface | `[data-surface="employee-mobile"]` in `src/app/globals.css` |
| Component library (v2) | `src/components/mobile/app/` |
| App shell | `src/components/mobile/mobile-employee-shell.tsx` |
| Bottom navigation | `src/components/mobile/employee-bottom-nav.tsx` (uses `AppFloatingNav`) |
| Architecture | `docs/EMPLOYEE_PWA_ARCHITECTURE.md` |

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Mobile Design Principles](#2-mobile-design-principles)
3. [Color System & Mobile Tokens](#3-color-system--mobile-tokens)
4. [Typography](#4-typography)
5. [Spacing System](#5-spacing-system)
6. [Navigation Rules](#6-navigation-rules)
7. [Screen Standards](#7-screen-standards)
8. [Component Library](#8-component-library)
9. [UX Standards](#9-ux-standards)
10. [Accessibility Rules](#10-accessibility-rules)
11. [Offline Rules](#11-offline-rules)
12. [Performance Rules](#12-performance-rules)
13. [Animations & Motion](#13-animations--motion)
14. [PWA Capabilities](#14-pwa-capabilities)
15. [Governance](#15-governance)

---

## 1. Design Philosophy

The employee may be:

- Wearing **gloves**
- **Outside** in bright sunlight or rain
- **Walking** between sites
- **Driving** (parked interactions only — never design for use while driving)
- On **poor or no internet**

The interface must be:

| Attribute | Meaning |
|-----------|---------|
| **Fast** | First paint < 1s on 4G; skeleton over spinner; optimistic where safe |
| **Simple** | One clear next action per screen |
| **Large** | 48px minimum touch targets; 16px minimum text |
| **Clear** | High contrast labels; no jargon; status always visible |
| **Touch-friendly** | Thumb-zone CTAs; no hover-only affordances |

### North-star references

| Product | What we borrow |
|---------|----------------|
| **Uber Driver** | Job-first home, large CTAs, live status |
| **Todoist Mobile** | Clean lists, satisfying completion, minimal chrome |
| **Linear Mobile** | Speed, subtle motion, focused density |
| **Google Tasks** | One-tap check-off, zero configuration |
| **Notion Mobile** | Card hierarchy, readable blocks |
| **ServiceM8** | Field-service job cards, photos, checklists |

### Anti-patterns (never use in Employee PWA)

- ERP tables, dense grids, multi-column admin layouts
- Small icon-only buttons without 44px hit area
- Hamburger menus with deep nesting
- Desktop sidebar patterns on phone
- Multi-step wizards when a single screen suffices
- Tooltips as primary information (no hover on touch)
- Competing primary CTAs

---

## 2. Mobile Design Principles

### The golden question

> **"What should the employee do next?"**

Every screen must answer this in under 2 seconds of scanning.

### Action budget per screen

| Type | Maximum |
|------|---------|
| Primary action | **1** |
| Secondary actions | **2** |
| Tertiary / links | Unlimited in scroll, never above fold |

### Tap budgets (hard limits)

| Task | Max taps |
|------|----------|
| Start a job | **3** |
| Complete a checklist item | **1** (toggle) |
| Complete full checklist flow | **3** |
| Start a shift / check-in | **2** |
| Send a message reply | **2** |

### Content rules

- **Cards, not tables.** Always.
- **Lists, not dashboards.** KPIs are 2×2 max on home.
- **Progressive disclosure.** Job detail → execute workflow, not everything at once.
- **No ERP feeling.** If it looks like SAP, redesign it.

---

## 3. Color System & Mobile Tokens

Mobile uses the same hex values as FeldOps brand colors but applies them with **mobile-specific semantics**. Tokens live in `mobile-design-tokens.ts` and CSS under `[data-surface="employee-mobile"]`.

### 3.1 Light mode

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Background | `#F8FAFC` | `--mobile-background` | App canvas |
| Card | `#FFFFFF` | `--mobile-card` | Job cards, messages, profile blocks |
| Primary | `#5B3DF5` | `--mobile-primary` | Primary CTA, active nav, links |
| Success | `#22C55E` | `--mobile-success` | Completed, checked, on-time |
| Warning | `#F59E0B` | `--mobile-warning` | In progress, pending sync, attention |
| Danger | `#EF4444` | `--mobile-danger` | Errors, cancelled, overdue |
| Text | `#111827` | `--mobile-text` | Headings, body |
| Secondary | `#6B7280` | `--mobile-secondary` | Labels, timestamps, hints |
| Border | `#E5E7EB` | `--mobile-border` | Card edges, dividers |
| Dark header | `#0F172A` | `--mobile-dark-header` | Immersive headers (execute, check-in) |

### 3.2 Dark mode

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0F172A` | Canvas |
| Card | `#1E293B` | Elevated surfaces |
| Primary | `#3B82F6` | CTAs (lighter for OLED contrast) |
| Success | `#22C55E` | Unchanged |
| Warning | `#F59E0B` | Unchanged |
| Danger | `#EF4444` | Unchanged |
| Text | `#F8FAFC` | Primary text |
| Secondary | `#CBD5E1` | Muted text |
| Border | `#334155` | Dividers |

### 3.3 Rules

1. All Employee PWA screens render under `[data-surface="employee-mobile"]`.
2. Prefer CSS variables (`var(--mobile-*)`) or utility classes scoped to that surface — avoid desktop Tailwind semantic tokens in mobile views.
3. Status colors use **tinted backgrounds** on `AppBadge` — not solid fills.
4. Active job card: `ring-2 ring-[var(--mobile-primary)]/30`.
5. Unread message/notification: primary tint + dot indicator.

---

## 4. Typography

### Font

**Inter** (via `var(--font-geist-sans)` fallback chain).

### Weights

| Weight | Use |
|--------|-----|
| Regular (400) | Body, descriptions |
| Medium (500) | Labels, nav labels |
| Semibold (600) | Card titles, section headers |
| Bold (700) | Timer, KPI values |

### Scale (minimum 16px body)

| Role | Size | Weight | Example |
|------|------|--------|---------|
| Display | 28px (`text-2xl`) | 600 | Home greeting |
| Title | 20px (`text-xl`) | 600 | Screen titles |
| Body | **16px** (`text-base`) | 400 | Message body, checklist labels |
| Label | 14px (`text-sm`) | 500 | Section eyebrows, meta |
| Caption | 13px (`text-xs`) | 400 | Timestamps — **never smaller** |

### Rules

- **No text below 13px** in Employee PWA (nav labels excepted at 10px with icon above).
- Line height ≥ 1.4 for body text.
- Truncate long addresses; never shrink font to fit.
- Tabular nums for timers and KPIs (`tabular-nums`).

---

## 5. Spacing System

Official scale (px → rem):

| Token | Value | Use |
|-------|-------|-----|
| 8 | 0.5rem | Icon gaps, tight inline spacing |
| 12 | 0.75rem | Badge padding, compact card padding |
| 16 | 1rem | Page horizontal padding, default gap |
| 24 | 1.5rem | Section separation |
| 32 | 2rem | Major section breaks |
| 48 | 3rem | Empty state vertical padding |

### Layout constants

| Constant | Value |
|----------|-------|
| Page padding X | 20px (`1.25rem`) |
| Section gap | 24px (`1.5rem`) |
| Card padding | 16–20px |
| Card radius | 20px (`1.25rem`, `--mobile-radius-card`) |
| Button radius | 16px (`1rem`, `--mobile-radius-button`) |
| Bottom nav clearance | `5.5rem + safe-area-inset-bottom` |

---

## 6. Navigation Rules

### 6.1 Bottom navigation (mandatory)

**Maximum 5 tabs.** Always visible on tab routes. Native mobile feel.

| # | Tab | Route | Icon |
|---|-----|-------|------|
| 1 | Home | `/{slug}/mobile` | Home |
| 2 | Schedule | `/{slug}/mobile/schedule` | Calendar |
| 3 | Jobs | `/{slug}/mobile/jobs` | Briefcase |
| 4 | Messages | `/{slug}/mobile/messages` | MessageSquare |
| 5 | Profile | `/{slug}/mobile/profile` | User |

**Config:** `src/components/mobile/employee-nav-config.ts`

### 6.2 When bottom nav is hidden

Immersive workflows only:

- `/mobile/services/[taskId]/execute` — full execution
- `/mobile/check-in/[taskId]` — GPS capture

Use sticky bottom action bar instead.

### 6.3 Secondary routes (no tab)

| Route | Access |
|-------|--------|
| Job detail | Jobs list → card tap |
| Execute | Job detail → Start |
| Hours | Profile shortcut |
| Vacations | Profile shortcut |
| Reports | Profile shortcut |
| Notifications | Messages → Alerts tab |

### 6.4 Navigation behavior

- **Back:** Browser back + in-flow breadcrumbs on execute steps only.
- **Deep links:** Every job has a shareable URL; must open correct screen.
- **Prefetch:** Home, Schedule, Jobs tabs prefetch on mount.
- **Unread badge:** Messages tab only; max display `9+`.
- **Active state:** `text-primary` + subtle icon fill.

### 6.5 Shell structure

```
MobileEmployeeShell [data-surface="employee-mobile"]
├── AppGreetingHeader / AppPageHeader / AppDarkHeader (per screen)
├── Main content (max-w-md, mobile-page padding)
├── EmployeeBottomNav → AppFloatingNav (fixed pill, safe-area-pb)
└── DeviceLockScreen (overlay when locked)
```

---

## 7. Screen Standards

### 7.1 Home

**Purpose:** Answer "What do I do right now?"

**Structure (top → bottom):**

1. Greeting + name
2. KPI grid (2×2) — today jobs, hours planned, hours worked, pending
3. **Current job** card (highlighted) OR **Next job**
4. Quick actions (check-in, route, open job) — max 3 buttons
5. Today's jobs preview (max 3 cards + "See all")

**No tables. No dense data.**

### 7.2 Schedule

- Segmented control: **Today | Week | Month**
- Card per shift/job — time, location, client
- Pull to refresh when online

### 7.3 Jobs

- Filter chips: Today, Pending, In progress, Completed, All
- `AppServiceCard` per row
- Each card: client, address, time, duration, priority, status
- Actions: **Open**, **Navigate**, **Start** (contextual)

### 7.4 Job detail

Workflow-oriented — not a data dump.

- Hero: title, client, address, map link
- Status badge + scheduled time
- Primary CTA: **Start** / **Continue** / **Check in**
- Secondary: Navigate, Call client (if available)

### 7.5 Job execute (workflow)

**Progress bar at top** — steps completed / total.

| Step | Section |
|------|---------|
| 1 | Overview |
| 2 | Checklist |
| 3 | Photos |
| 4 | Notes |
| 5 | Signature |
| 6 | History / summary |

One step visible at a time. Sticky bottom: **Next** or **Complete**.

### 7.6 Checklists

- `MobileChecklistCard` — one tap to toggle
- Progress: `MobileProgressCard`
- Photo-required items show camera affordance
- Offline toggles queue with conflict resolution UI

### 7.7 Photos

- Full-screen camera when capturing
- Large shutter affordance (min 64px)
- Phases: **Before | During | After**
- Preview before upload
- Offline: queue in IndexedDB, sync later

### 7.8 Time tracking

- `AppTimer` / inline elapsed display — live elapsed time
- Large buttons: **Start shift**, **Pause**, **Resume**, **Finish**
- Check-in/out tied to GPS on job site

### 7.9 Messages

WhatsApp-inspired chat UI (not email layout).

- Tabs: **Team** | **Alerts**
- `AppMessageBubble` (or thread row styled with `AppCard`) for thread items
- Attachments: tap to open signed URL
- Compose: sticky bottom form
- Push permission banner (non-blocking)

**Roadmap:** voice notes (record + upload) — design reserved, not yet shipped.

### 7.10 Profile

Card-based menu — no settings tree.

| Section | Content |
|---------|---------|
| Identity | `AppAvatar` + profile header |
| Hours | Weekly summary → `/mobile/hours` |
| Vacations | Requests → `/mobile/vacations` |
| Documents | Certificates, PDFs |
| Settings | Device lock, push, language, theme |
| Sign out | Destructive ghost button |

---

## 8. Component Library (v2)

Import from `@/components/mobile/app`.

### 8.1 Primitives (`primitives.tsx`)

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `AppScreen` | Page wrapper + padding | `children`, `className` |
| `AppCard` | Base surface | `children`, `className`, `as` |
| `AppBadge` | Status pill | `variant`, `children` |
| `AppButton` | Primary / secondary / ghost CTA | `variant`, `size`, `href` |
| `AppAvatar` | Profile image / initials | `name`, `src`, `size` |
| `AppSectionTitle` | Section header | `title`, `action` |
| `AppSkeleton` | Loading placeholder | `className` |

**Badge variants:** `default` | `primary` | `success` | `warning` | `danger`

Map task status via `taskStatusToMobileVariant()` in `src/lib/employee/mobile-job-ui.ts`.

### 8.2 Layout (`layout-parts.tsx`)

| Component | Purpose |
|-----------|---------|
| `AppSegmentTabs` | Today / Week / Month (schedule) |
| `AppFilterPills` | Jobs filter chips |
| `AppTimeline` / `AppTimelineItem` | Schedule day timeline |

### 8.3 Shell (`shell-parts.tsx`)

| Component | Purpose |
|-----------|---------|
| `AppGreetingHeader` | Home greeting + notifications |
| `AppDarkHeader` | Immersive dark header (execute, check-in) |
| `AppPageHeader` | Secondary routes (hours, vacations) |
| `AppFloatingNav` | Pill bottom nav container |
| `AppNavItem` | Single tab item |

**Production nav:** `EmployeeBottomNav` wraps `AppFloatingNav` — do not import nav directly in feature views.

### 8.4 Content blocks (`content-blocks.tsx`)

| Component | Purpose |
|-----------|---------|
| `AppNextServiceHero` | Home hero — current/next job + primary CTA |
| `AppQuickActionGrid` | 2×2 quick actions on home |
| `AppSummaryGrid` | 2×2 KPI tiles |
| `AppServiceCard` | Job list item — client, time, address, status, Start/Navigate |

### Usage example

```tsx
import {
  AppScreen,
  AppSectionTitle,
  AppServiceCard,
  AppQuickActionGrid,
} from "@/components/mobile/app";
import { Play } from "lucide-react";
import { taskStatusToMobileVariant } from "@/lib/employee/mobile-job-ui";

export function ExampleJobList() {
  return (
    <AppScreen>
      <AppSectionTitle title="Today's jobs" />
      <AppServiceCard
        clientName="Acme Corp"
        serviceType="Office cleaning"
        address="Rua das Flores 12, Lisboa"
        timeRange="09:00 – 11:00"
        statusLabel="Scheduled"
        statusVariant={taskStatusToMobileVariant("scheduled")}
        href="/company/mobile/services/abc"
      />
      <AppQuickActionGrid
        actions={[{ label: "Start next job", icon: Play, href: "/...", variant: "primary" }]}
      />
    </AppScreen>
  );
}
```

### Legacy note

The v1 library (`components/mobile/design-system/`, `MobileScreen`, `MobileJobCard`, etc.) was **removed in v2**. All new and migrated screens use `App*` components only.

---

## 9. UX Standards

### 9.1 Interaction patterns

| Pattern | Rule |
|---------|------|
| Primary CTA | Full-width or 50% grid, `h-12`, `rounded-xl` |
| Secondary | `variant="outline"`, same height |
| Destructive | Red text/border; confirm dialog for irreversible |
| Loading | Skeleton first; inline spinner on button only |
| Empty state | Icon + title + one action — never blank screen |
| Error | Toast + inline retry; never silent failure |
| Success | Toast ≤ 3s; optimistic UI where safe |

### 9.2 Job card actions

| Button | When | Position |
|--------|------|----------|
| Open | Always | Card tap or explicit |
| Navigate | Has address | 44px circle, maps deep link |
| Start | Status = scheduled | Primary quick action |

### 9.3 Form inputs

- Min height 48px
- `text-base` (16px) — prevents iOS zoom on focus
- Labels above field, not floating micro-labels
- One column only

### 9.4 Feedback

| Event | Feedback |
|-------|----------|
| Checklist toggle | Immediate visual + haptic (where supported) |
| Offline queue | Amber badge "Pending sync" |
| Sync complete | Toast + badge removal |
| Push received | System notification + in-app badge |

### 9.5 Copy tone

- Short, imperative verbs: **Start**, **Finish**, **Send**, **Navigate**
- No admin jargon: "task" → **job** / **service** in UI copy
- Errors in plain language: "No internet — saved for later"

---

## 10. Accessibility Rules

### 10.1 Touch & motor

| Rule | Value |
|------|-------|
| Minimum touch target | **48×48px** (`mobile-touch-target`) |
| Comfortable target | 56×56px for primary CTAs |
| Spacing between targets | ≥ 8px |
| No gesture-only actions | Always provide tap alternative |

### 10.2 Vision

| Rule | Requirement |
|------|-------------|
| Body text contrast | ≥ 4.5:1 (WCAG AA) |
| Large text / bold | ≥ 3:1 |
| Color alone | Never sole indicator of state — pair with icon or label |
| Sunlight | Avoid pure white `#FFF` on OLED; use `bg-background` |

### 10.3 Screen readers

- `aria-label` on icon-only buttons
- `aria-live="polite"` on timer widget
- `aria-pressed` on checklist toggles
- `role="progressbar"` on workflow progress
- Bottom nav: `aria-label` + `aria-current="page"`

### 10.4 Motion

- Respect `prefers-reduced-motion` — disable press scale and page transitions
- No autoplay animations > 5s
- Skeleton pulse is acceptable (decorative)

### 10.5 Internationalization

- All strings via `next-intl` — `employee.mobile.*` namespace
- RTL-ready layout: use logical properties where possible
- Date/time: locale-aware formatting

---

## 11. Offline Rules

Offline-first is **critical** for field work.

### 11.1 Must work offline

| Feature | Strategy |
|---------|----------|
| View schedule | IndexedDB cache + SW runtime cache |
| View jobs | Same |
| View home KPIs | Cached snapshot |
| Checklist toggle | Queue → `checklist_toggle` |
| Photos | Compress → blob store → `photo_upload` |
| Check-in / out | GPS + queue → `check_in` / `check_out` |
| Signature | PNG blob → `sign_report` |
| Message reply | Queue → `message_reply` |
| Message compose | Queue → `message_compose` |

### 11.2 Online-only (with graceful message)

| Feature | Offline behavior |
|---------|------------------|
| Attachments upload | Block with "requires internet" toast |
| Push subscribe | Hide or disable |
| AI job widget | Show cached hint or hide |
| Live map tiles | Last cached or address text only |

### 11.3 Sync UX

1. Queue action → immediate optimistic UI + amber **Pending sync** badge
2. Background Sync API when available
3. `useOfflineSync` replays on reconnect
4. Conflicts (checklist): show `ChecklistConflictPanel` — never silent overwrite

### 11.4 Cache keys

`home`, `jobs`, `schedule`, `messages`, `execution` — per `slug` + `employeeId`.

**Implementation:** `src/lib/pwa/offline-queue.ts`, `src/lib/pwa/offline-cache.ts`

---

## 12. Performance Rules

### 12.1 Targets

| Metric | Target |
|--------|--------|
| LCP (4G) | < 2.5s |
| First interaction | < 1s (skeleton visible) |
| Route transition | < 180ms |
| Image upload prep | < 500ms (client compress) |
| Offline queue replay | < 3s for 10 items |

### 12.2 Loading strategy

1. **Skeleton** (`AppSkeleton`) — never full-page spinner
2. **Stale-while-revalidate** — show cache, refresh in background
3. **Prefetch** tab routes on shell mount
4. **Lazy load** execute sub-steps below fold

### 12.3 Assets

- Compress photos client-side before queue (`compress-image.ts`)
- Max image width 1920px
- Use `next/image` with appropriate `sizes` in gallery
- Icons: Lucide, 20–24px, no custom SVG spritemap

### 12.4 JavaScript budget

- No chart libraries on mobile employee routes
- No desktop `@/components/design-system` imports in mobile views
- Code-split execute workflow

### 12.5 Service worker

- `public/sw.js` — network-first for API, cache-first for static
- Version bump on queue schema change
- `/offline` fallback page

---

## 13. Animations & Motion

| Type | Duration | Easing |
|------|----------|--------|
| Fast (press, toggle) | 120ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Normal (page, sheet) | 180ms | same |
| Slow (modal) | 240ms max | same |

### Allowed

- Press scale `0.98` on cards (`mobile-pressable`)
- Skeleton pulse
- Progress bar width transition
- Tab indicator cross-fade
- Pull-to-refresh (native overscroll)

### Avoid

- Bouncy spring animations
- Parallax scroll
- Confetti / celebration overlays
- Long choreographed sequences

---

## 14. PWA Capabilities

| Capability | Status | Notes |
|------------|--------|-------|
| Install prompt | ✅ | `EmployeePwaProvider` |
| Push notifications | ✅ | VAPID + `employee_push_subscriptions` |
| Background sync | ✅ | Offline queue replay |
| GPS | ✅ | Check-in/out |
| Camera | ✅ | Photos, future voice |
| File upload | ✅ | Attachments when online |
| Biometric login | ✅ | Device lock — PIN + WebAuthn |
| Share target | 🔜 | Roadmap |
| Voice notes | 🔜 | Messages roadmap |

---

## 15. Governance

### 15.1 When to use this bible

- Any file under `src/app/**/mobile/**`
- Any file under `src/components/mobile/**`
- Employee-specific hooks, actions, PWA libs

### 15.2 Exceptions

Desktop patterns in Employee PWA require **explicit approval** from Mobile UX owner. Document in PR description.

### 15.3 PR checklist (Employee PWA)

- [ ] Uses `[data-surface="employee-mobile"]` shell
- [ ] Touch targets ≥ 48px
- [ ] Body text ≥ 16px
- [ ] One primary action per screen region
- [ ] Works offline or shows clear offline state
- [ ] Light + dark tested
- [ ] Uses `App*` components from `@/components/mobile/app`
- [ ] i18n strings in `employee.mobile.*`
- [ ] No desktop table/layout patterns

### 15.4 Related documents

| Document | Scope |
|----------|-------|
| [`DESIGN_BIBLE.md`](./DESIGN_BIBLE.md) | Desktop SaaS only |
| [`EMPLOYEE_PWA_ARCHITECTURE.md`](./EMPLOYEE_PWA_ARCHITECTURE.md) | Routes, data, offline architecture |
| [`DESIGN_SYSTEM_AUDIT.md`](./DESIGN_SYSTEM_AUDIT.md) | Migration tracking |

---

*FeldOps Mobile Design Bible v2.0 — built for gloved hands, bright sun, and bad signal.*
