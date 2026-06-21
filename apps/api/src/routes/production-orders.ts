import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { createDb, productionOrders } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { AppContext } from "../index";
import { requireActivePlan } from "../middleware/requireActivePlan";

export const productionOrdersRoutes = new Hono<AppContext>();

productionOrdersRoutes.get("/", authMiddleware, requireActivePlan, requireRole(["owner", "supervisor", "seamstress"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.tenantId, tenant_id))
    .orderBy(desc(productionOrders.createdAt));
  return c.json(result);
});

productionOrdersRoutes.post("/", authMiddleware, requireActivePlan, requireRole(["owner", "supervisor"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const body = await c.req.json<{ reference?: string; totalPieces?: number }>();

  if (!body.reference || typeof body.reference !== "string" || body.reference.trim() === "") {
    return c.json({ error: "A referencia da OP e obrigatoria" }, 400);
  }
  if (!body.totalPieces || typeof body.totalPieces !== "number" || body.totalPieces <= 0) {
    return c.json({ error: "A quantidade total deve ser um numero maior que zero" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);
  const [order] = await db
    .insert(productionOrders)
    .values({
      tenantId: tenant_id,
      reference: body.reference.trim(),
      totalPieces: body.totalPieces,
      status: "open",
    })
    .returning();

  return c.json(order, 201);
});
