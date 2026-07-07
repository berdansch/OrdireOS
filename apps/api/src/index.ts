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
import { payrollRoutes } from "./routes/payroll";
import { adminRoutes } from "./routes/admin";

// Tipo minimo do binding nativo de Rate Limiting do Cloudflare Workers (GA).
// Nao depende de @cloudflare/workers-types estar atualizado.
type RateLimitOutcome = { success: boolean };
export type RateLimit = { limit: (options: { key: string }) => Promise<RateLimitOutcome> };

export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENVIRONMENT: string;
  ADMIN_SECRET: string;
  LOGIN_RATE_LIMITER: RateLimit;
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

// Allowlist estrita de origens — nunca reflete Origin arbitrario e nunca
// cai em "*" quando ha credentials:true (isso e proibido pelo spec e
// alguns proxies/testers de seguranca tratam a ambiguidade como falha).
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://ordire-os-api.vercel.app",
];

app.use("*", cors({
  origin: (origin) => {
    if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
    return null; // nunca "*": requisicoes sem Origin ou fora da allowlist sao bloqueadas
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Headers de seguranca aplicados a toda resposta.
// Mitiga clickjacking, MIME sniffing e vazamento de referrer.
app.use("*", async (c, next) => {
  await next();
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
});

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
app.route("/payroll", payrollRoutes);
app.route("/admin", adminRoutes);

app.notFound((c) => c.json({ error: "Rota nao encontrada" }, 404));

app.onError((err, c) => {
  console.error("[ERROR]", err.message, err.stack);
  return c.json({ error: "Erro interno do servidor" }, 500);
});

export default app;
