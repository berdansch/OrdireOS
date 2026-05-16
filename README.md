<div align="center">

# OrdireOS

**O sistema operacional da facção têxtil.**

*Do latim* ordiri *— montar o urdume no tear, organizar os fios antes de qualquer tecido existir.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-Cloudflare_Workers-E36002?style=flat-square&logo=cloudflare&logoColor=white)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=flat-square&logo=postgresql&logoColor=black)](https://orm.drizzle.team/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)

</div>

---

## O problema

Pequenas e médias facções têxteis do Sul do Brasil gerenciam o chão de fábrica com papel, planilha e memória. Não porque os donos não queiram melhorar — mas porque nenhum software existente foi construído para eles.

Os sistemas disponíveis são caros, complexos, pensados para grandes indústrias e exigem treinamento técnico que operadoras de costura não têm tempo de fazer. O resultado é gestão informal: metas estimadas, retrabalho subnotificado, custo por peça desconhecido, folha de pagamento calculada na planilha no final do mês.

**OrdireOS começa pelo problema mais simples:** dar à costureira uma forma de registrar o que produziu no turno. Sem papel. Sem intermediário. Direto do celular.

---

## A estratégia: replicar o Toast

O [Toast](https://pos.toasttab.com/) é hoje uma plataforma de ~$1B de receita anual para restaurantes. Mas começou resolvendo um problema cotidiano e específico: o garçom precisava anotar pedidos, enviar para a cozinha e fechar a conta.

**A trajetória do OrdireOS segue a mesma lógica, aplicada ao contexto têxtil:**

| Fase | OrdireOS | Equivalente Toast |
|---|---|---|
| 1 | Lançamento de produção pela costureira | POS para garçom |
| 2 | Painel do supervisor em tempo real | Kitchen Display System |
| 3 | Dashboard do proprietário (custo/eficiência) | Gestão completa |
| 4 | Folha de pagamento por peça | Toast Payroll |
| 5 | Antecipação de recebíveis via histórico | Toast Capital |
| 6 | IA preditiva de eficiência | ToastIQ |

---

## Stack técnica

```
Monorepo:    Turborepo + PNPM workspace
Frontend:    apps/web   → Next.js 16 + Tailwind 4 + Turbopack
Backend:     apps/api   → Hono (Cloudflare Workers)
Packages:    packages/shared → código compartilhado
             packages/db     → Drizzle ORM + schema + migrations
Qualidade:   TypeScript Strict + ESLint v10 + Prettier
Deploy:      Vercel (web) · Cloudflare Workers (api) · Neon (db)
```

---

## Arquitetura multi-tenant

Isolamento por `tenant_id` em todas as tabelas operacionais desde o schema. Nenhuma query executa sem filtro de tenant ativo — regra inviolável.

---

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação do monorepo (Turborepo + PNPM + TS Strict + ESLint + Prettier) | ✅ Concluído |
| M1 | Apps inicializados (Next.js 16 + Hono rodando) | ✅ Concluído |
| M2 | Packages placeholder (shared + db) | ✅ Concluído |
| M3 | AGENTS.md + specs.md + Progress Tracker + symlink CLAUDE.md | ✅ Concluído |
| M4 | Schema Drizzle completo + migrations + seed + Neon | ✅ Concluído |
| M5 | Autenticação JWT + roles + tenant isolation | ✅ Concluído |
| M6 | Feature core: lançamento de produção (costureira) | 🔵 Em andamento |
| M7 | Dashboard do proprietário | ⬜ A fazer |
| M8 | Deploy (Vercel + Cloudflare Workers + Neon) | ⬜ A fazer |

---

## Desenvolvimento com IA

Este projeto é desenvolvido em parceria com **Claude Code** como agente de desenvolvimento. A estrutura do repositório foi pensada para maximizar a efetividade desse fluxo:

- **`AGENTS.md`** define as regras que o agente deve seguir antes de qualquer tarefa
- **`CLAUDE.md`** é um symlink para `AGENTS.md`
- **`specs.md`** concentra toda a especificação técnica e de produto
- **`progress.json`** é o estado vivo dos milestones, atualizado pelo agente

---

## Como rodar localmente

```bash
# Clonar
git clone https://github.com/berdansch/OrdireOS.git
cd OrdireOS

# Instalar dependências
pnpm install

# Banco de dados
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Rodar
pnpm dev
```

---

## Licença

Proprietário. Código público até M5 para fins de portfólio.

---

<div align="center">

Construído em Santa Catarina, Brasil 🧵

</div>
