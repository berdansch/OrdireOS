import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { createDb, tenants } from "@ordireos/db";
import type { AppContext } from "../index";

export const adminRoutes = new Hono<AppContext>();

// Comparacao em tempo constante — evita timing attack para descobrir o
// ADMIN_SECRET byte a byte medindo a latencia de respostas 401.
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

adminRoutes.use("*", async (c, next) => {
  const secret = c.req.header("x-admin-secret");
  if (!secret || !timingSafeEqual(secret, c.env.ADMIN_SECRET)) {
    return c.json({ error: "Nao autorizado" }, 401);
  }
  return next();
});

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

  // Neon HTTP driver nao aceita objetos Date como bind param — usamos a
  // string ISO como valor parametrizado (nao sql.raw) dentro do template.
  if (body.trialEndsAt) {
    const parsed = new Date(body.trialEndsAt);
    if (isNaN(parsed.getTime())) return c.json({ error: "trialEndsAt invalido" }, 400);
    const parsedIso = parsed.toISOString();

    const [updated] = await db
      .update(tenants)
      .set({ plan: body.plan, trialEndsAt: sql`${parsedIso}::timestamptz` })
      .where(eq(tenants.id, id))
      .returning();

    return c.json(updated);
  }

  const [updated] = await db
    .update(tenants)
    .set({ plan: body.plan })
    .where(eq(tenants.id, id))
    .returning();

  return c.json(updated);
});
