import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { createDb, tenants, users } from "@ordireos/db";
import { eq } from "drizzle-orm";
import type { AppContext } from "../index";

export const onboardingRoutes = new Hono<AppContext>();

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

onboardingRoutes.post("/register", async (c) => {
  const body = await c.req.json<{
    tenantName?: string;
    tenantSlug?: string;
    ownerName?: string;
    email?: string;
    password?: string;
  }>();

  if (!body.tenantName || typeof body.tenantName !== "string" || body.tenantName.trim() === "")
    return c.json({ error: "Nome da faccao e obrigatorio" }, 400);
  if (!body.tenantSlug || typeof body.tenantSlug !== "string" || !SLUG_REGEX.test(body.tenantSlug))
    return c.json({ error: "Slug invalido. Use apenas letras minusculas, numeros e hifens (ex: conf-silva)" }, 400);
  if (!body.ownerName || typeof body.ownerName !== "string" || body.ownerName.trim() === "")
    return c.json({ error: "Nome do responsavel e obrigatorio" }, 400);
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@"))
    return c.json({ error: "Email invalido" }, 400);
  if (!body.password || typeof body.password !== "string" || body.password.length < 6)
    return c.json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  // Checar email duplicado
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email.toLowerCase().trim()))
    .limit(1);
  if (existingEmail) return c.json({ error: "Este email ja esta em uso" }, 409);

  // Checar slug duplicado
  const [existingSlug] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, body.tenantSlug))
    .limit(1);
  if (existingSlug) return c.json({ error: "Este identificador ja esta em uso. Escolha outro." }, 409);

  // Criar tenant com trial de 14 dias.
  // Fix: o codigo anterior tinha um bug de sintaxe (crases escapadas
  // literalmente) que quebrava o build — este endpoint nunca chegou a
  // rodar de fato. Alem disso, trocamos sql.raw por bind parametrizado
  // (mesma string ISO, sem interpolacao manual).
  const trialEndsAtIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const [newTenant] = await db
    .insert(tenants)
    .values({
      name: body.tenantName.trim(),
      slug: body.tenantSlug,
      plan: "trial",
      trialEndsAt: sql`${trialEndsAtIso}::timestamptz`,
    })
    .returning({ id: tenants.id });

  if (!newTenant) return c.json({ error: "Erro ao criar faccao. Tente novamente." }, 500);

  // Criar owner — se falhar, remove o tenant (rollback manual)
  try {
    const passwordHash = await bcrypt.hash(body.password, 10);
    await db.insert(users).values({
      tenantId: newTenant.id,
      name: body.ownerName.trim(),
      email: body.email.toLowerCase().trim(),
      passwordHash,
      role: "owner",
    });
  } catch (err) {
    // Rollback manual: remove o tenant criado
    await db.delete(tenants).where(eq(tenants.id, newTenant.id));
    console.error("Erro ao criar usuario, tenant removido:", err);
    return c.json({ error: "Erro ao criar conta. Tente novamente." }, 500);
  }

  return c.json({ message: "Faccao registrada com sucesso!" }, 201);
});
