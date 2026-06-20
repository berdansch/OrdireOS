import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { createDb, tenants } from "@ordireos/db";
import type { AppContext } from "../index";

export const adminRoutes = new Hono<AppContext>();

// Guard: todas as rotas admin exigem ADMIN_SECRET no header
adminRoutes.use("*", async (c, next) => {
  const secret = c.req.header("x-admin-secret");
  if (!secret || secret !== c.env.ADMIN_SECRET) {
    return c.json({ error: "Nao autorizado" }, 401);
  }
  return next();
});

// GET /admin/tenants — lista todos os tenants
adminRoutes.get("/tenants", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const all = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      trialEndsAt: tenants.trialEndsAt,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .orderBy(sql`${tenants.createdAt} DESC`);

  return c.json(all);
});

// PATCH /admin/tenants/:id — atualiza plan do tenant
adminRoutes.patch("/tenants/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ plan?: string; trialEndsAt?: string }>();

  if (!body.plan || !["trial", "active", "expired"].includes(body.plan)) {
    return c.json({ error: "plan deve ser trial, active ou expired" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!tenant) return c.json({ error: "Tenant nao encontrado" }, 404);

  type UpdatePayload = { plan: string; trialEndsAt?: ReturnType<typeof sql.raw> };
  const updateData: UpdatePayload = { plan: body.plan };

  if (body.trialEndsAt) {
    const parsed = new Date(body.trialEndsAt);
    if (isNaN(parsed.getTime())) return c.json({ error: "trialEndsAt invalido" }, 400);
    updateData.trialEndsAt = sql.raw(`'${parsed.toISOString()}'::timestamptz`);
  }

  const [updated] = await db
    .update(tenants)
    .set(updateData)
    .where(eq(tenants.id, id))
    .returning();

  return c.json(updated);
});
