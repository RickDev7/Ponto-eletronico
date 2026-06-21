# FeldOps — Core Architecture

> **Status:** Architecture Definition (no UI implementation)  
> **Audience:** Engineering, Product, Platform  
> **Stack:** Next.js · TypeScript · Supabase · React Query · Server Actions · Tailwind · shadcn/ui

Field Service Management ERP for cleaning, facility management, gardening, maintenance, painting, and technical services.

---

## 1. Architectural Principles

| Principle | Decision |
|-----------|----------|
| **Bounded contexts** | Five domains with explicit ownership; no duplicate systems for the same concept |
| **Multi-tenancy** | Shared database, shared schema, row-level isolation via `company_id` + RLS |
| **Authorization** | Postgres is source of truth (`company_members.role`); app mirrors in `permissions.ts` |
| **Writes** | Server Actions + Zod validation; never mutate from Client Components directly |
| **Reads** | RSC loaders for pages; React Query for client interactivity and cache |
| **Events** | Domain events → Automation engine + `activity_logs`; async via cron/webhooks |
| **Audit** | Append-only audit trail; immutable for non-admins |
| **i18n** | Locale prefix on all user-facing routes (`/[locale]/...`) |

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION (Next.js App Router)                   │
│  (marketing) │ (auth) │ (app) │ (dashboard)/[companySlug]/*               │
├────────────────────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER                                                          │
│  Server Actions │ RSC Loaders │ React Query hooks │ Automation dispatch    │
├────────────────────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER (lib/{domain}/)                                               │
│  Commercial │ Operations │ Workforce │ Finance │ Platform                  │
├────────────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                                             │
│  Supabase (Postgres + Auth + Storage + Realtime) │ Stripe │ Cron/API       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Domains

Each domain is a **bounded context** with its own modules, tables, actions, and loaders. Cross-domain reads are allowed via explicit **read models** or **foreign keys**; cross-domain writes go through **domain actions** or **events**.

### 2.1 Commercial

**Purpose:** Acquire, qualify, and convert customers before operational delivery.

| Module | Responsibility | Primary entities |
|--------|----------------|------------------|
| **CRM — Leads** | Pipeline, qualification, conversion | `leads`, `lead_contacts` |
| **CRM — Companies** | B2B accounts linked to clients | `crm_companies` |
| **CRM — Contacts** | People at client organizations | `crm_contacts` |
| **CRM — Pipeline** | Stage management, win/loss | `leads.status` |
| **Quotes** | Pre-sales pricing (→ Finance handoff) | `quotes`, `quote_items` |

**Outbound integrations:** Lead won → Client creation (Operations) · Quote accepted → Contract (Finance)

---

### 2.2 Operations

**Purpose:** Plan, schedule, execute, and verify field work.

| Module | Responsibility | Primary entities |
|--------|----------------|------------------|
| **Clients** | Customer master (post-sale) | `clients` |
| **Properties** | Buildings / sites | `addresses` |
| **Services** | Service catalog & templates | `services`, `task_templates` |
| **Scheduling** | Calendar, routes, dispatch | `tasks`, `task_assignments` |
| **Execution** | Check-in/out, photos, checklist | `check_ins`, `task_photos`, `task_checklist_items` |
| **Teams** | Crew grouping (future) | `teams`, `team_members` |

**Core rule:** A **Task** is the universal execution unit. Shifts, jobs, and schedules are **views** over `tasks` + `task_assignments` — never parallel shift tables.

---

### 2.3 Workforce

**Purpose:** People, time, compliance, and capacity planning.

| Module | Responsibility | Primary entities |
|--------|----------------|------------------|
| **Employees** | HR master, contracts, documents | `employees`, `employee_documents` |
| **Personnel Planning** | Daily/weekly/monthly planning | `tasks` (metadata: `shift_type`, etc.) |
| **Time & Attendance** | Check-ins, timesheets | `check_ins` (read), `timesheet_entries` |
| **Vacations & Absences** | Leave management | `vacation_requests`, `employee_absences` |
| **Time Account** | Soll/Ist balance | computed from check-ins + policies |
| **Compliance** | Worktime rules (DE/EU) | `worktime_policies` |

**Outbound integrations:** Absence approved → Planning conflict detection · Weekly hours exceeded → Automation event

---

### 2.4 Finance

**Purpose:** Revenue, billing, costs, and profitability.

| Module | Responsibility | Primary entities |
|--------|----------------|------------------|
| **Contracts** | Recurring agreements | `contracts`, `contract_items` |
| **Invoices** | Billing documents | `invoices`, `invoice_items` |
| **Payments** | Cash collection | `payments` |
| **Quotes** | Shared with Commercial (Finance owns post-acceptance) | `quotes` |
| **Cashflow & Forecast** | Read models | aggregated views |
| **Costs & Profitability** | Margin by client/employee/property | read models over invoices + tasks |

**Inbound integrations:** Task approved → Invoice line · Contract created → Recurring tasks (Operations)

---

### 2.5 Platform

**Purpose:** Tenant lifecycle, identity, automation, audit, billing, and cross-cutting concerns.

| Module | Responsibility | Primary entities |
|--------|----------------|------------------|
| **Identity & Auth** | Login, sessions, invites | `auth.users`, `profiles`, `company_invites` |
| **Tenancy** | Companies, memberships | `companies`, `company_members` |
| **Billing** | Subscriptions (Stripe) | `subscriptions`, `billing_events` |
| **Automations** | Trigger → Condition → Action | `automation_rules`, `automation_runs`, `automation_deliveries` |
| **Activity & Audit** | Immutable event log | `activity_logs` |
| **Reports** | PDF/CSV generation metadata | `reports` |
| **Settings** | Company profile, members, templates | `companies.settings` |
| **Notifications** | Preferences, channels | `notification_preferences` |

---

## 3. Module Ownership Matrix

| Module | Domain | Owner folder | Actions | Loaders | Validations |
|--------|--------|--------------|---------|---------|-------------|
| Leads / Pipeline | Commercial | `lib/crm/` | `actions/crm/` | `load-crm-data.ts` | `validations/crm.ts` |
| Clients / Properties | Operations | `lib/operations/` | `actions/clients/`, `actions/operations/` | `load-operations-data.ts` | `validations/clients.ts`, `operations.ts` |
| Tasks / Scheduling | Operations | `lib/operations/` | `actions/tasks/` | shared | `validations/tasks.ts` |
| Employees / Planning | Workforce | `lib/workforce/` | `actions/workforce/` | `load-workforce-data.ts` | `validations/workforce.ts` |
| Invoices / Contracts | Finance | `lib/finance/` | `actions/finance/` | `*-data.ts` per module | `validations/finance.ts` |
| Automations | Platform | `lib/automations/` | `actions/automations/` | `load-automations-data.ts` | `validations/automations.ts` |
| Auth / Settings | Platform | `lib/auth/` | `actions/auth/`, `settings/` | guards | `validations/auth.ts` |

**Rule:** A module owns its tables. Other domains **read** via RLS-safe queries or denormalized fields; they **write** only through the owning domain's Server Action or a published domain event handler.

---

## 4. Database Ownership

All tenant tables include `company_id UUID NOT NULL REFERENCES companies(id)`.

### 4.1 Platform (core)

```
companies
profiles
company_members
company_invites
employees                    -- HR record; Platform owns schema, Workforce owns semantics
activity_logs
reports
automation_rules
automation_runs
automation_deliveries
subscriptions
billing_events
notification_preferences
```

### 4.2 Commercial

```
leads
lead_contacts
crm_companies
crm_contacts
crm_activities
quotes                       -- shared ownership: Commercial creates, Finance fulfills
quote_items
```

### 4.3 Operations

```
clients
addresses
services
tasks
task_assignments
task_photos
task_checklist_items
task_templates
task_tags
check_ins
teams                        -- future
team_members                 -- future
```

### 4.4 Workforce

```
employee_documents
vacation_requests
employee_absences
worktime_policies
-- Planning metadata lives on tasks: shift_type, break_minutes, travel_minutes
```

### 4.5 Finance

```
contracts
contract_items
invoices
invoice_items
payments
```

### 4.6 Migration naming

```
supabase/migrations/YYYYMMDDHHMMSS_{domain}_{description}.sql

Examples:
  20260619120000_crm_module.sql
  20260620120000_operations_layer.sql
  20260621120000_workforce_layer.sql
  20260618120000_finance_module.sql
  20260622120000_automations_module.sql
```

One migration per domain feature slice. Never alter another domain's tables without explicit cross-domain review.

---

## 5. Entity Relationships

```
                    ┌─────────────┐
                    │  companies  │◄──── tenant root
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    company_members    employees       clients
           │               │               │
           │               │               ▼
      profiles         task_assignments  addresses
                           │               │
                           ▼               ▼
                         tasks ◄───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼              ▼
          check_ins   task_photos    contracts
              │                         │
              │                         ▼
              │                     invoices
              │                         │
              └──────► activity_logs ◄──┘

Commercial:  leads ──► clients (on conversion)
Finance:     contracts ──► tasks (recurring generation)
Workforce:   employees ──► task_assignments
Planning:    tasks + task_assignments = shifts (no separate entity)
```

### 5.1 Cross-domain reference rules

| From | To | FK | Notes |
|------|-----|-----|-------|
| Task | Address | `address_id` | Required |
| Task | Contract | `contract_id` | Optional; billing link |
| Task | Service | `service_id` | Optional; catalog link |
| Task | Invoice | `invoice_id` | Set on approval |
| Assignment | Employee | `employee_id` | Workforce |
| Assignment | Task | `task_id` | Operations |
| Invoice | Client | `client_id` | Finance |
| Lead | Client | `converted_client_id` | Commercial → Operations |

---

## 6. Multi-Tenant Strategy

### 6.1 Model

**Shared database, shared schema, logical isolation.**

```
Request → middleware (session) → requireCompanyContext(slug)
         → cookie feldops_company_id validated against company_members
         → Supabase client (user JWT) → RLS filters by company_id
```

### 6.2 RLS pattern

Every tenant table:

```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{table}_select" ON {table}
  FOR SELECT USING (private.is_company_member(company_id));

CREATE POLICY "{table}_insert" ON {table}
  FOR INSERT WITH CHECK (private.is_company_member(company_id));
```

Role-sensitive mutations use `private.has_min_role(company_id, 'supervisor')`.

### 6.3 URL tenancy

```
/{locale}/{companySlug}/{domain}/{module}/...
```

`companySlug` resolves to `companies.id`. Never trust slug without membership check.

### 6.4 Storage tenancy

Buckets: `task-photos`, `reports`, `company-assets`, `employee-documents`  
Path convention: `{company_id}/{entity_type}/{entity_id}/{filename}`

### 6.5 Scale path (future)

| Phase | Strategy |
|-------|----------|
| Now | Single Postgres, RLS, composite indexes `(company_id, ...)` |
| 10k tenants | Read replicas, connection pooling (Supavisor), partition large tables by `company_id` hash |
| Enterprise | Dedicated schema or database per tenant (BYO Supabase) via Platform provisioning |

---

## 7. User Roles

### 7.1 Role hierarchy

```
admin (3) > supervisor (2) > employee (1)
```

Stored in `company_members.role`. Never in JWT metadata.

### 7.2 Role capabilities

| Capability | admin | supervisor | employee |
|------------|:-----:|:----------:|:--------:|
| Company settings & billing | ✓ | — | — |
| Member management | ✓ | — | — |
| CRM / Finance write | ✓ | ✓ | — |
| Clients / properties / tasks | ✓ | ✓ | read own |
| Workforce planning | ✓ | ✓ | — |
| Assign tasks | ✓ | ✓ | — |
| Check-in / photos | ✓ | ✓ | ✓ |
| Automations | ✓ | ✓ | — |
| Reports generate | ✓ | ✓ | — |
| Audit log read | ✓ | ✓ | own activity |

### 7.3 Employee vs Member

| Concept | Table | Has login? |
|---------|-------|------------|
| **Member** | `company_members` | Always |
| **Employee** | `employees` | Optional (`member_id`) |

Field workers may exist as employees without app access. Planners work as supervisors/admins.

### 7.4 Permission naming

```
{resource}:{action}

Examples: tasks:write, finance:read, crm:write, automations:write
```

Defined in `src/config/permissions.ts`. Server Actions call `can(role, permission)` or `requireCompanyContext({ minRole })`.

---

## 8. Navigation Hierarchy

Navigation is **domain-driven**, not feature-sprawl. Defined in `src/config/navigation.ts`.

```
Dashboard                          [all]
├── My Area (minha-area)           [employee+]     ← mobile-first workforce
├── Tasks                          [employee+]
├── Calendar                       [employee+]
│
├── Commercial (CRM)               [supervisor+]
│   ├── Dashboard
│   ├── Leads
│   ├── Contacts
│   ├── Companies
│   └── Pipeline
│
├── Operations                     [supervisor+]
│   ├── Clients
│   ├── Properties
│   ├── Services
│   └── Scheduling
│
├── Workforce                      [supervisor+]
│   ├── Personnel Planning         ← primary planning entry
│   ├── Employees
│   ├── Vacations
│   ├── Absences
│   └── Time Account
│
├── Finance                        [supervisor+]
│   ├── Overview
│   ├── Invoices
│   ├── Payments
│   ├── Contracts
│   ├── Costs
│   ├── Profitability
│   └── Forecast
│
├── Reports                        [supervisor+]
├── Automations                    [supervisor+]
└── Settings                       [admin]
```

**Redirects:** Legacy routes (`/shifts` → `/workforce/planning`) preserve bookmarks without duplicate modules.

---

## 9. Event Architecture

### 9.1 Event types

| Layer | Mechanism | Use case |
|-------|-----------|----------|
| **Domain events** | `emitAutomationEvent()` | Business reactions (invoice overdue, shift empty) |
| **Activity log** | `activity_logs` insert | User-visible audit trail |
| **Webhooks** | `/api/webhooks/stripe` | External systems |
| **Cron** | `/api/cron/*` | Scheduled scans (overdue invoices, planning alerts) |

### 9.2 Automation trigger catalog (extensible)

```
Commercial:   lead.won, lead.status_changed
Operations:   service.completed, service.approved
Workforce:    shift.empty, weekly_hours.exceeded
Finance:      contract.created, contract.renewed, invoice.sent, invoice.overdue
```

### 9.3 Event flow

```
Server Action / Cron
       │
       ▼
 emitAutomationEvent({ companyId, trigger, payload })
       │
       ▼
 automation_rules (filter by trigger_type + conditions)
       │
       ▼
 automation_runs + executeAction (email, notification, create_task, ...)
       │
       ▼
 activity_logs (optional, for user-visible history)
```

### 9.4 Domain event payload contract

```typescript
interface DomainEventPayload {
  entityType: string;      // "task" | "invoice" | "employee"
  entityId: string;
  companyId: string;
  [key: string]: unknown;  // trigger-specific fields
}
```

### 9.5 Future: outbox pattern

For high volume, add `domain_events` table (Platform) with Postgres `LISTEN/NOTIFY` or Supabase Queues. Automations consume from outbox instead of inline emit.

---

## 10. Audit Architecture

### 10.1 Layers

| Layer | Storage | Retention | Mutability |
|-------|---------|-----------|------------|
| **Activity log** | `activity_logs` | Indefinite | Append-only (RLS) |
| **Automation runs** | `automation_runs` | 90 days hot | Immutable |
| **Auth audit** | Supabase Auth logs | Platform default | External |
| **Compliance audit** | `audits` module | Configurable | Read-only views |

### 10.2 Activity log schema

```typescript
{
  company_id,
  entity_type,    // "task" | "client" | "invoice" | ...
  entity_id,
  action,         // activity_action enum
  actor_id,       // profile id
  metadata,       // jsonb diff/snapshot
  created_at
}
```

### 10.3 What gets logged

| Action | Logged |
|--------|--------|
| CRUD on clients, tasks, employees | ✓ |
| Status changes | ✓ |
| Check-in/out | ✓ |
| Invoice sent/paid | ✓ |
| Automation executed | ✓ (via automation_runs) |
| Read operations | ✗ |

### 10.4 GDPR / compliance

- Employee documents: scoped storage RLS, deletion on offboarding workflow
- Activity export: `/[slug]/audits/export`
- Data retention policies per tenant in `companies.settings` (future)

---

## 11. Future Scalability

### 11.1 Application tier

| Concern | Now | Scale |
|---------|-----|-------|
| Data fetching | RSC + Server Actions | React Query with stale-while-revalidate for dashboards |
| Realtime | Polling / refresh | Supabase Realtime on `tasks`, `check_ins` |
| Background jobs | Vercel Cron | Supabase Edge Functions + pg_cron |
| PDF generation | Client print / server HTML | Dedicated worker or Edge Function |
| Search | Postgres `ilike` | pg_trgm → Meilisearch/Typesense per tenant |
| File storage | Supabase Storage | CDN + signed URLs |

### 11.2 Data tier

- Composite indexes: `(company_id, scheduled_date)`, `(company_id, status)`
- Partition candidates: `activity_logs`, `check_ins`, `automation_runs` by month
- Materialized views for Finance dashboards and profitability
- Read replicas for reporting queries

### 11.3 Domain evolution

| Domain | Next modules |
|--------|--------------|
| Commercial | Proposals, e-sign, marketing campaigns |
| Operations | Route optimization, GPS tracking, asset management |
| Workforce | Skills matrix, certifications, payroll export (DATEV) |
| Finance | SEPA, dunning, multi-currency |
| Platform | SSO/SAML, API keys, webhooks for integrators |

### 11.4 Anti-patterns (never do)

- Duplicate entity systems (e.g. separate `shifts` table alongside `tasks`)
- Cross-domain writes from wrong Server Action
- Authorization in client-only code
- `service_role` key in browser
- Business logic in React components

---

## 12. Folder Structure (Target)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/              # Platform — public
│   │   ├── (auth)/                   # Platform — auth
│   │   ├── (app)/                    # Platform — onboarding, select-company
│   │   ├── (dashboard)/
│   │   │   └── [companySlug]/
│   │   │       ├── page.tsx          # Executive dashboard
│   │   │       ├── minha-area/       # Workforce — employee mobile
│   │   │       ├── crm/              # Commercial
│   │   │       ├── clients/          # Operations (legacy path, keep)
│   │   │       ├── operations/       # Operations
│   │   │       ├── workforce/        # Workforce
│   │   │       ├── finance/          # Finance
│   │   │       ├── automations/      # Platform
│   │   │       ├── reports/          # Platform
│   │   │       ├── activity/         # Platform
│   │   │       ├── audits/           # Platform
│   │   │       └── settings/         # Platform
│   │   └── auth/callback/
│   └── api/
│       ├── webhooks/stripe/
│       └── cron/
│
├── actions/                          # Server Actions by domain
│   ├── auth/
│   ├── crm/                          # Commercial
│   ├── clients/                      # Operations
│   ├── operations/
│   ├── tasks/
│   ├── workforce/
│   ├── finance/
│   ├── automations/                  # Platform
│   ├── settings/
│   └── reports/
│
├── components/
│   ├── ui/                           # shadcn primitives
│   ├── shared/                       # Cross-domain UI (PageHeader, KPI)
│   ├── layout/                       # Shell, sidebar, nav
│   ├── features/
│   │   ├── crm/                      # Commercial
│   │   ├── operations/
│   │   ├── workforce/
│   │   ├── finance/
│   │   ├── automations/
│   │   ├── me/                       # Employee mobile
│   │   └── settings/
│   └── marketing/
│
├── config/
│   ├── constants.ts                  # ROUTES registry
│   ├── navigation.ts                 # Nav hierarchy
│   ├── permissions.ts                # Role → permission map
│   └── theme.ts
│
├── hooks/
│   ├── use-{domain}-mutations.ts     # React Query mutations wrapping actions
│   └── use-mobile.ts
│
├── lib/
│   ├── auth/                         # Platform — guards, session
│   ├── supabase/                     # Platform — clients
│   ├── crm/                          # Commercial — loaders, types
│   ├── operations/                   # Operations
│   ├── workforce/                    # Workforce
│   ├── finance/                      # Finance
│   ├── automations/                  # Platform — engine, channels
│   ├── billing/                      # Platform — Stripe
│   ├── validations/                  # Zod schemas by domain
│   └── i18n/
│
├── messages/                         # pt.json, en.json, de.json (future)
└── types/
    ├── database.ts                   # Generated Supabase types
    ├── enums.ts
    └── index.ts

supabase/
├── migrations/                       # Versioned SQL by domain
└── config.toml

docs/
├── CORE_ARCHITECTURE.md              # This document
├── ARCHITECTURE.md                   # Legacy overview
├── DATABASE.md                       # ER reference
└── SAAS_ARCHITECTURE.md              # Commercial SaaS layer
```

---

## 13. Naming Conventions

### 13.1 Files

| Type | Pattern | Example |
|------|---------|---------|
| Page | `page.tsx`, `loading.tsx`, `error.tsx` | `workforce/planning/page.tsx` |
| View (client) | `{module}-{purpose}-view.tsx` | `personnel-planning-view.tsx` |
| Server Action | `actions/{domain}/actions.ts` | `actions/workforce/actions.ts` |
| Loader | `lib/{domain}/load-{module}-data.ts` | `load-workforce-data.ts` |
| Pure logic | `lib/{domain}/{module}-{concern}.ts` | `planning-data.ts` |
| Server-only loader | `import "server-only"` | `load-planning-profitability.ts` |
| Types (shared) | `{module}-types.ts` or `{domain}-data.ts` | `planning-profitability-types.ts` |
| Validation | `lib/validations/{domain}.ts` | `validations/workforce.ts` |
| Hook | `use-{entity}-mutations.ts` | `use-invoice-mutations.ts` |
| Migration | `{timestamp}_{domain}_{desc}.sql` | `20260621120000_workforce_layer.sql` |

### 13.2 Code

| Element | Convention |
|---------|------------|
| React components | `PascalCase` |
| Functions / variables | `camelCase` |
| DB tables / columns | `snake_case` |
| Enums (TS) | `PascalCase` type, `snake_case` DB values |
| Permissions | `{resource}:{action}` lowercase |
| Routes | `kebab-case` URLs |
| i18n keys | `{domain}.{module}.{key}` |

### 13.3 Server Action pattern

```typescript
"use server";

export async function createXAction(
  slug: string,
  input: CreateXInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createXSchema.parse(input);
  // mutate via supabase
  revalidateDomainPaths(slug);
  void emitDomainEventIfNeeded(...);
  return { success: true, data: { id } };
}
```

### 13.4 Loader pattern

```typescript
// lib/workforce/load-workforce-data.ts
export async function loadWorkforceEmployees(companyId: string) { ... }

// page.tsx (Server Component)
const data = await loadWorkforceEmployees(ctx.company.id);
return <WorkforceView {...data} />;
```

### 13.5 React Query pattern (client interactivity)

```typescript
// hooks/use-workforce-mutations.ts
export function useMoveShift(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => moveShiftAction(slug, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workforce", slug, "shifts"] }),
  });
}
```

Use React Query for: optimistic UI, polling, infinite scroll, dashboard widgets.  
Use RSC loaders for: initial page data, SEO-less app pages, permission-gated views.

---

## 14. Routing Structure

Locale prefix: `/pt/...` or `/en/...` (middleware).

### 14.1 Public

```
/                           → marketing landing
/features, /pricing, /contact, /demo
/login, /register, /reset, /update-password
```

### 14.2 App shell (authenticated, no tenant)

```
/onboarding
/select-company
/checkout, /checkout/success
```

### 14.3 Tenant app (`/{companySlug}`)

```
/{slug}                                    → Executive dashboard
/{slug}/minha-area                         → Employee mobile home

# Operations
/{slug}/tasks
/{slug}/tasks/{taskId}
/{slug}/clients, /{slug}/clients/{clientId}
/{slug}/operations/properties
/{slug}/operations/services
/{slug}/operations/scheduling
/{slug}/operations/teams
/{slug}/operations/routes
/{slug}/operations/jobs

# Commercial
/{slug}/crm
/{slug}/crm/leads, /{slug}/crm/leads/{leadId}
/{slug}/crm/contacts
/{slug}/crm/companies
/{slug}/crm/pipeline

# Workforce
/{slug}/workforce/planning                 → Personnel Planning (primary)
/{slug}/workforce/planning/reports
/{slug}/workforce/employees, /{slug}/workforce/employees/{id}
/{slug}/workforce/vacations
/{slug}/workforce/absences
/{slug}/workforce/time-account
/{slug}/workforce/timesheets
/{slug}/workforce/documents

# Finance
/{slug}/finance
/{slug}/finance/invoices
/{slug}/finance/payments
/{slug}/finance/contracts
/{slug}/finance/quotes
/{slug}/finance/cashflow
/{slug}/finance/costs
/{slug}/finance/profitability
/{slug}/finance/forecast

# Platform
/{slug}/automations
/{slug}/reports
/{slug}/activity
/{slug}/audits
/{slug}/settings
/{slug}/calendar
```

### 14.2 Route registry

All paths defined once in `src/config/constants.ts` as `ROUTES.{name}(slug, params?)`. Navigation, links, and redirects import from there — never hardcode paths.

---

## 15. Cross-Domain Integration Map

```
┌─────────────┐     lead.won      ┌─────────────┐
│  Commercial │ ───────────────►  │  Operations │  creates client
└─────────────┘                   └─────────────┘
       │                                 │
       │ quote accepted                  │ task completed
       ▼                                 ▼
┌─────────────┐   contract.created  ┌─────────────┐
│   Finance   │ ◄────────────────── │  Operations │
└─────────────┘                     └─────────────┘
       │                                 │
       │ invoice.overdue                 │ shift.empty
       ▼                                 ▼
┌─────────────┐                     ┌─────────────┐
│  Platform   │ ◄── automations ──► │  Workforce  │
│ (Automations)                     └─────────────┘
       │
       ▼
 activity_logs (audit)
```

---

## 16. Implementation Order (Reference)

When building new modules, follow this sequence — **no screens until domain is defined**:

1. Migration + RLS + indexes  
2. Types (`database.ts` / domain types)  
3. Zod validations  
4. Loaders (`lib/{domain}/`)  
5. Server Actions (`actions/{domain}/`)  
6. Event hooks (if applicable)  
7. ROUTES + navigation entry  
8. i18n keys  
9. View components (last)

---

## 17. Document Map

| Document | Scope |
|----------|-------|
| **CORE_ARCHITECTURE.md** (this) | Domains, modules, ownership, events, audit, conventions |
| ARCHITECTURE.md | High-level stack overview |
| SAAS_ARCHITECTURE.md | Marketing, auth, billing, onboarding |
| DATABASE.md | Table-level ER reference |
| AUTH_FLOW.md | Session and invite flows |

---

*FeldOps Core Architecture v1.0 — Principal SaaS Architecture Definition*
