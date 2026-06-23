# FeldOps Employee PWA — Architecture

> **Version:** 2.0  
> **Audience:** Field employees only (role `employee`)  
> **Design standard:** [`MOBILE_DESIGN_BIBLE.md`](./MOBILE_DESIGN_BIBLE.md)  
> **UX audit:** [`EMPLOYEE_PWA_UX_AUDIT.md`](./EMPLOYEE_PWA_UX_AUDIT.md)

---

## 1. Product Goal

Allow field workers to complete an entire workday on a phone:

- See today's work at a glance
- Navigate to job sites
- Check in/out with GPS
- Execute services (checklist, photos, signature)
- Communicate with operations
- Track time — including offline

This is **not** the admin dashboard. Managers use `/{slug}`; employees use `/{slug}/mobile`.

---

## 2. Navigation Model

### Bottom navigation (5 tabs)

| Tab | Route | Purpose |
|-----|-------|---------|
| **Home** | `/{slug}/mobile` | Greeting, KPIs, current/next job, quick actions |
| **Schedule** | `/{slug}/mobile/schedule` | Today / Week / Month views |
| **Jobs** | `/{slug}/mobile/jobs` | Filterable job list |
| **Messages** | `/{slug}/mobile/messages` | Team inbox + system alerts |
| **Profile** | `/{slug}/mobile/profile` | Identity, hours, reports, **vacations**, settings |

### Secondary routes (no tab)

| Route | Purpose |
|-------|---------|
| `/mobile/services/[taskId]` | Job detail |
| `/mobile/check-in/[taskId]` | GPS check-in |
| `/mobile/services/[taskId]/execute` | Full execution workflow |
| `/mobile/hours` | Weekly time (profile shortcut) |
| `/mobile/vacations` | Vacation requests (**preserved**) |
| `/mobile/reports` | Service PDFs |
| `/mobile/notifications` | Legacy alerts page (linked from Messages) |

---

## 3. Page Structure

```
(employee-mobile)/[companySlug]/mobile/
├── layout.tsx          → requireEmployeeContext, PWA shell, inbox unread
├── page.tsx            → EmployeeHomeView
├── schedule/page.tsx   → EmployeeScheduleTabsView
├── jobs/page.tsx       → EmployeeJobsView
├── messages/page.tsx   → EmployeeMessagesView
├── profile/page.tsx    → EmployeeMobileProfileView
├── hours/              → EmployeeHoursView
├── vacations/          → EmployeeVacationsView
├── notifications/      → EmployeeNotificationsView
├── reports/
├── check-in/[taskId]/
└── services/[taskId]/
    └── execute/
```

---

## 4. Component Map

| Component | Path |
|-----------|------|
| `MobileEmployeeShell` | `components/mobile/mobile-employee-shell.tsx` |
| **Mobile design system (v2)** | `components/mobile/app/` |
| `EmployeeBottomNav` | `components/mobile/employee-bottom-nav.tsx` |
| `EmployeeHomeView` | `components/mobile/employee-home-view.tsx` |
| `EmployeeJobsView` | `components/mobile/employee-jobs-view.tsx` |
| `EmployeeMessagesView` | `components/mobile/employee-messages-view.tsx` |
| `EmployeeScheduleTabsView` | `components/mobile/employee-schedule-tabs-view.tsx` |
| `EmployeeMobileProfileView` | `components/mobile/employee-mobile-profile-view.tsx` |
| `EmployeePwaProvider` | `components/pwa/employee-pwa-provider.tsx` |
| `FieldExecutionView` | Execution workflow (checklist, photos, signature) |

---

## 5. Supabase Schema

### Existing tables (in use)

| Table | PWA usage |
|-------|-----------|
| `employees` | Profile, RLS via `private.get_employee_id()` |
| `task_assignments` + `tasks` | Jobs, schedule, home |
| `check_ins` | Check-in/out, GPS, time tracking |
| `task_checklist_items` | Dynamic checklists |
| `task_photos` | Before/after photos → Storage |
| `service_reports` | PDF + customer portal |
| `employee_notifications` | Push + in-app alerts |
| `employee_push_subscriptions` | Web Push |
| `time_account_entries` | Hours tab |
| `vacation_requests` | Vacations flow |

### New (migration `20260626120000_employee_messages.sql`)

```sql
employee_messages (
  id, company_id, thread_id,
  recipient_employee_id,
  sender_employee_id | sender_member_id,
  subject, body, attachment_path,
  read_at, created_at
)
```

**RLS:** Employee reads own inbox; can reply; managers/supervisors can send and read all company threads (migration `20260627120000`).

### Manager dashboard (`/{slug}/workforce/messages`)

Supervisors and above use the admin **Workforce → Mensagens** inbox:

| Feature | Implementation |
|---------|----------------|
| Thread list | `loadAdminMessageThreads` — grouped by `thread_id`, filters all / needs reply |
| Conversation view | `?thread=` query param + `loadAdminMessageThread` |
| Send to employee | `sendManagerMessageAction` with `employeeId` |
| Broadcast to team | Same action with `teamId` → one thread per team member |
| Reply in thread | `threadId` + `sender_member_id` |
| Attachments | Bucket `employee-message-attachments`, signed URLs on read |
| Mark employee replies read | `markManagerThreadReadAction` |
| Push to employee | Trigger `notify_employee_on_manager_message` |

**Components:** `WorkforceMessagesView`, `src/actions/workforce/employee-messages.ts`

---

## 6. Security Model

1. **Route guards:** `requireEmployeeContext(slug)` on all mobile pages
2. **Role gate:** Non-employees → `/{slug}/mobile-access`
3. **Platform admin:** Redirect to `/super-admin`
4. **RLS:** Every query scoped by `company_id` + `employee_id`
5. **No cross-tenant data:** Slug resolves company; employee must belong to company
6. **JWT:** Never use `user_metadata` for authorization

---

## 7. Offline Strategy

### Current (v3 — Phase 3 complete)

| Feature | Offline |
|---------|---------|
| View cached jobs/schedule/home | ✅ IndexedDB cache + SW runtime cache |
| Check-in | ✅ IndexedDB queue + Background Sync |
| Checklist toggles | ✅ Queued, replayed in order |
| Photo upload | ✅ Compressed client-side, blob store |
| Customer signature | ✅ Queued with PNG blob |
| Check-out | ✅ Queued (resolves offline check-in session) |
| Message replies | ✅ Queued via `message_reply` |
| New message compose | ✅ Queued via `message_compose` |

**Implementation:**

- `src/lib/pwa/offline-queue.ts` — IndexedDB v2: `offline_queue`, `offline_media`, `offline_cache`
- `src/lib/pwa/offline-cache.ts` — read-only cache for home/jobs/schedule/execution
- `src/lib/pwa/compress-image.ts` — client-side image compression before enqueue
- `src/actions/employee/sync-offline.ts` — replays all action types with session resolution
- `public/sw.js` v5 — network-first mobile routes, `/offline` fallback
- `useOfflineSync` — replays queue via server action + cleans media blobs

### Phase 5 (complete)

- **Device lock:** PIN (PBKDF2) + optional WebAuthn biometric unlock
- **Idle lock:** 5 min inactivity + app backgrounded
- **Settings:** Profile → Device lock
- **Checklist conflicts:** Banner on execute step when offline toggles differ from server
- **New messages offline:** Compose to operations with `message_compose` queue

---

## 8. Push Notifications

1. Employee enables push on Messages tab
2. `registerPushSubscriptionAction` → `employee_push_subscriptions`
3. DB triggers → `private.insert_employee_notification` → edge `push-dispatch`
4. Events: task assigned, schedule change, vacation status, announcements

**VAPID:** `/api/push/vapid-public-key`

---

## 9. Service Execution Flow

```
Job detail → Check-in (GPS) → Execute
  → Checklist (progress bar)
  → Photos before
  → Work notes
  → Photos after
  → Customer signature
  → Check-out → service_report → Customer Portal
```

Implemented in `FieldExecutionView` + `employee-service-detail-view`.

---

## 10. Time Tracking

| Event | Source |
|-------|--------|
| Shift / job time | `check_ins` (check_in_at, check_out_at) |
| Planned hours | Task `scheduled_start` / `scheduled_end` |
| Weekly summary | `time_account_entries` + Hours page |
| Workforce sync | Existing workforce planning module |

---

## 11. AI Assistant (Job context)

### Dashboard (supervisors)
Available via `AiAssistantDock` on `/{slug}` layout.

### Employee PWA (Phase 4)
Inline widget on job detail (`EmployeeJobAiWidget`):

| Action | Capability | Output |
|--------|------------|--------|
| Checklist | `suggest_checklist` | 5–8 field steps (templates + service type) |
| Materials | `suggest_materials` | Linked materials or defaults |
| Service notes | `generate_service_notes` | Draft for checkout (copy to clipboard) |

**Stack:** `runEmployeeFieldAiAction` → OpenAI (if configured) or rule-based fallback.  
Context: task, templates, checklist, materials from `loadFieldJobAiContext`.

---

## 12. PWA Install

- Manifest: `/api/pwa/manifest/{slug}` — `start_url: /{slug}/mobile`
- Icons: `/icons/employee-*.svg`
- `PwaInit` — install prompt (production)
- Display: `standalone`, portrait, theme `#2563EB`

---

## 13. Responsive Layout

| Breakpoint | Shell |
|------------|-------|
| `< md` | Bottom nav, full-width cards, 44px+ touch targets |
| `≥ md` | Sidebar nav + content, same routes |

Safe areas: `safe-area-pb` on bottom navigation.

---

## 14. Design Tokens

Use Design Bible tokens only:

- `bg-background`, `bg-card`, `border-border/60`
- `rounded-2xl` cards on mobile
- `text-primary` accents
- Light / dark / system via `next-themes`

---

## 15. Migration Checklist

- [x] 5-tab navigation (Home, Schedule, Jobs, Messages, Profile)
- [x] Home dashboard with KPIs + quick actions
- [x] Jobs list with filters
- [x] Messages inbox + alerts tab
- [x] Schedule Today/Week/Month tabs
- [x] `employee_messages` migration + RLS
- [x] Manager inbox at `/{slug}/workforce/messages` (threads, team broadcast, attachments)
- [x] `employee_messages` manager RLS + attachments bucket (`20260627120000`)
- [x] Vacations shortcut preserved in profile
- [x] Phase 3: Extended offline queue (checklist, photos, sign, checkout, cache)
- [x] Phase 4: Job-detail AI widget + offline message replies
- [x] Phase 5: PIN/biometric lock, offline compose, checklist conflicts

---

*FeldOps Employee PWA v2 — mobile-first field operations.*
