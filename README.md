# OrdireOS

**O sistema operacional da facção têxtil.**

## O problema

Pequenas e médias facções têxteis do Sul do Brasil gerenciam o chão de fábrica com papel, planilha e memória. Sistemas disponíveis são caros, complexos e pensados para grandes indústrias.

OrdireOS começa pelo problema mais simples: dar à costureira uma forma de registrar o que produziu no turno. Sem papel. Sem intermediário. Direto do celular.

## A estratégia

Replicar a trajetória do Toast para restaurantes — começar pelo problema cotidiano e específico, acumular dados operacionais reais e construir camadas de valor em cima disso.

## Stack

- Monorepo: Turborepo + PNPM
- Frontend: Next.js 16 + Tailwind 4 + Turbopack
- Backend: Hono + Cloudflare Workers
- ORM: Drizzle ORM
- Banco: PostgreSQL (Neon)
- Deploy: Vercel + Cloudflare Workers

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação do monorepo | ✅ Concluído |
| M1 | Apps inicializados | ✅ Concluído |
| M2 | Packages placeholder | ✅ Concluído |
| M3 | AGENTS.md + specs.md + Progress Tracker | ✅ Concluído |
| M4 | Schema Drizzle + migrations + seed + Neon | ✅ Concluído |
| M5 | Autenticação JWT + roles + tenant isolation | ⬜ A fazer |
| M6 | Feature core: lançamento de produção | ⬜ A fazer |
| M7 | Dashboard do proprietário | ⬜ A fazer |
| M8 | Deploy em produção | ⬜ A fazer |

## Licença

Proprietário. Código público até M5 para fins de portfólio.
