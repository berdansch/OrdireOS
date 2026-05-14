# specs.md — OrdireOS

## 1. Visao do Produto

OrdireOS e um SaaS vertical de gestao operacional para faccoes texteis de pequeno e medio porte em Santa Catarina.

Missao da V1: digitalizar o lancamento de producao da costureira.
Visao: replicar a trajetoria do Toast para o contexto textil.

## 2. Roadmap de Usuarios

1. Costureira — lanca producao diaria
2. Supervisor de linha — visibilidade em tempo real
3. Encarregado de corte — ordens de corte e consumo de tecido
4. PCP — programacao de ordens e capacidade
5. Proprietario/Gerente — dashboard executivo
6. Financeiro — fechamento de folha e margem real
7. Plataforma — benchmarks setoriais

## 3. Roles e Permissoes

- owner: acesso total ao tenant
- supervisor: visualizacao em tempo real e gestao de ordens
- seamstress: apenas lancamento de producao propria
- admin: super-admin cross-tenant (apenas equipe OrdireOS)

## 4. Multi-Tenancy

Modelo: isolamento por tenant_id em todas as tabelas operacionais.
Regra: nenhuma query executa sem filtro de tenant_id ativo.

## 5. Stack

- Frontend: Next.js 16 + Tailwind 4 + Turbopack (Vercel)
- Backend: Hono + Cloudflare Workers
- ORM: Drizzle ORM
- Banco: PostgreSQL (Neon)
- Monorepo: Turborepo + PNPM

## 6. Schema do Banco (M4 concluido)

Migration aplicada: 0000_cool_mole_man.sql

Tabelas: tenants, users, production_orders, operations, production_logs
Migration pendente antes do M6: adicionar price_per_piece em operations

## 7. Autenticacao (M5)

- Access token: 15min em memoria do cliente
- Refresh token: 7 dias em cookie HttpOnly
- Biblioteca: jose (Edge runtime compativel)

Rotas:
POST /auth/login
POST /auth/refresh
POST /auth/logout

## 8. Decisoes fechadas do M6

- Ordenacao de ordens: in_progress primeiro, depois open por data
- Turno: automatico por hora (morning 06-13h, afternoon 14-21h, night 22-05h)
- Mensagem pos-lancamento: "Producao registrada. Em caso de erro, fale com seu supervisor."
- Sem edicao ou exclusao de logs na V1
- M6.0 e pre-requisito bloqueante: cadastro de operacoes para o owner

## 9. Sprints M6

M6.0: cadastro de operacoes (owner) — BLOQUEANTE
M6.1: estrutura base do modulo costureira
M6.2: logica principal de lancamento
M6.3: UX e feedback
M6.4: historico do dia
M6.5: refinamento e commit final

## 10. Decisoes fechadas do M7

- Periodo padrao: semana atual com filtro dia/mes/customizado
- Custo por peca via price_per_piece em operations

## 11. Sprints M7

M7.1: estrutura base + seletor de periodo
M7.2: metricas de volume
M7.3: metricas de qualidade e custo
M7.4: UX e refinamento

## 12. Metricas do M7

- Custo por peca: SUM(quantity x price_per_piece)
- Eficiencia: quantidade x standard_time_seconds / tempo real
- Producao por turno: SUM(quantity) GROUP BY shift
- Taxa de retrabalho: SUM(rework_quantity) / SUM(quantity)
- Ranking costureiras: SUM(quantity) GROUP BY user_id
- Status ordens: SUM(logs.quantity) / orders.total_pieces x 100

## 13. Variaveis de Ambiente

apps/api/.dev.vars:
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
ENVIRONMENT=development

apps/web/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:8787

## 14. Glossario

- Faccao: empresa que executa etapas de costura por terceirizacao
- OS: Ordem de Servico — lote de pecas
- Operacao: etapa especifica do processo
- Retrabalho: peca refeita por defeito
- Turno: detectado automaticamente pelo sistema
