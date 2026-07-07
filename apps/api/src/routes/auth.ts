import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createDb, users, revokedTokens } from "@ordireos/db";
import { signAccessToken, signRefreshToken, signTempToken, verifyToken, type RefreshTokenPayload, type TempTokenPayload } from "../lib/jwt";
import type { AppContext } from "../index";

export const authRoutes = new Hono<AppContext>();

const REFRESH_COOKIE = "ordireos_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "None" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  if (!body.email || typeof body.email !== "string") return c.json({ error: "Email invalido" }, 400);
  if (!body.password || typeof body.password !== "string") return c.json({ error: "Senha obrigatoria" }, 400);

  const normalizedEmail = body.email.toLowerCase().trim();

  // Rate limit: por IP + email combinados. 5 tentativas por 60s.
  // Combinar os dois evita que um IP bloqueie o login legitimo de outra
  // conta, e evita que um atacante distribua tentativas so trocando de IP.
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const rateLimitKey = `login:${ip}:${normalizedEmail}`;
  const { success } = await c.env.LOGIN_RATE_LIMITER.limit({ key: rateLimitKey });
  if (!success) {
    return c.json({ error: "Muitas tentativas de login. Aguarde um minuto e tente novamente." }, 429);
  }

  const db = createDb(c.env.DATABASE_URL);
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (!user || !user.active) return c.json({ error: "Credenciais invalidas" }, 401);

  const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
  if (!passwordValid) return c.json({ error: "Credenciais invalidas" }, 401);

  if (user.requiresPasswordChange) {
    const tempToken = await signTempToken(
      { user_id: user.id, tenant_id: user.tenantId, role: user.role, purpose: "password_change" },
      c.env.JWT_SECRET
    );
    return c.json({ requires_password_change: true, temp_token: tempToken });
  }

  const accessToken = await signAccessToken({ user_id: user.id, tenant_id: user.tenantId, role: user.role }, c.env.JWT_SECRET);
  const refreshToken = await signRefreshToken({ user_id: user.id, tenant_id: user.tenantId, jti: crypto.randomUUID() }, c.env.JWT_REFRESH_SECRET);

  setCookie(c, REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  return c.json({ access_token: accessToken, user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenantId } });
});

authRoutes.post("/change-password", async (c) => {
  const body = await c.req.json<{ temp_token?: string; new_password?: string; confirm_password?: string }>();

  if (!body.temp_token || typeof body.temp_token !== "string") return c.json({ error: "Token ausente" }, 400);
  if (!body.new_password || typeof body.new_password !== "string" || body.new_password.length < 6)
    return c.json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);
  if (body.new_password !== body.confirm_password) return c.json({ error: "Senhas nao conferem" }, 400);

  const payload = await verifyToken<TempTokenPayload>(body.temp_token, c.env.JWT_SECRET);
  if (!payload || payload.purpose !== "password_change") return c.json({ error: "Token invalido ou expirado" }, 401);

  const db = createDb(c.env.DATABASE_URL);
  const [user] = await db.select().from(users).where(eq(users.id, payload.user_id)).limit(1);
  if (!user || !user.active) return c.json({ error: "Usuario nao encontrado ou inativo" }, 401);

  const passwordHash = await bcrypt.hash(body.new_password, 10);
  await db
    .update(users)
    .set({ passwordHash, requiresPasswordChange: false })
    .where(eq(users.id, user.id));

  const accessToken = await signAccessToken({ user_id: user.id, tenant_id: user.tenantId, role: user.role }, c.env.JWT_SECRET);
  const refreshToken = await signRefreshToken({ user_id: user.id, tenant_id: user.tenantId, jti: crypto.randomUUID() }, c.env.JWT_REFRESH_SECRET);

  setCookie(c, REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  return c.json({ access_token: accessToken, user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenantId } });
});

authRoutes.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE);
  if (!refreshToken) return c.json({ error: "Refresh token ausente" }, 401);

  const payload = await verifyToken<RefreshTokenPayload>(refreshToken, c.env.JWT_REFRESH_SECRET);
  if (!payload) return c.json({ error: "Refresh token invalido ou expirado" }, 401);

  const db = createDb(c.env.DATABASE_URL);

  // Token revogado (logout anterior) nao pode ser usado para gerar novo access token
  const [revoked] = await db
    .select({ id: revokedTokens.id })
    .from(revokedTokens)
    .where(eq(revokedTokens.jti, payload.jti))
    .limit(1);
  if (revoked) return c.json({ error: "Sessao encerrada. Faca login novamente." }, 401);

  const [user] = await db.select().from(users).where(eq(users.id, payload.user_id)).limit(1);
  if (!user || !user.active) return c.json({ error: "Usuario nao encontrado ou inativo" }, 401);

  const accessToken = await signAccessToken({ user_id: user.id, tenant_id: user.tenantId, role: user.role }, c.env.JWT_SECRET);
  return c.json({ access_token: accessToken });
});

authRoutes.post("/logout", async (c) => {
  const refreshToken = getCookie(c, REFRESH_COOKIE);

  if (refreshToken) {
    const payload = await verifyToken<RefreshTokenPayload>(refreshToken, c.env.JWT_REFRESH_SECRET);
    if (payload) {
      // Revoga o refresh token: registra o jti ate a data de expiracao original (7 dias).
      // Best-effort — se a escrita falhar, o logout no cliente ainda deve funcionar.
      try {
        const db = createDb(c.env.DATABASE_URL);
        // Neon HTTP driver nao aceita Date objects como bind param —
        // usamos sql`${string}::timestamptz` (parametrizado, nao sql.raw).
        const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await db.insert(revokedTokens).values({
          jti: payload.jti,
          expiresAt: sql`${expiresAtIso}::timestamptz`,
        }).onConflictDoNothing();
      } catch (err) {
        console.error("[LOGOUT] Falha ao revogar refresh token:", err);
      }
    }
  }

  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
  return c.json({ success: true });
});
