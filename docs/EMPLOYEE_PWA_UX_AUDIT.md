# Employee PWA — UX Audit & Redesign (2026)

> **Standard:** [`MOBILE_DESIGN_BIBLE.md`](./MOBILE_DESIGN_BIBLE.md)  
> **Architecture:** [`EMPLOYEE_PWA_ARCHITECTURE.md`](./EMPLOYEE_PWA_ARCHITECTURE.md)

This document records the full audit of the existing Employee PWA and the redesign applied to align every screen with the Mobile Design Bible.

---

## 1. Audit Summary

### Issues found

| Category | Finding | Severity |
|----------|---------|----------|
| **Duplicate screens** | `/mobile/notifications` duplicated Messages → Alerts tab | High |
| **Duplicate actions** | Sign out in shell header + profile; vacations twice in profile | Medium |
| **Desktop patterns** | Sidebar nav on `md+`, global ERP header, `divide-y` tables, `dl` definition lists | High |
| **Small touch targets** | `size-8` sign out, `size-9` back buttons, `text-xs` filters, `h-8` message buttons | High |
| **Extra taps** | Start always → check-in even when session active; job cards → detail before execute | Medium |
| **Navigation** | Back on service detail went to Home instead of Jobs | Low |
| **Inconsistent layout** | Mixed `p-4` wrappers vs `AppScreen` | Medium — **resolved in v2 redesign** |

### What was kept (intentionally)

| Route | Reason |
|-------|--------|
| `/mobile/services/[id]` | Job overview + single primary CTA (check-in / continue) |
| `/mobile/check-in/[id]` | GPS-focused immersive step (gloves, outdoor) |
| `/mobile/services/[id]/execute` | Workflow steps (checklist → photos → sign → checkout) |
| 5 bottom tabs | Bible maximum; matches field-worker mental model |

---

## 2. New Navigation Structure

```
Bottom nav (always visible except immersive routes)
├── Home          /{slug}/mobile
├── Schedule      /{slug}/mobile/schedule
├── Jobs          /{slug}/mobile/jobs
├── Messages      /{slug}/mobile/messages  (?tab=alerts)
└── Profile       /{slug}/mobile/profile

Secondary (back header + bottom nav)
├── Hours         /{slug}/mobile/hours
├── Vacations     /{slug}/mobile/vacations
└── Reports       /{slug}/mobile/reports

Immersive (no bottom nav)
├── Job detail    /{slug}/mobile/services/[taskId]
├── Check-in      /{slug}/mobile/check-in/[taskId]
└── Execute       /{slug}/mobile/services/[taskId]/execute

Legacy redirect
└── /mobile/notifications → /mobile/messages?tab=alerts
```

### Shell changes

- **Removed:** `EmployeeSidebarNav` (desktop duplicate of bottom tabs)
- **Removed:** Global sticky header with sign out (moved to Profile)
- **Kept:** `data-surface="employee-mobile"`, bottom nav, device lock, PWA provider

---

## 3. Screen Hierarchy

```
Home
  └─ Quick actions → Check-in / Schedule / Open job
  └─ Job cards → Smart route (detail or execute if active)

Jobs
  └─ Filters → Job cards
  └─ Actions: Open | Navigate | Start (smart: check-in OR execute)

Schedule
  └─ Today | Week | Month
  └─ Job cards (shared `AppServiceCard`)

Messages
  └─ Team | Alerts (segmented)
  └─ Compose / reply (offline queue)

Profile
  └─ Hours | Vacations | Reports
  └─ Device lock | Sign out

Service detail
  └─ Primary: Start | Continue | Reports
  └─ Sticky bottom CTA

Check-in → Execute workflow
  └─ Checklist → Photos → Sign → Checkout
```

---

## 4. Component Usage (by screen) — v2

Import path: `@/components/mobile/app`

| Screen | App components |
|--------|----------------|
| Home | `AppScreen`, `AppGreetingHeader`, `AppNextServiceHero`, `AppQuickActionGrid`, `AppSummaryGrid`, `AppServiceCard` |
| Jobs | `AppScreen`, `AppSectionTitle`, `AppFilterPills`, `AppServiceCard` |
| Schedule | `AppScreen`, `AppSegmentTabs`, `AppTimeline`, `AppServiceCard` |
| Messages | `AppScreen`, `AppSegmentTabs`, `AppCard` |
| Profile | `AppScreen`, `AppAvatar`, `AppCard`, `AppButton` |
| Hours / Reports / Vacations | `AppScreen`, `AppPageHeader`, `AppSummaryGrid`, `AppCard` |
| Service detail | `AppScreen`, `AppDarkHeader`, `AppCard`, `AppButton` |
| Check-in | `AppDarkHeader`, `AppCard`, `AppButton` |
| Execute | `AppDarkHeader`, `AppCard`, progress UI in `field-execution-view` |

Shared utilities: `src/lib/employee/mobile-job-ui.ts` (`getJobStartHref`, `getJobPrimaryHref`, `taskStatusToMobileVariant`, address/status helpers)

---

## 5. Mobile UX Improvements

| Improvement | Impact |
|-------------|--------|
| Smart **Start** routes to execute when check-in already active | −1 tap |
| Smart **job card** links to execute when session active | −1 tap |
| Service detail back → **Jobs** (not Home) | Clearer mental model |
| Single **sign out** in Profile | Less accidental logout |
| **48px+** touch targets on filters, CTAs, back buttons | Glove-friendly |
| **16px** body text on cards and forms | Outdoor readability |
| Notifications merged into Messages | One inbox |
| Removed redundant profile shortcuts (notifications duplicate) | Less clutter |

---

## 6. Performance Improvements

| Change | Benefit |
|--------|---------|
| Removed sidebar nav render on tablet | Less DOM, one nav paradigm |
| Tab prefetch unchanged (`home`, `schedule`, `jobs`) | Fast tab switches |
| Offline cache on all tab screens (existing) | Instant paint offline |
| `AppScreen` consistent padding | Less layout shift between routes |
| Floating `AppFloatingNav` bottom bar | Native pill nav, thumb-zone friendly |

---

## 7. Offline Improvements

| Area | Behavior |
|------|----------|
| Home / Jobs / Schedule / Messages | IndexedDB cache + stale-while-revalidate (unchanged) |
| Execute | Execution context cache + queue replay (unchanged) |
| Check-in | Offline queue → execute route (unchanged) |
| Messages | `message_reply` / `message_compose` queue; attachments online-only toast |

No regression: all Phase 3–5 offline flows preserved.

---

## 8. Files Changed (redesign)

### Shell & navigation
- `src/components/mobile/mobile-employee-shell.tsx`
- `src/app/.../mobile/notifications/page.tsx` (redirect)

### Design system v2 (`components/mobile/app/`)
- `primitives.tsx`, `layout-parts.tsx`, `shell-parts.tsx`, `content-blocks.tsx`
- Legacy `components/mobile/design-system/` **removed** (June 2026)

### Tab screens
- `employee-home-view.tsx`, `employee-jobs-view.tsx`, `employee-schedule-tabs-view.tsx`, `employee-messages-view.tsx`, `employee-mobile-profile-view.tsx`

### Secondary & immersive
- `employee-service-detail-view.tsx`, `employee-check-in-view.tsx`, `employee-hours-view.tsx`, `employee-reports-view.tsx`, `employee-vacations-view.tsx`
- `field-schedule-view.tsx`, `field-execution-view.tsx` (mobile variant)

### Shared
- `src/lib/employee/mobile-job-ui.ts`
- `src/lib/employee/load-employee-home.ts` (`activeTaskId`)

---

## 9. PR Checklist (post-redesign)

- [x] No desktop sidebar in Employee PWA
- [x] All tab screens use `AppScreen`
- [x] Secondary screens use `AppPageHeader` / `AppDarkHeader` + back to Profile or Jobs
- [x] Touch targets ≥ 48px on primary interactions
- [x] One primary CTA per immersive screen (sticky bottom)
- [x] Notifications redirect to Messages alerts tab
- [x] Smart routing reduces taps to start active jobs
- [x] CSS surface tokens (`--mobile-*`) under `[data-surface="employee-mobile"]`

---

*Field-first, native-feel Employee PWA — v2 redesign, June 2026.*
