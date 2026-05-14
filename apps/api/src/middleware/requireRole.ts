import { createMiddleware } from "hono/factory";
import type { AppContext } from "../index";

type Role = "owner" | "supervisor" | "seamstress";

export function requireRole(roles: Role[]) {
  return createMiddleware<AppContext>(async (c, next) => {
    const auth = c.get("auth");

    if (!auth) {
      return c.json({ error: "Nao autenticado" }, 401);
    }

    if (!roles.includes(auth.role)) {
      return c.json({ error: "Voce nao tem permissao para acessar este recurso" }, 403);
    }

    await next();
  });
}
