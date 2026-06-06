import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";
import { operationsRoutes } from "./routes/operations";
import { productionOrdersRoutes } from "./routes/production-orders";
import { productionLogsRoutes } from "./routes/production-logs";
import { dashboardRoutes } from "./routes/dashboard";
import { onboardingRoutes } from "./routes/onboarding";

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
  origin: (origin) => {
    const allowed = [
      "http://localhost:3000",
      "https://ordire-os-api.vercel.app",
    ];
    if (!origin || allowed.includes(origin)) return origin ?? "*";
    return null;
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/health", (c) => {
  return c.json({ status: "ok", env: c.env.ENVIRONMENT });
});

app.route("/auth", authRoutes);
app.route("/users", usersRoutes);
app.route("/operations", operationsRoutes);
app.route("/production-orders", productionOrdersRoutes);
app.route("/production-logs", productionLogsRoutes);
app.route("/dashboard", dashboardRoutes);
app.route("/onboarding", onboardingRoutes);

app.notFound((c) => c.json({ error: "Rota nao encontrada" }, 404));

app.onError((err, c) => {
  console.error("[ERROR]", err.message, err.stack);
  return c.json({ error: "Erro interno do servidor" }, 500);
});

export default app;
