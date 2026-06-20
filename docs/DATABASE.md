# FeldOps — Modelo de Dados

## Diagrama ER (simplificado)

```
auth.users ──1:1── profiles
                        │
companies ──1:N── company_members ──N:1── auth.users
    │                    │
    │                    └──1:1── employees (opcional)
    │
    ├── clients ──1:N── addresses
    │                      │
    └── tasks ─────────────┘
         │
         ├── task_assignments ── employees
         ├── check_ins ── employees
         ├── task_photos
         └── activity_logs

reports (metadados PDF)
company_invites
```

## Enums

| Enum | Valores |
|------|---------|
| `member_role` | `admin`, `supervisor`, `employee` |
| `member_status` | `active`, `invited`, `suspended` |
| `service_type` | `treppenhausreinigung`, `gartenpflege`, `winterdienst`, `glasreinigung` |
| `task_status` | `draft`, `scheduled`, `in_progress`, `completed`, `cancelled` |
| `task_priority` | `low`, `normal`, `high`, `urgent` |
| `photo_type` | `before`, `after` |
| `activity_action` | `created`, `updated`, `deleted`, `assigned`, `check_in`, `check_out`, `photo_uploaded`, `status_changed`, `report_generated` |
| `report_type` | `daily`, `weekly`, `monthly`, `client`, `employee`, `custom` |

## Tabelas

### `companies`
Tenant raiz. Slug único para URL (`/[companySlug]/...`).

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| name | text | Nome legal/comercial |
| slug | text UNIQUE | URL-safe |
| legal_name | text | Razão social |
| tax_id | text | Steuernummer/USt-IdNr |
| email, phone | text | Contato |
| logo_url | text | Storage path |
| settings | jsonb | Timezone, locale, defaults |
| created_at, updated_at | timestamptz | |

### `profiles`
Extensão de `auth.users`. Criado via trigger no signup.

### `company_members`
**Fonte de autorização RLS.** Role nunca vem de JWT user_metadata.

| Coluna | Tipo | Notas |
|--------|------|-------|
| company_id + user_id | UNIQUE | Um membership por par |
| role | member_role | admin / supervisor / employee |
| status | member_status | |

### `employees`
Registro operacional. `member_id` nullable para trabalhadores sem app.

### `clients`
Clientes da empresa (condomínios, empresas, particulares).

### `addresses`
Locais de serviço. `service_types[]` indica serviços contratados no endereço.

### `tasks`
Ordens de serviço agendadas.

### `task_assignments`
N:N tarefa ↔ funcionário (equipes).

### `check_ins`
Registro de presença com geo e timestamps.

### `task_photos`
Metadados; arquivo em Storage bucket `task-photos`.

### `activity_logs`
Audit trail imutável (append-only para não-admins).

### `reports`
Metadados de PDFs gerados; arquivo em bucket `reports`.

### `company_invites`
Convites pendentes com token hash.

## Índices (escala)

Todas as tabelas tenant-scoped têm índice em `company_id`. Índices compostos adicionais:

- `tasks(company_id, status, scheduled_date)`
- `check_ins(company_id, employee_id, check_in_at DESC)`
- `activity_logs(company_id, created_at DESC)`
- `company_members(user_id, status)` — lookup rápido no login

## RLS — resumo

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| companies | membro | — (onboarding via service) | admin | admin |
| profiles | próprio + colegas da empresa | trigger | próprio | — |
| company_members | membro | admin | admin | admin |
| employees | membro | supervisor+ | supervisor+ | admin |
| clients | membro | supervisor+ | supervisor+ | admin |
| addresses | membro | supervisor+ | supervisor+ | admin |
| tasks | membro* | supervisor+ | role-based | admin |
| check_ins | membro* | employee (próprio) | employee (próprio checkout) | admin |
| task_photos | membro | employee (atribuído) | — | admin |
| activity_logs | membro | system/trigger | — | — |
| reports | supervisor+ | supervisor+ | — | admin |

\* Employee vê apenas tarefas/check-ins atribuídos a si.

Funções helper no schema `private` (SECURITY DEFINER):
- `is_company_member(company_id)`
- `has_min_role(company_id, min_role)`
- `get_member_role(company_id)`
- `get_employee_id(company_id)`
- `is_task_assigned(task_id)`

## Storage

| Bucket | Público | Path pattern |
|--------|---------|--------------|
| `task-photos` | não | `{company_id}/{task_id}/{uuid}.jpg` |
| `reports` | não | `{company_id}/{report_id}.pdf` |
| `company-assets` | não | `{company_id}/logo.{ext}` |

Policies espelham RLS das tabelas correspondentes.

## Migrations

Ordem em `supabase/migrations/`:

1. `20250616100000` — extensions + enums
2. `20250616100100` — core tables (companies, profiles, members, employees)
3. `20250616100200` — clients, addresses, tasks, assignments, check_ins, photos
4. `20250616100300` — activity_logs, reports, invites
5. `20250616100400` — private schema + helper functions
6. `20250616100500` — RLS enable + policies
7. `20250616100600` — storage buckets + policies
8. `20250616100700` — triggers (profile, activity, updated_at)
