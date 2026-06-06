import { Hono } from "hono";
import { eq, and, gte } from "drizzle-orm";
import { createDb, productionLogs, operations, productionOrders } from "@ordireos/db";
import type { AppContext } from "../index";
import { authMiddleware } from "../middleware/auth";

export const productionLogsRoutes = new Hono<AppContext>();

// GET /production-logs/my — histórico do dia da costureira logada
productionLogsRoutes.get("/my", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  // Início do dia atual em UTC
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
