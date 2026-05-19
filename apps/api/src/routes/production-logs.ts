import { Hono } from "hono";
import { eq, and, gte, lte } from "drizzle-orm";
import { createDb, productionLogs, operations, productionOrders } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import type { AppContext } from "../index";

export const productionLogsRoutes = new Hono<AppContext>();

function detectShift(): "morning" | "afternoon" | "night" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return "morning";
  if (hour >= 14 && hour < 22) return "afternoon";
  return "night";
}

productionLogsRoutes.post("/", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const body = await c.req.json<{
    productionOrderId: string;
    operationId: string;
    quantity: number;
    reworkQuantity?: number;
  }>();

  if (!body.productionOrderId || !body.operationId) {
    return c.json({ error: "Ordem e operacao sao obrigatorias" }, 400);
  }

  if (!body.quantity || body.quantity <= 0) {
    return c.json({ error: "Quantidade deve ser maior que zero" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);

  const [order] = await db
    .select()
    .from(productionOrders)
    .where(and(
      eq(productionOrders.id, body.productionOrderId),
      eq(productionOrders.tenantId, tenant_id)
    ))
    .limit(1);

  if (!order) return c.json({ error: "Ordem nao encontrada" }, 404);
  if (order.status === "closed") return c.json({ error: "Esta ordem ja foi encerrada" }, 400);

  const [operation] = await db
    .select()
    .from(operations)
    .where(and(
      eq(operations.id, body.operationId),
      eq(operations.tenantId, tenant_id),
      eq(operations.active, true)
    ))
    .limit(1);

  if (!operation) return c.json({ error: "Operacao nao encontrada" }, 404);

  const [log] = await db
    .insert(productionLogs)
    .values({
      tenantId: tenant_id,
      userId: user_id,
      productionOrderId: body.productionOrderId,
      operationId: body.operationId,
      quantity: body.quantity,
      reworkQuantity: body.reworkQuantity ?? 0,
      shift: detectShift(),
    })
    .returning();

  return c.json(log, 201);
});

productionLogsRoutes.get("/my", authMiddleware, async (c) => {
  const { tenant_id, user_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await db
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
    .where(and(
      eq(productionLogs.tenantId, tenant_id),
      eq(productionLogs.userId, user_id),
      gte(productionLogs.loggedAt, today),
      lte(productionLogs.loggedAt, tomorrow)
    ))
    .orderBy(productionLogs.loggedAt);

  const total = logs.reduce((acc, log) => acc + log.quantity, 0);
  return c.json({ logs, total });
});
