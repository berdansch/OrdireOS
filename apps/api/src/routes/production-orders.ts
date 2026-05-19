import { Hono } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { createDb, productionOrders } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { AppContext } from "../index";

export const productionOrdersRoutes = new Hono<AppContext>();

productionOrdersRoutes.get("/", authMiddleware, async (c) => {
  const { tenant_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const result = await db
    .select()
    .from(productionOrders)
    .where(and(
      eq(productionOrders.tenantId, tenant_id),
      ne(productionOrders.status, "closed")
    ))
    .orderBy(productionOrders.createdAt);

  const sorted = result.sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return 0;
  });

  return c.json(sorted);
});

productionOrdersRoutes.post("/", authMiddleware, requireRole(["owner", "supervisor"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const body = await c.req.json<{
    reference: string;
    clientName?: string;
    productDescription?: string;
    totalPieces: number;
  }>();

  if (!body.reference || !body.totalPieces) {
    return c.json({ error: "Referencia e total de pecas sao obrigatorios" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);

  const [order] = await db
    .insert(productionOrders)
    .values({
      tenantId: tenant_id,
      reference: body.reference.trim(),
      clientName: body.clientName ?? null,
      productDescription: body.productDescription ?? null,
      totalPieces: body.totalPieces,
      status: "open",
    })
    .returning();

  return c.json(order, 201);
});

productionOrdersRoutes.patch("/:id/status", authMiddleware, requireRole(["owner", "supervisor"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json<{ status: "open" | "in_progress" | "closed" }>();

  const db = createDb(c.env.DATABASE_URL);

  const [updated] = await db
    .update(productionOrders)
    .set({
      status: body.status,
      closedAt: body.status === "closed" ? new Date() : null,
    })
    .where(and(
      eq(productionOrders.id, id),
      eq(productionOrders.tenantId, tenant_id)
    ))
    .returning();

  if (!updated) {
    return c.json({ error: "Ordem nao encontrada" }, 404);
  }

  return c.json(updated);
});
