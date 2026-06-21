import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createDb, payrollPeriods, advances, productionLogs, operations, users } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { AppContext } from "../index";
import { requireActivePlan } from "../middleware/requireActivePlan";

export const payrollRoutes = new Hono<AppContext>();

// GET /payroll/periods — lista períodos do tenant
payrollRoutes.get("/periods", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const periods = await db
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.tenantId, tenant_id))
    .orderBy(sql`${payrollPeriods.createdAt} DESC`);

  return c.json(periods);
});

// POST /payroll/periods — abre novo período
payrollRoutes.post("/periods", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const body = await c.req.json<{ startDate?: string; endDate?: string }>();

  if (!body.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) return c.json({ error: "startDate obrigatorio (YYYY-MM-DD)" }, 400);
  if (!body.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) return c.json({ error: "endDate obrigatorio (YYYY-MM-DD)" }, 400);
  if (body.startDate >= body.endDate) return c.json({ error: "startDate deve ser anterior a endDate" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  // Bloquear se já existe período aberto
  const [existing] = await db
    .select({ id: payrollPeriods.id })
    .from(payrollPeriods)
    .where(
      and(
        eq(payrollPeriods.tenantId, tenant_id),
        sql`${payrollPeriods.status} = 'open'`,
      )
    )
    .limit(1);

  if (existing) return c.json({ error: "Ja existe um periodo de folha aberto. Feche-o antes de abrir um novo." }, 409);

  const [period] = await db
    .insert(payrollPeriods)
    .values({ tenantId: tenant_id, startDate: body.startDate, endDate: body.endDate })
    .returning();

  return c.json(period, 201);
});

// GET /payroll/periods/:id — calcula folha ao vivo
payrollRoutes.get("/periods/:id", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const periodId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);

  const [period] = await db
    .select()
    .from(payrollPeriods)
    .where(and(eq(payrollPeriods.id, periodId), eq(payrollPeriods.tenantId, tenant_id)))
    .limit(1);

  if (!period) return c.json({ error: "Periodo nao encontrado" }, 404);

  // Logs do período com pricePerPiece e nome da costureira
  const logs = await db
    .select({
      userId: productionLogs.userId,
      userName: users.name,
      quantity: productionLogs.quantity,
      pricePerPiece: operations.pricePerPiece,
      operationName: operations.name,
    })
    .from(productionLogs)
    .innerJoin(operations, eq(productionLogs.operationId, operations.id))
    .innerJoin(users, eq(productionLogs.userId, users.id))
    .where(
      and(
        eq(productionLogs.tenantId, tenant_id),
        sql`${productionLogs.loggedAt}::date >= ${period.startDate}::date`,
        sql`${productionLogs.loggedAt}::date <= ${period.endDate}::date`,
      )
    );

  // Todas as costureiras ativas do tenant — para exibir zeradas se não tiverem logs
  const allSeamstresses = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant_id),
        sql`${users.role} IN ('seamstress', 'supervisor')`,
        sql`${users.active} = true`,
      )
    );

  // Vales do período
  const periodAdvances = await db
    .select({
      id: advances.id,
      userId: advances.userId,
      userName: users.name,
      amount: advances.amount,
      note: advances.note,
      createdAt: advances.createdAt,
    })
    .from(advances)
    .innerJoin(users, eq(advances.userId, users.id))
    .where(
      and(
        eq(advances.tenantId, tenant_id),
        eq(advances.periodId, periodId),
      )
    );

  // Agregar por costureira
  const seamstressMap = new Map<string, {
    userId: string;
    userName: string;
    pieces: number;
    grossEarnings: number;
    advances: number;
    netEarnings: number;
  }>();

  // Inicializar todas as costureiras com zero — garante que aparecem mesmo sem logs
  for (const s of allSeamstresses) {
    if (!seamstressMap.has(s.id)) {
      seamstressMap.set(s.id, {
        userId: s.id,
        userName: s.name,
        pieces: 0,
        grossEarnings: 0,
        advances: 0,
        netEarnings: 0,
      });
    }
  }

  for (const log of logs) {
    const existing = seamstressMap.get(log.userId) ?? {
      userId: log.userId,
      userName: log.userName,
      pieces: 0,
      grossEarnings: 0,
      advances: 0,
      netEarnings: 0,
    };
    existing.pieces += log.quantity;
    if (log.pricePerPiece) {
      existing.grossEarnings += log.quantity * parseFloat(log.pricePerPiece);
    }
    seamstressMap.set(log.userId, existing);
  }

  for (const adv of periodAdvances) {
    const existing = seamstressMap.get(adv.userId);
    if (existing) {
      existing.advances += parseFloat(adv.amount);
    }
  }

  const seamstresses = Array.from(seamstressMap.values()).map((s) => ({
    ...s,
    grossEarnings: Math.round(s.grossEarnings * 100) / 100,
    advances: Math.round(s.advances * 100) / 100,
    netEarnings: Math.round((s.grossEarnings - s.advances) * 100) / 100,
  })).sort((a, b) => a.userName.localeCompare(b.userName));

  const totalGross = seamstresses.reduce((sum, s) => sum + s.grossEarnings, 0);
  const totalAdvances = seamstresses.reduce((sum, s) => sum + s.advances, 0);
  const totalNet = seamstresses.reduce((sum, s) => sum + s.netEarnings, 0);

  return c.json({
    period,
    seamstresses,
    advances: periodAdvances,
    totals: {
      grossEarnings: Math.round(totalGross * 100) / 100,
      advances: Math.round(totalAdvances * 100) / 100,
      netEarnings: Math.round(totalNet * 100) / 100,
    },
  });
});

// POST /payroll/periods/:id/close — fecha período
payrollRoutes.post("/periods/:id/close", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const periodId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);

  const [period] = await db
    .select()
    .from(payrollPeriods)
    .where(and(eq(payrollPeriods.id, periodId), eq(payrollPeriods.tenantId, tenant_id)))
    .limit(1);

  if (!period) return c.json({ error: "Periodo nao encontrado" }, 404);
  if (period.status === "closed") return c.json({ error: "Periodo ja esta fechado" }, 409);

  const now = new Date();
  const closedAtRaw = now.toISOString();

  const [updated] = await db
    .update(payrollPeriods)
    .set({
      status: "closed",
      closedAt: sql.raw(`'${closedAtRaw}'::timestamptz`),
    })
    .where(eq(payrollPeriods.id, periodId))
    .returning();

  return c.json(updated);
});

// POST /payroll/periods/:id/advances — registra vale
payrollRoutes.post("/periods/:id/advances", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const periodId = c.req.param("id");
  const body = await c.req.json<{ userId?: string; amount?: number; note?: string }>();

  if (!body.userId || typeof body.userId !== "string") return c.json({ error: "userId obrigatorio" }, 400);
  if (typeof body.amount !== "number" || body.amount <= 0) return c.json({ error: "amount deve ser maior que zero" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  const [period] = await db
    .select({ id: payrollPeriods.id, status: payrollPeriods.status })
    .from(payrollPeriods)
    .where(and(eq(payrollPeriods.id, periodId), eq(payrollPeriods.tenantId, tenant_id)))
    .limit(1);

  if (!period) return c.json({ error: "Periodo nao encontrado" }, 404);
  if (period.status === "closed") return c.json({ error: "Nao e possivel registrar vale em periodo fechado" }, 409);

  const amountStr = body.amount.toFixed(2);

  const [advance] = await db
    .insert(advances)
    .values({
      tenantId: tenant_id,
      periodId,
      userId: body.userId,
      amount: amountStr,
      note: body.note ?? null,
    })
    .returning();

  return c.json(advance, 201);
});
