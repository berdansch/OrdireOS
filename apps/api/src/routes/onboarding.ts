import { Hono } from "hono";
import bcrypt from "bcryptjs";
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

  if (!body.tenantName || typeof body.tenantName !== "string" || body.tenantName.trim() === "") return c.json({ error: "Nome da faccao e obrigatorio" }, 400);
  if (!body.tenantSlug || typeof body.tenantSlug !== "string" || !SLUG_REGEX.test(body.tenantSlug)) return c.json({ error: "Slug invalido. Use apenas letras minusculas, numeros e hifens (ex: conf-silva)" }, 400);
  if (!body.ownerName || typeof body.ownerName !== "string" || body.ownerName.trim() === "") return c.json({ error: "Nome do responsavel e obrigatorio" }, 400);
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) return c.json({ error: "Email invalido" }, 400);
  if (!body.password || typeof body.password !== "string" || body.password.length < 6) return c.json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);

  const db = createDb(c.env.DATABASE_URL);

  const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase().trim())).limit(1);
  if (existingEmail) return c.json({ error: "Este email ja esta em uso" }, 409);

  try {
    await db.transaction(async (tx) => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({ name: body.tenantName!.trim(), slug: body.tenantSlug! })
        .returning();

      const passwordHash = await bcrypt.hash(body.password!, 10);
      await tx.insert(users).values({
        tenantId: newTenant.id,
        name: body.ownerName!.trim(),
        email: body.email!.toLowerCase().trim(),
        passwordHash,
        role: "owner",
      });
    });

    return c.json({ message: "Faccao registrada com sucesso!" }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Slug ja esta em uso. Escolha outro." }, 409);
  }
});
