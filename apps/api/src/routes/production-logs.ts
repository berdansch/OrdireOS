import { Hono } from "hono";
import { createDb, productionLogs } from "@ordireos/db";
import type { AppContext } from "../index";
import { authMiddleware } from "../middleware/auth";

export const productionLogsRoutes = new Hono<AppContext>();

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
