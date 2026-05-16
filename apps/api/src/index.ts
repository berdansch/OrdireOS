import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { operationsRoutes } from "./routes/operations";

export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENVIRONMENT: string;
};

export type AppContext = {
  Bindings: Env;
  Variables: {
    auth: {
      user_id: string;
      tenant_id: string;
      role: "owner" | "supervisor" | "seamstress";
    };
  };
};

const app = new Hono<AppContext>();

app.use("*", logger());

app.use("*", cors({
  origin: ["http://localhost:3000"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/health", (c) => {
  return c.json({ status: "ok", env: c.env.ENVIRONMENT });
});

app.route("/auth", authRoutes);
app.route("/operations", operationsRoutes);

app.notFound((c) => c.json({ error: "Rota nao encontrada" }, 404));

app.onError((err, c) => {
  console.error("Erro:", err);
  return c.json({ error: "Erro interno do servidor" }, 500);
});

export default app;
