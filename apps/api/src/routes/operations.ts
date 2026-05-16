import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb, operations } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { AppContext } from "../index";

export const operationsRoutes = new Hono<AppContext>();

operationsRoutes.get("/", authMiddleware, async (c) => {
  const { tenant_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const result = await db
    .select()
    .from(operations)
    .where(and(
      eq(operations.tenantId, tenant_id),
      eq(operations.active, true)
    ))
    .orderBy(operations.name);

  return c.json(result);
});

operationsRoutes.post("/", authMiddleware, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const body = await c.req.json<{
    name: string;
    standardTimeSeconds?: number;
    pricePerPiece?: string;
  }>();

  if (!body.name || body.name.trim() === "") {
    return c.json({ error: "Nome da operacao e obrigatorio" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);

  const [operation] = await db
    .insert(operations)
    .values({
      tenantId: tenant_id,
      name: body.name.trim(),
      standardTimeSeconds: body.standardTimeSeconds ?? null,
      pricePerPiece: body.pricePerPiece ?? null,
    })
    .returning();

  return c.json(operation, 201);
});

operationsRoutes.patch("/:id", authMiddleware, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json<{ active?: boolean; name?: string; pricePerPiece?: string }>();

  const db = createDb(c.env.DATABASE_URL);

  const [updated] = await db
    .update(operations)
    .set({ ...body })
    .where(and(
      eq(operations.id, id),
      eq(operations.tenantId, tenant_id)
    ))
    .returning();

  if (!updated) {
    return c.json({ error: "Operacao nao encontrada" }, 404);
  }

  return c.json(updated);
});
