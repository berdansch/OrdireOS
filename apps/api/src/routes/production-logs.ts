import { Hono } from "hono";
import { eq, and, gte, sql } from "drizzle-orm";
import { createDb, productionLogs, operations, productionOrders, payrollPeriods } from "@ordireos/db";
import type { AppContext } from "../index";
import { authMiddleware } from "../middleware/auth";

export const productionLogsRoutes = new Hono<AppContext>();

// GET /production-logs/my — histórico do dia da costureira logada
productionLogsRoutes.get("/my", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      id: productionLogs.id,
      quantity: productionLogs.quantity,
      reworkQuantity: productionLogs.reworkQuantity,
      shift: productionLogs.shift,
      loggedAt: productionLogs.loggedAt,
      operationName: operations.name,
      orderReference: productionOrders.reference,
    })
    .from(productionLogs)
    .innerJoin(operations, eq(productionLogs.operationId, operations.id))
    .innerJoin(productionOrders, eq(productionLogs.productionOrderId, productionOrders.id))
    .where(
      and(
        eq(productionLogs.tenantId, tenant_id),
        eq(productionLogs.userId, user_id),
        gte(productionLogs.loggedAt, startOfDay)
      )
    )
    .orderBy(productionLogs.loggedAt);

  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  return c.json({ logs: rows, total });
});

// GET /production-logs/my-stats — total da semana + ganho estimado do mês
productionLogsRoutes.get("/my-stats", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setUTCHours(3, 0, 0, 0);
  if (now.getTime() < todayStart.getTime()) {
    todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  }
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 3, 0, 0, 0));

  const fmt = (d: Date) => "'" + d.toISOString() + "'";

  const weekLogs = await db
    .select({ quantity: productionLogs.quantity })
    .from(productionLogs)
    .where(
      and(
        eq(productionLogs.tenantId, tenant_id),
        eq(productionLogs.userId, user_id),
        sql`${productionLogs.loggedAt} >= ${sql.raw(fmt(weekStart))}::timestamptz`,
      )
    );

  const weekTotal = weekLogs.reduce((sum, r) => sum + r.quantity, 0);

  const monthLogs = await db
    .select({
      quantity: productionLogs.quantity,
      pricePerPiece: operations.pricePerPiece,
    })
    .from(productionLogs)
    .innerJoin(operations, eq(productionLogs.operationId, operations.id))
    .where(
      and(
        eq(productionLogs.tenantId, tenant_id),
        eq(productionLogs.userId, user_id),
        sql`${productionLogs.loggedAt} >= ${sql.raw(fmt(monthStart))}::timestamptz`,
      )
    );

  const monthPieces = monthLogs.reduce((sum, r) => sum + r.quantity, 0);
  const estimatedEarnings = monthLogs.reduce((sum, r) => {
    if (!r.pricePerPiece) return sum;
    return sum + r.quantity * parseFloat(r.pricePerPiece);
  }, 0);

  return c.json({
    week: { pieces: weekTotal },
    month: { pieces: monthPieces, estimatedEarnings: Math.round(estimatedEarnings * 100) / 100 },
  });
});

// POST /production-logs — registrar produção
productionLogsRoutes.post("/", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const body = await c.req.json<{
    productionOrderId?: string;
    operationId?: string;
    quantity?: number;
    reworkQuantity?: number;
    shift?: string;
  }>();

  if (!body.productionOrderId || typeof body.productionOrderId !== "string") return c.json({ error: "productionOrderId obrigatorio" }, 400);
  if (!body.operationId || typeof body.operationId !== "string") return c.json({ error: "operationId obrigatorio" }, 400);
  if (typeof body.quantity !== "number" || body.quantity <= 0) return c.json({ error: "quantity deve ser um numero maior que zero" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  // Guard: rejeitar log retroativo em período fechado
  // loggedAt será defaultNow() — usamos a data de hoje no formato YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);
  const closedPeriod = await db
    .select({ id: payrollPeriods.id })
    .from(payrollPeriods)
    .where(
      and(
        eq(payrollPeriods.tenantId, tenant_id),
        sql`${payrollPeriods.status} = 'closed'`,
        sql`${payrollPeriods.startDate} <= ${today}`,
        sql`${payrollPeriods.endDate} >= ${today}`,
      )
    )
    .limit(1);

  if (closedPeriod.length > 0) {
    return c.json({ error: "Nao e possivel registrar producao em um periodo de folha ja fechado" }, 409);
  }

  const [log] = await db.insert(productionLogs).values({
    tenantId: tenant_id,
    userId: user_id,
    productionOrderId: body.productionOrderId,
    operationId: body.operationId,
    quantity: body.quantity,
    reworkQuantity: body.reworkQuantity ?? 0,
    shift: (body.shift as "morning" | "afternoon" | "night") ?? "morning",
  }).returning();

  return c.json(log, 201);
});

// GET /production-logs/my-history — últimos 30 dias agrupados por dia
productionLogsRoutes.get("/my-history", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => "'" + d.toISOString() + "'";

  const rows = await db
    .select({
      quantity: productionLogs.quantity,
      reworkQuantity: productionLogs.reworkQuantity,
      loggedAt: productionLogs.loggedAt,
      pricePerPiece: operations.pricePerPiece,
    })
    .from(productionLogs)
    .innerJoin(operations, eq(productionLogs.operationId, operations.id))
    .where(
      and(
        eq(productionLogs.tenantId, tenant_id),
        eq(productionLogs.userId, user_id),
        sql`${productionLogs.loggedAt} >= ${sql.raw(fmt(thirtyDaysAgo))}::timestamptz`,
      )
    )
    .orderBy(productionLogs.loggedAt);

  // Agrupar por dia (YYYY-MM-DD em BRT = UTC-3)
  const dayMap = new Map<string, { pieces: number; earnings: number }>();

  for (const row of rows) {
    const date = new Date(row.loggedAt);
    // Ajuste BRT: subtrai 3h para converter UTC → BRT
    const brtDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    const day = brtDate.toISOString().slice(0, 10);

    const existing = dayMap.get(day) ?? { pieces: 0, earnings: 0 };
    existing.pieces += row.quantity;
    if (row.pricePerPiece) {
      existing.earnings += row.quantity * parseFloat(row.pricePerPiece);
    }
    dayMap.set(day, existing);
  }

  // Ordenar do mais recente para o mais antigo
  const days = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      pieces: data.pieces,
      earnings: Math.round(data.earnings * 100) / 100,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return c.json({ days });
});
