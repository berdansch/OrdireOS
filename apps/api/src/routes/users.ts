import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createDb, users } from "@ordireos/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { AppContext } from "../index";
import { requireActivePlan } from "../middleware/requireActivePlan";

export const usersRoutes = new Hono<AppContext>();

usersRoutes.get("/", authMiddleware, requireActivePlan, requireRole(["owner", "supervisor"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const db = createDb(c.env.DATABASE_URL);
  const result = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.tenantId, tenant_id))
    .orderBy(users.name);
  return c.json(result);
});

usersRoutes.post("/", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const body = await c.req.json<{ name?: string; email?: string; password?: string; role?: string }>();

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") return c.json({ error: "Nome e obrigatorio" }, 400);
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) return c.json({ error: "Email invalido" }, 400);
  if (!body.password || typeof body.password !== "string" || body.password.length < 6) return c.json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);
  if (!body.role || !["supervisor", "seamstress"].includes(body.role)) return c.json({ error: "Funcao deve ser supervisor ou seamstress" }, 400);

  const db = createDb(c.env.DATABASE_URL);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase().trim())).limit(1);
  if (existing) return c.json({ error: "Este email ja esta em uso" }, 409);

  const passwordHash = await bcrypt.hash(body.password, 10);
  const [user] = await db.insert(users).values({
    tenantId: tenant_id,
    name: body.name.trim(),
    email: body.email.toLowerCase().trim(),
    passwordHash,
    role: body.role as "supervisor" | "seamstress",
    requiresPasswordChange: true,
  }).returning({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, createdAt: users.createdAt });

  return c.json(user, 201);
});

usersRoutes.patch("/:id", authMiddleware, requireActivePlan, requireRole(["owner"]), async (c) => {
  const { tenant_id } = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json<{ active?: boolean }>();

  if (typeof body.active !== "boolean") return c.json({ error: "Campo active deve ser boolean" }, 400);

  const db = createDb(c.env.DATABASE_URL);
  const [updated] = await db
    .update(users)
    .set({ active: body.active })
    .where(and(eq(users.id, id), eq(users.tenantId, tenant_id)))
    .returning({ id: users.id, name: users.name, active: users.active });

  if (!updated) return c.json({ error: "Usuario nao encontrado" }, 404);
  return c.json(updated);
});
