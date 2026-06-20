import { eq } from "drizzle-orm";
import { createDb, tenants } from "@ordireos/db";
import type { MiddlewareHandler } from "hono";
import type { AppContext } from "../index";

// Middleware que verifica se o tenant tem plano ativo ou trial vigente
// Aplicar em todas as rotas operacionais após authMiddleware
export const requireActivePlan: MiddlewareHandler<AppContext> = async (c, next) => {
  const { tenant_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);

  const [tenant] = await db
    .select({ plan: tenants.plan, trialEndsAt: tenants.trialEndsAt })
    .from(tenants)
    .where(eq(tenants.id, tenant_id))
    .limit(1);

  if (!tenant) return c.json({ error: "Tenant nao encontrado" }, 404);

  if (tenant.plan === "active") return next();

  if (tenant.plan === "trial" && tenant.trialEndsAt) {
    const now = new Date();
    const endsAt = new Date(tenant.trialEndsAt);
    if (now <= endsAt) return next();
  }

  return c.json({ error: "trial_expired" }, 403);
};
