# FeldOps — Arquitetura SaaS Comercial

Documento de referência para a plataforma B2B multi-tenant: marketing, autenticação, onboarding, aplicação, billing e multi-tenancy.

---

## Visão geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 App Router + i18n (pt/en)                 │
├──────────────┬──────────────┬────────────────────┬──────────────────────────┤
│  (marketing) │    (auth)    │       (app)        │   API Routes             │
│  Público     │  Login/Reg   │  Onboarding + App  │   Stripe Webhooks        │
└──────────────┴──────────────┴────────────────────┴──────────────────────────┘
                                      │
                            middleware.ts (sessão + i18n)
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│              Supabase — Auth + Postgres (RLS) + Storage + Realtime            │
│   Tenants: companies │ Members: company_members │ Billing: subscriptions      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                            Stripe — Checkout, Portal, Webhooks
```

---

## Route groups e rotas

Route groups **não alteram a URL**. Prefixo de locale: `/pt/...` ou `/en/...`.

### `(marketing)` — Website comercial

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `(marketing)/page.tsx` | Landing premium |
| `/features` | `(marketing)/features/page.tsx` | Recursos do produto |
| `/pricing` | `(marketing)/pricing/page.tsx` | Planos e CTAs |
| `/contact` | `(marketing)/contact/page.tsx` | Formulário de contato |
| `/demo` | `(marketing)/demo/page.tsx` | Trial / agendar demo |

Layout: `src/components/marketing/marketing-shell.tsx` (header + footer dark).

### `(auth)` — Autenticação e checkout

| Rota | Arquivo | Auth |
|------|---------|------|
| `/login` | `(auth)/login/page.tsx` | Público |
| `/register` | `(auth)/register/page.tsx` | Público |
| `/reset` | `(auth)/reset/page.tsx` | Público (esqueci senha) |
| `/update-password` | `(auth)/update-password/page.tsx` | Recovery |
| `/checkout` | `(auth)/checkout/page.tsx` | Protegido |
| `/checkout/success` | `(auth)/checkout/success/page.tsx` | Protegido |

Callback OAuth/PKCE: `/auth/callback` (fora de `[locale]`).

### `(app)` — Aplicação SaaS

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/onboarding` | `(app)/onboarding/page.tsx` | Wizard — criar empresa |
| `/select-company` | `(app)/select-company/page.tsx` | Multi-workspace |
| `/{companySlug}` | `(dashboard)/[companySlug]/page.tsx` | Dashboard tenant |

> **Nota:** Rotas tenant (`/{slug}/*`) permanecem em `(dashboard)/` — renomear pasta para `(app)/[companySlug]` quando o filesystem permitir. Funcionalmente equivalente.

### Convites e utilitários

| Rota | Descrição |
|------|-----------|
| `/invite/accept` | Aceitar convite |
| `/offline` | PWA offline |

### API

| Rota | Descrição |
|------|-----------|
| `/api/webhooks/stripe` | Webhooks Stripe (idempotente) |

---

## Estrutura de pastas (alvo)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/          # Website
│   │   ├── (auth)/               # Login, registro, checkout
│   │   ├── (app)/                # Onboarding, select-company
│   │   ├── (dashboard)/          # → renomear para (app)/[companySlug]
│   │   │   └── [companySlug]/
│   │   ├── invite/
│   │   └── offline/
│   ├── auth/callback/
│   └── api/webhooks/stripe/
├── actions/
│   ├── auth/                     # signIn, signUp, createCompany
│   └── billing/                  # checkout, portal
├── components/
│   ├── marketing/
│   ├── billing/
│   ├── onboarding/
│   ├── layout/                   # DashboardShell, sidebar
│   └── features/                 # Domínios operacionais
├── config/
│   ├── constants.ts              # ROUTES, RESERVED slugs
│   ├── navigation.ts
│   └── permissions.ts
├── lib/
│   ├── auth/                     # session, guards
│   ├── billing/                  # plans, stripe
│   └── supabase/
└── types/

supabase/migrations/
├── 20250616100100_core_tables.sql
├── ...
└── 20260617000000_billing_subscriptions.sql
```

---

## Modelo de dados

### Core (existente)

| Tabela | Propósito |
|--------|-----------|
| `companies` | Tenant raiz |
| `profiles` | Perfil 1:1 com `auth.users` |
| `company_members` | Membership + role + status |
| `employees` | Registro operacional |
| `company_invites` | Convites pendentes |
| `clients`, `addresses`, `tasks`, … | Domínio operacional |

### Billing (novo)

| Tabela | Propósito |
|--------|-----------|
| `subscriptions` | 1:1 com `companies` — Stripe customer/subscription, plano, trial |
| `billing_events` | Log idempotente de webhooks |

```sql
subscriptions (
  company_id UUID UNIQUE → companies,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_key TEXT,           -- starter | professional | enterprise
  status subscription_status,
  trial_ends_at TIMESTAMPTZ,
  current_period_start/end TIMESTAMPTZ
)
```

---

## Fluxos

### 1. Registro → Onboarding → App

```
/register → signUp (Supabase Auth)
         → trigger handle_new_user → profiles
         → /onboarding (wizard)
         → createCompany RPC → companies + company_members (admin) + employees
         → /{slug} (dashboard)
```

**Login automático:** Supabase `signUp` cria sessão quando confirmação de e-mail está desabilitada no projeto. Com confirmação ativa, usuário confirma e faz login em `/login`.

### 2. Login → Redirect inteligente

```
/login → signIn
      → 0 empresas → /onboarding
      → 1 empresa  → /{slug}
      → N empresas → /select-company
```

Locale preferido: `profiles.locale` → cookie `feldops-locale`.

### 3. Checkout → Billing

```
/pricing → /checkout?plan=professional
         → createCheckoutSession (Stripe Checkout)
         → /checkout/success
         → webhook atualiza subscriptions
         → Customer Portal via createBillingPortalSession
```

**Modo demo:** sem `STRIPE_SECRET_KEY`, checkout redireciona para success page.

### 4. Multi-tenancy

- Isolamento: **RLS** por `company_id` + helpers `private.*`
- URL tenant: `/{companySlug}/...`
- Roles: `admin` > `supervisor` > `employee`
- Guards: `requireAuth`, `requireCompanyContext`, `hasMinRole`
- Cookie `feldops_company_id` (switcher); resolução principal via slug na URL

---

## Middleware

`src/middleware.ts`:

1. Redirect locale (`feldops-locale` cookie)
2. `next-intl` prefix
3. `updateSession()` — refresh JWT Supabase
4. Rotas públicas: marketing + auth (ver `AUTH_PUBLIC_PATHS`)
5. Webhooks: bypass auth (`/api/webhooks/*`)
6. Protegidas: redirect → `/login?redirect=...`

---

## Stripe — Configuração

`.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
NEXT_PUBLIC_APP_URL=https://app.feldops.com
```

Webhook events: `customer.subscription.created|updated|deleted`.

---

## Planos e limites

| Plano | Trial | Employees | Tasks/mês | Storage |
|-------|-------|-----------|-----------|---------|
| Starter | 14d | 3 | 50 | 5 GB |
| Professional | 14d | 25 | ∞ | 50 GB |
| Enterprise | 14d | ∞ | ∞ | 500 GB |

Enforcement de limites: **próxima fase** — validar em Server Actions contra `subscriptions.plan_key`.

---

## Escalabilidade (milhares de tenants)

| Camada | Estratégia |
|--------|------------|
| Postgres | Índices `(company_id, …)`, RLS, connection pooling (Supabase) |
| Auth | JWT stateless, refresh no edge middleware |
| Storage | Buckets por tenant path prefix |
| App | RSC + Server Actions, paginação cursor |
| Billing | Stripe como source of truth; sync via webhooks |
| Cache | `revalidatePath` por tenant após mutações |

---

## Checklist comercial

| Área | Status |
|------|--------|
| Marketing website | ✅ Route group + 5 páginas |
| Pricing | ✅ Página + planos i18n |
| Checkout | ✅ UI + Stripe scaffold |
| Auth | ✅ Existente (email/senha) |
| Onboarding | ✅ Wizard 2 steps |
| Dashboard | ✅ Maduro |
| Billing DB | ✅ Migration |
| Stripe webhooks | ✅ Scaffold |
| Customer Portal | ✅ Action |
| Trial | ✅ 14 dias |
| OAuth/SSO | ⬜ Roadmap |
| Enforcement planos | ⬜ Roadmap |
| Páginas legais (LGPD/Impressum) | ⬜ Roadmap |

---

## Próximos passos recomendados

1. Aplicar migration `20260617000000_billing_subscriptions.sql` no Supabase
2. Configurar produtos/preços no Stripe Dashboard
3. Renomear `(dashboard)` → `(app)/[companySlug]` no filesystem
4. Implementar enforcement de limites por plano
5. Páginas `/privacy`, `/terms`, `/impressum`
6. OAuth (Google/Microsoft) para enterprise
