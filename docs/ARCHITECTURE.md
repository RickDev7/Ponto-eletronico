# FeldOps — Arquitetura do Sistema

> **Arquitetura core (domínios, módulos, ownership, eventos):** ver [`docs/CORE_ARCHITECTURE.md`](./CORE_ARCHITECTURE.md)

SaaS multi-tenant para empresas de serviços externos na Alemanha (Treppenhausreinigung, Gartenpflege, Winterdienst, Glasreinigung).

## Visão geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Router                     │
├──────────────┬──────────────────────┬───────────────────────────┤
│  Marketing   │   Auth (login/reg)   │  Dashboard [companySlug]  │
│  (public)    │   Server Actions     │  RSC + Server Actions     │
└──────────────┴──────────────────────┴───────────────────────────┘
                              │
                    middleware.ts (sessão)
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     Supabase (Postgres + Auth + Storage)         │
│  RLS por company_id │ Roles: admin > supervisor > employee      │
└─────────────────────────────────────────────────────────────────┘
```

## Princípios arquiteturais

| Princípio | Decisão |
|-----------|---------|
| Multi-tenancy | Shared database, shared schema, isolamento via `company_id` + RLS |
| Autorização | Fonte da verdade no Postgres (`company_members.role`), não em `user_metadata` |
| Escala | Índices compostos `(company_id, …)`, paginação cursor-based, storage separado |
| Segurança | RLS em todas as tabelas `public`, funções sensíveis no schema `private` |
| Frontend | Mobile-first, Server Components por padrão, Client Components só onde necessário |
| Mutações | Server Actions com validação Zod + revalidação de cache |

## Modelo de tenancy

1. **Company** — raiz do tenant (`companies`)
2. **Membership** — vínculo usuário ↔ empresa com role (`company_members`)
3. **Profile** — dados pessoais 1:1 com `auth.users` (`profiles`)
4. **Employee** — registro operacional/HR; pode ou não ter login (`employees`)

Todo dado de negócio carrega `company_id`. Policies RLS garantem que um usuário autenticado só acessa empresas das quais é membro ativo.

## Hierarquia de permissões

```
admin (3) ──► CRUD completo, membros, configurações, relatórios
supervisor (2) ──► clientes, endereços, tarefas, equipe (leitura), check-ins
employee (1) ──► tarefas atribuídas, check-in/out, fotos, histórico próprio
```

Permissões de aplicação espelham o banco em `src/config/permissions.ts`. Server Actions validam role antes de mutações sensíveis.

## Estrutura de pastas

> **Arquitetura SaaS comercial completa:** ver [`docs/SAAS_ARCHITECTURE.md`](./SAAS_ARCHITECTURE.md)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/          # Landing, features, pricing, contact, demo
│   │   ├── (auth)/               # Login, registro, checkout
│   │   ├── (app)/                # Onboarding, select-company
│   │   └── (dashboard)/          # App tenant [companySlug] (renomear → app)
│           ├── employees/
│           ├── clients/
│           ├── addresses/
│           ├── tasks/
│           ├── reports/
│           └── settings/
├── actions/                  # Server Actions por domínio
├── components/
│   ├── ui/                   # shadcn/ui
│   ├── layout/               # Shell, sidebar, header
│   └── features/             # Componentes por feature (fase 2)
├── config/                   # Constantes, nav, permissões
├── hooks/
├── lib/
│   ├── auth/                 # Sessão, guards, permissões
│   ├── supabase/             # Clients SSR
│   └── validations/          # Schemas Zod compartilhados
└── types/                    # Tipos DB e domínio

supabase/
├── config.toml
└── migrations/               # SQL versionado

docs/
├── ARCHITECTURE.md           # Este arquivo
├── DATABASE.md               # Modelo de dados
└── AUTH_FLOW.md              # Fluxo de autenticação
```

## Domínios funcionais (fases)

### Fase 1 — Fundação (atual)
- Schema + RLS + migrations
- Tipos TypeScript
- Auth (login, logout, callback, middleware)
- Guards de permissão

### Fase 2 — CRUD core
- Empresas, funcionários, clientes, endereços
- Dashboard administrativo

### Fase 3 — Operações de campo
- Tarefas, check-in/out, fotos antes/depois
- Histórico de atividades

### Fase 4 — Relatórios
- Geração PDF (server-side)
- Exportação por período/cliente/funcionário

## Padrões de código

### Server Actions
```typescript
// actions/[domain]/actions.ts
"use server";
export async function createClient(input: CreateClientInput) {
  const ctx = await requireCompanyContext({ minRole: "supervisor" });
  const parsed = createClientSchema.parse(input);
  // supabase insert + revalidatePath
}
```

### Queries em RSC
```typescript
const supabase = await createClient();
const { data } = await supabase.from("clients").select("*").eq("company_id", companyId);
// RLS filtra automaticamente — company_id é defesa em profundidade
```

### Active company
Cookie `feldops_company_id` (httpOnly) definido ao entrar no dashboard. Validado contra `company_members` em cada request protegido.

## Stack

- **Runtime:** Next.js 15 App Router, React 19, TypeScript strict
- **Backend:** Supabase Postgres, Auth, Storage
- **UI:** Tailwind CSS 4, shadcn/ui, Lucide
- **Forms:** react-hook-form + Zod
- **Data fetching:** TanStack Query (client) + RSC (server)

## Variáveis de ambiente

Ver `.env.example`. Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente.
