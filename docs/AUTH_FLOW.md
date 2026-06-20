# FeldOps — Fluxo de Autenticação

## Diagrama

```
┌──────────┐     login/register      ┌─────────────────┐
│  Browser │ ───────────────────────► │ Server Action   │
└──────────┘                          │ signIn/signUp   │
     ▲                                └────────┬────────┘
     │                                         │
     │         Set-Cookie (session)            ▼
     │                                ┌─────────────────┐
     │                                │  Supabase Auth  │
     │                                └────────┬────────┘
     │                                         │
     │   redirect                              │
     ▼                                         ▼
┌──────────┐   refresh session    ┌──────────────────────┐
│middleware│ ◄─────────────────►│ @supabase/ssr cookies │
└────┬─────┘                    └──────────────────────┘
     │
     ├── sem sessão + rota protegida → /login
     ├── com sessão + /login → redirect dashboard
     └── com sessão + dashboard → validar membership
```

## Rotas

| Rota | Acesso | Comportamento |
|------|--------|---------------|
| `/` | público | Marketing / redirect se logado |
| `/login` | guest | Formulário email+senha |
| `/register` | guest | Cria conta + profile via trigger |
| `/auth/callback` | auth | OAuth / email confirm PKCE |
| `/onboarding` | autenticado | Criar empresa ou aguardar convite |
| `/[companySlug]/*` | membro ativo | Dashboard tenant |

## Clientes Supabase

| Arquivo | Uso |
|---------|-----|
| `lib/supabase/client.ts` | Client Components (`createBrowserClient`) |
| `lib/supabase/server.ts` | Server Components, Actions (`createServerClient`) |
| `lib/supabase/middleware.ts` | Refresh de token no edge |
| `lib/supabase/admin.ts` | Service role — **somente** onboarding/admin ops server-side |

## Cookie de tenant ativo

Nome: `feldops_company_id` (httpOnly, secure em prod, sameSite=lax)

Fluxo:
1. Usuário loga → `getUserCompanies()` 
2. Se 1 empresa → set cookie automaticamente → redirect `/{slug}`
3. Se N empresas → `/select-company` (fase 2)
4. Se 0 empresas → `/onboarding`

Validação em `requireCompanyContext()`:
```typescript
const companyId = cookies().get(COOKIE_NAME)?.value;
const membership = await getMembership(userId, companyId);
if (!membership || membership.status !== 'active') redirect('/onboarding');
```

## Guards

| Função | Retorno |
|--------|---------|
| `getSession()` | User ou null |
| `requireAuth()` | User ou redirect `/login` |
| `getCompanyContext()` | `{ user, company, membership, employee? }` |
| `requireCompanyContext({ minRole })` | Context ou redirect/throw |

## Signup

1. `signUp` via Supabase Auth (email + password)
2. Trigger `handle_new_user` cria row em `profiles`
3. Redirect `/onboarding` para criar `companies` + `company_members` (role admin)
4. Criação de empresa usa **admin client** (service role) ou RPC security definer — membership inicial não pode ser inserido por anon

## Convites (fase 2)

1. Admin cria `company_invites` + envia email
2. Usuário registra/loga → aceita convite → `company_members` insert
3. Token single-use com expiry

## Segurança

- **Nunca** usar `user_metadata` para roles
- JWT refresh automático via middleware
- Logout: `signOut` + clear cookies + redirect `/login`
- PKCE flow para OAuth/email links em `/auth/callback`

## Middleware matcher

Protege: `/onboarding`, `/[companySlug]/*`  
Exclui: `/`, `/login`, `/register`, `/auth/*`, assets estáticos
