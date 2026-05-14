import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createDb, users } from "@ordireos/db";
import { signAccessToken, signRefreshToken, verifyToken, type RefreshTokenPayload } from "../lib/jwt";
import type { AppContext } from "../index";

export const authRoutes = new Hono<AppContext>();

const REFRESH_COOKIE = "ordireos_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: "Email e senha sao obrigatorios" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.active) {
    return c.json({ error: "Credenciais invalidas" }, 401);
  }

  const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
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
    user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenantId },
  });
});

authRoutes.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE);

  if (!refreshToken) {
    return c.json({ error: "Refresh token ausente" }, 401);
  }

  const payload = await verifyToken<RefreshTokenPayload>(refreshToken, c.env.JWT_REFRESH_SECRET);

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

authRoutes.post("/logout", async (c) => {
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
  return c.json({ success: true });
});
