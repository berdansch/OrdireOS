import { createMiddleware } from "hono/factory";
import { verifyToken, type AccessTokenPayload } from "../lib/jwt";
import type { AppContext } from "../index";

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return c.json({ error: "Token de autenticacao ausente" }, 401);
  }

  const token = authorization.slice(7);
  const payload = await verifyToken<AccessTokenPayload>(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: "Token invalido ou expirado" }, 401);
  }

  c.set("auth", {
    user_id: payload.user_id,
    tenant_id: payload.tenant_id,
    role: payload.role,
  });

  await next();
});
