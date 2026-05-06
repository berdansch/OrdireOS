# specs.md — OrdireOS

## 1. Visão do Produto

OrdireOS é um SaaS vertical de gestão operacional para facções têxteis de pequeno e médio porte em Santa Catarina.

Missão da V1: digitalizar o lançamento de produção da costureira.
Visão: replicar a trajetória do Toast para o contexto têxtil.

## 2. Roadmap de Usuários

1. Costureira — lança produção diária
2. Supervisor de linha — visibilidade em tempo real
3. Encarregado de corte — ordens de corte e consumo de tecido
4. PCP — programação de ordens e capacidade
5. Proprietário/Gerente — dashboard executivo
6. Financeiro — fechamento de folha e margem real
7. Plataforma — benchmarks setoriais

## 3. Roles e Permissões

- owner: acesso total ao tenant
- supervisor: visualização em tempo real e gestão de ordens
- seamstress: apenas lançamento de produção própria
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

## 6. Autenticação (M5)

- Access token: 15min, contém user_id + tenant_id + role
- Refresh token: 7 dias, cookie HttpOnly
- Stateless — sem sessão no banco

## 7. Rotas da API

POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /tenants/me
GET  /users
POST /users
GET  /production-orders
POST /production-orders
GET  /operations
POST /operations
GET  /production-logs
POST /production-logs

## 8. Decisões Técnicas

- Neon vs Supabase: Neon escolhido
- JWT stateless: fechado
- Redis para blacklist: aberto
- WebSocket vs polling: aberto
- Billing: aberto

## 9. Glossário

- Facção: empresa que executa etapas de costura por terceirização
- OS: Ordem de Serviço — ordem de produção de um lote
- Operação: etapa específica do processo
- Retrabalho: peça refeita por defeito
- Grade: distribuição de tamanhos (P/M/G/GG)
- Turno: período de trabalho (manhã, tarde, noite)
