# OrdireOS — Guia de Demo

> Duração: ~20 minutos | Público: donos e supervisores de confecção/facção

---

## Antes da demo

1. Abrir o tenant de demo em produção: https://ordire-os-api.vercel.app
2. Logar como owner: `demo@confeccaodemo.com.br` / `Demo@2026`
3. Ter o roteiro abaixo visível numa segunda tela ou impresso

---

## Roteiro (20 min)

### 1. Abertura — O problema (2 min)

Pergunta para o prospect **antes** de mostrar qualquer tela:

> "Hoje, como você sabe quanto cada costureira produziu na semana? E como calcula o pagamento dela?"

Deixa responder. Escuta. Só então:

> "O OrdireOS resolve exatamente isso — do lançamento de produção até o cálculo da folha, tudo num lugar só."

---

### 2. Lançamento de produção — visão da costureira (5 min)

- Logar como costureira: `ana@confeccaodemo.com.br` / `Demo@2026`
- Mostrar a tela da costureira: ordem de produção ativa, operações disponíveis
- Registrar 2-3 peças ao vivo
- Mostrar o ganho estimado atualizando em tempo real

**Ponto de impacto:** *"Antes ela anotava num papel ou você controlava numa planilha. Aqui ela mesma lança, e você vê na hora."*

---

### 3. Dashboard do owner — visão gerencial (5 min)

- Logar de volta como owner
- Mostrar KPIs: total de peças, operações do dia, costureiras ativas
- Mostrar o dashboard do supervisor (se relevante para o prospect)

**Ponto de impacto:** *"Você sabe em tempo real o que está acontecendo no chão de fábrica, sem precisar perguntar para ninguém."*

---

### 4. Folha de pagamento (5 min)

- Abrir módulo Folha
- Mostrar período aberto, peças por costureira, valor calculado automaticamente
- Mostrar como fechar o período

**Ponto de impacto:** *"O sistema calcula a folha automaticamente com base no que cada uma produziu. Sem planilha, sem erro de conta."*

---

### 5. Fechamento — perguntas (3 min)

Fazer as três perguntas abaixo **em ordem**, sem pular:

1. *"O que ficou confuso ou que você sentiu falta?"*
2. *"Quanto você gasta hoje — em tempo ou em dinheiro — para controlar isso?"*
3. *"Se eu te der acesso gratuito por 30 dias, você usaria de verdade com suas costureiras?"*

A resposta à pergunta 3 é o dado mais importante da conversa. Anotar literalmente o que disserem.

---

## Após a demo

- Enviar link do sistema via WhatsApp com o login de teste
- Registrar objeções e respostas no arquivo `PROSPECTS.md`
- Se resposta à pergunta 3 for sim: agendar onboarding assistido em até 48h

---

## Seed SQL — Tenant de Demo

Rodar no console do Neon (projeto OrdireOS) **uma única vez**.

```sql
-- 1. Criar tenant de demo
INSERT INTO tenants (id, name, slug, plan, trial_ends_at, created_at)
VALUES (
  'demo-tenant-001',
  'Confecção Demo',
  'confeccao-demo',
  'active',
  '2030-12-31T00:00:00.000Z',
  NOW()
);

-- 2. Owner da demo
-- Senha: Demo@2026 (bcrypt hash gerado com saltRounds=10)
INSERT INTO users (id, tenant_id, name, email, password_hash, role, requires_password_change, created_at)
VALUES (
  'demo-owner-001',
  'demo-tenant-001',
  'Dono Demo',
  'demo@confeccaodemo.com.br',
  '$2b$10$vOsvCT3EQ/6eV0bLYcg40uZJMdKa.kdbvQjdQvkB/UFy6Lp3smdpu',
  'owner',
  false,
  NOW()
);

-- 3. Supervisor da demo
INSERT INTO users (id, tenant_id, name, email, password_hash, role, requires_password_change, created_at)
VALUES (
  'demo-supervisor-001',
  'demo-tenant-001',
  'Maria Supervisora',
  'maria@confeccaodemo.com.br',
  '$2b$10$vOsvCT3EQ/6eV0bLYcg40uZJMdKa.kdbvQjdQvkB/UFy6Lp3smdpu',
  'supervisor',
  false,
  NOW()
);

-- 4. Costureira da demo
INSERT INTO users (id, tenant_id, name, email, password_hash, role, requires_password_change, created_at)
VALUES (
  'demo-seamstress-001',
  'demo-tenant-001',
  'Ana Costureira',
  'ana@confeccaodemo.com.br',
  '$2b$10$vOsvCT3EQ/6eV0bLYcg40uZJMdKa.kdbvQjdQvkB/UFy6Lp3smdpu',
  'seamstress',
  false,
  NOW()
);

-- 5. Operações realistas
INSERT INTO operations (id, tenant_id, name, price_per_piece, created_at)
VALUES
  ('demo-op-001', 'demo-tenant-001', 'Costura de bainha', 0.85, NOW()),
  ('demo-op-002', 'demo-tenant-001', 'Overlock lateral', 1.20, NOW()),
  ('demo-op-003', 'demo-tenant-001', 'Fechamento de manga', 1.50, NOW()),
  ('demo-op-004', 'demo-tenant-001', 'Caseado e botão', 0.95, NOW()),
  ('demo-op-005', 'demo-tenant-001', 'Pesponto frontal', 1.10, NOW());

-- 6. Ordem de produção ativa
INSERT INTO production_orders (id, tenant_id, name, description, status, created_at)
VALUES (
  'demo-order-001',
  'demo-tenant-001',
  'Lote Verão 2026 — Blusas',
  'Lote de 200 peças, entrega 15/07',
  'open',
  NOW()
);

-- 7. Logs de produção históricos (últimos 7 dias) para Ana
INSERT INTO production_logs (id, tenant_id, user_id, production_order_id, operation_id, quantity, log_date, created_at)
VALUES
  ('demo-log-001', 'demo-tenant-001', 'demo-seamstress-001', 'demo-order-001', 'demo-op-001', 24, CURRENT_DATE - 6, NOW()),
  ('demo-log-002', 'demo-tenant-001', 'demo-seamstress-001', 'demo-order-001', 'demo-op-002', 18, CURRENT_DATE - 5, NOW()),
  ('demo-log-003', 'demo-tenant-001', 'demo-seamstress-001', 'demo-order-001', 'demo-op-003', 15, CURRENT_DATE - 4, NOW()),
  ('demo-log-004', 'demo-tenant-001', 'demo-seamstress-001', 'demo-order-001', 'demo-op-001', 30, CURRENT_DATE - 3, NOW()),
  ('demo-log-005', 'demo-tenant-001', 'demo-seamstress-001', 'demo-order-001', 'demo-op-004', 20, CURRENT_DATE - 2, NOW()),
  ('demo-log-006', 'demo-tenant-001', 'demo-seamstress-001', 'demo-order-001', 'demo-op-002', 22, CURRENT_DATE - 1, NOW());

-- 8. Período de folha aberto
INSERT INTO payroll_periods (id, tenant_id, start_date, end_date, status, created_at)
VALUES (
  'demo-period-001',
  'demo-tenant-001',
  TO_CHAR(DATE_TRUNC('month', CURRENT_DATE), 'YYYY-MM-DD'),
  TO_CHAR((DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'), 'YYYY-MM-DD'),
  'open',
  NOW()
);
```

> ⚠️ **Atenção:** O hash acima (`$2b$10$92IXU...`) é o bcrypt de `password` (senha de teste do bcrypt.js). Substituir pelo hash real de `Demo@2026` antes de usar. Rodar o script abaixo localmente para gerar:
>
> ```bash
> node -e "const b=require('bcryptjs');b.hash('Demo@2026',10).then(console.log)"
> ```
> Depois substituir os 4 valores de `password_hash` no SQL acima.

---

## Logins da demo

| Role | Email | Senha |
|---|---|---|
| Owner | demo@confeccaodemo.com.br | Demo@2026 |
| Supervisor | maria@confeccaodemo.com.br | Demo@2026 |
| Costureira | ana@confeccaodemo.com.br | Demo@2026 |

---

## PROSPECTS.md — template

Criar o arquivo `PROSPECTS.md` na raiz do repo para registrar cada conversa:

```markdown
# Prospects

## [Nome / Empresa] — [Data]
- **Situação atual:** como controlam hoje
- **Reação à demo:** o que chamou atenção, o que gerou dúvida
- **Objeções literais:** (copiar exatamente o que disseram)
- **Resposta à pergunta 3:** sim / não / talvez + contexto
- **Próximo passo:**
```
