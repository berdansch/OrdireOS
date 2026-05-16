# specs.md — OrdireOS

## 1. Visao do Produto

OrdireOS e um SaaS vertical de gestao operacional para faccoes texteis de pequeno e medio porte em Santa Catarina.

Missao da V1: digitalizar o lancamento de producao da costureira.
Visao: replicar a trajetoria do Toast para o contexto textil.

## 2. Decisoes fechadas do M6

- Ordenacao de ordens: in_progress primeiro, depois open por data
- Turno: automatico por hora (morning 06-13h, afternoon 14-21h, night 22-05h)
- Mensagem pos-lancamento: "Producao registrada. Em caso de erro, fale com seu supervisor."
- Sem edicao ou exclusao de logs na V1
- M6.0 e pre-requisito bloqueante: cadastro de operacoes para o owner
- price_per_piece adicionado em operations antes do M6

## 3. Sprints M6

M6.0: cadastro de operacoes (owner) — BLOQUEANTE
M6.1: estrutura base do modulo costureira
M6.2: logica principal de lancamento
M6.3: UX e feedback
M6.4: historico do dia
M6.5: refinamento e commit final

## 4. Decisoes fechadas do M7

- Periodo padrao: semana atual com filtro dia/mes/customizado
- Custo por peca via price_per_piece em operations

## 5. Sprints M7

M7.1: estrutura base + seletor de periodo
M7.2: metricas de volume
M7.3: metricas de qualidade e custo
M7.4: UX e refinamento

## 6. Stack

- Frontend: Next.js 16 + Tailwind 4 + Turbopack
- Backend: Hono + Cloudflare Workers
- ORM: Drizzle ORM
- Banco: PostgreSQL (Neon)
- Monorepo: Turborepo + PNPM

## 7. Multi-Tenancy

Toda tabela operacional tem tenant_id NOT NULL.
Nenhuma query executa sem filtro de tenant_id ativo.

## 8. Autenticacao (M5 concluido)

- Access token: 15min em memoria
- Refresh token: 7 dias cookie HttpOnly
- Biblioteca: jose
