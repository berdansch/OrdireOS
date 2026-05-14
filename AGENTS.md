# AGENTS.md — OrdireOS

> Lido automaticamente pelo Claude Code, Cursor e Codex antes de qualquer tarefa.
> Symlink: `CLAUDE.md → AGENTS.md`

## Regras obrigatórias antes de qualquer tarefa

1. Abrir specs.md antes de trabalhar. Sem exceção.
2. Ler o progress.json atual. Nunca assuma qual milestone está ativo.
3. Terminar um milestone completamente antes de iniciar o próximo.
4. Aguardar confirmacao explicita do Bernardo antes de marcar qualquer milestone como concluido.
5. Atualizar progress.json ao finalizar cada milestone confirmado.
6. Nunca sugerir mudancas de stack a menos que o Bernardo peca explicitamente.
7. Ativar apenas os skills do sprint atual.
8. Perguntar antes de assumir em qualquer decisao tecnica ambigua.

## Stack — decisoes fechadas (nao rediscutir)

- Frontend: Next.js 16 + Tailwind 4 + Turbopack
- Backend: Hono (Cloudflare Workers)
- Monorepo: Turborepo + PNPM workspace
- ORM: Drizzle ORM
- Banco: PostgreSQL (Neon) - definido no M4
- Deploy: Vercel (web) + Cloudflare Workers (api)
- Qualidade: TypeScript Strict + ESLint v10 + Prettier

## Multi-tenancy — regra de ouro

Toda tabela operacional tem tenant_id NOT NULL. Nenhuma query roda sem filtro de tenant.

## Fluxo de trabalho do agente

1. Ler AGENTS.md
2. Ler specs.md
3. Ler progress.json
4. Verificar skills ativos para o sprint atual
5. Executar apenas o trabalho do milestone ativo
6. Reportar para Bernardo ao concluir
7. Apos confirmacao atualizar progress.json
8. Nunca avancar sem confirmacao

## Skills — Base 5 (sempre ativos M6 em diante)

1. next-best-practices
2. hono-cloudflare-workers
3. typescript-advanced-types
4. systematic-debugging
5. verification-before-completion

## Skills por sprint M6

M6.0: Base 5 + api-design-principles + shadcn
M6.1: Base 5 + vercel-composition-patterns + api-design-principles
M6.2: Base 5 + api-design-principles + vercel-composition-patterns
M6.3: Base 5 + frontend-design + shadcn
M6.4: Base 5 + frontend-design + shadcn
M6.5: Base 5 + webapp-testing + playwright-best-practices

## Skills por sprint M7

M7.1: Base 5 + neon-postgres + vercel-composition-patterns
M7.2: Base 5 + neon-postgres + supabase-postgres-best-practices
M7.3: Base 5 + neon-postgres + supabase-postgres-best-practices + next-cache-components
M7.4: Base 5 + frontend-design + shadcn + next-cache-components

## Convencoes de codigo

- TypeScript Strict em todos os arquivos
- Imports absolutos com path aliases
- Nomes em ingles no codigo
- Commits semanticos por sprint
- Variaveis de ambiente nunca hardcoded
