# AGENTS.md — OrdireOS

> Lido automaticamente pelo Claude Code, Cursor e Codex antes de qualquer tarefa.
> Simlink: `CLAUDE.md → AGENTS.md`

## Regras obrigatórias antes de qualquer tarefa

1. Abrir `specs.md` antes de trabalhar. Sem exceção.
2. Ler o `progress.json` atual. Nunca assuma qual milestone está ativo.
3. Terminar um milestone completamente antes de iniciar o próximo.
4. Aguardar confirmação explícita do Bernardo antes de marcar qualquer milestone como concluído.
5. Atualizar `progress.json` ao finalizar cada milestone confirmado.
6. Nunca sugerir mudanças de stack a menos que o Bernardo peça explicitamente.
7. Perguntar antes de assumir em qualquer decisão técnica ambígua.

## Stack — decisões fechadas (não rediscutir)

- Frontend: Next.js 16 + Tailwind 4 + Turbopack
- Backend: Hono (Cloudflare Workers)
- Monorepo: Turborepo + PNPM workspace
- ORM: Drizzle ORM
- Banco: PostgreSQL (Neon)
- Deploy: Vercel (web) + Cloudflare Workers (api)
- Qualidade: TypeScript Strict + ESLint v10 + Prettier

## Multi-tenancy — regra de ouro

Toda tabela operacional tem tenant_id NOT NULL. Nenhuma query roda sem filtro de tenant.

## Fluxo de trabalho do agente

1. Ler AGENTS.md
2. Ler specs.md
3. Ler progress.json
4. Executar apenas o trabalho do milestone ativo
5. Reportar para Bernardo ao concluir
6. Após confirmação → atualizar progress.json
7. Nunca avançar sem confirmação
