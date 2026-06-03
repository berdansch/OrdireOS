// apps/api/src/routes/auth.ts
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createDb, users } from "@ordireos/db";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  type RefreshTokenPayload,
} from "../lib/jwt";
import type { AppContext } from "../index";

export const authRoutes = new Hono<AppContext>();

const REFRESH_COOKIE = "ordireos_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "None" as const, // None necessario para cross-origin (Vercel <-> Workers)
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

// Schema de validacao do login
const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(1, "Senha obrigatoria"),
});

// POST /auth/login
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const db = createDb(c.env.DATABASE_URL);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.active) {
    return c.json({ error: "Credenciais invalidas" }, 401);
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return c.json({ error: "Credenciais invalidas" }, 401);
  }

  const accessToken = await signAccessToken(
    { user_id: user.id, tenant_id: user.tenantId, role: user.role },
    c.env.JWT_SECRET
  );

  const refreshToken = await signRefreshToken(
    { user_id: user.id, tenant_id: user.tenantId, jti: crypto.randomUUID() },
    c.env.JWT_REFRESH_SECRET
  );

  setCookie(c, REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

  return c.json({
    access_token: accessToken,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      tenant_id: user.tenantId,
    },
  });
});

// POST /auth/refresh
authRoutes.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE);

  if (!refreshToken) {
    return c.json({ error: "Refresh token ausente" }, 401);
  }

  const payload = await verifyToken<RefreshTokenPayload>(
    refreshToken,
    c.env.JWT_REFRESH_SECRET
  );

  if (!payload) {
    return c.json({ error: "Refresh token invalido ou expirado" }, 401);
  }

  const db = createDb(c.env.DATABASE_URL);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.user_id))
    .limit(1);

  if (!user || !user.active) {
    return c.json({ error: "Usuario nao encontrado ou inativo" }, 401);
  }

  const accessToken = await signAccessToken(
    { user_id: user.id, tenant_id: user.tenantId, role: user.role },
    c.env.JWT_SECRET
  );

  return c.json({ access_token: accessToken });
});

// POST /auth/logout
authRoutes.post("/logout", async (c) => {
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
  return c.json({ success: true });
});
