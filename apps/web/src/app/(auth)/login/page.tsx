'use client';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";

type LoginResponse = {
  access_token: string;
  user: {
    id: string;
    name: string;
    role: "owner" | "supervisor" | "seamstress";
    tenant_id: string;
  };
};

type PasswordChangeRequired = {
  requires_password_change: true;
  temp_token: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error ?? "Erro ao entrar");
        return;
      }

      const data = await res.json() as LoginResponse | PasswordChangeRequired;

      if ("requires_password_change" in data && data.requires_password_change) {
        sessionStorage.setItem("ordireos_temp_token", data.temp_token);
        router.replace("/change-password");
        return;
      }

      const loginData = data as LoginResponse;
      tokenStore.setAuth(loginData.access_token, loginData.user);

      const roleRedirect: Record<string, string> = {
        seamstress: "/costureira",
        supervisor: "/supervisor",
        owner: "/owner",
      };

      router.replace(roleRedirect[loginData.user.role] ?? redirect);
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cru px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-carvao">
            Ordire<span className="text-anil">OS</span>
          </p>
          <h1 className="text-sm text-carvao/60 mt-1">Entre com sua conta</h1>
        </div>

        <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-carvao mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className="w-full h-12 px-4 border border-carvao/15 rounded-xl text-carvao placeholder-carvao/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil focus-visible:border-anil transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-carvao mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-12 px-4 border border-carvao/15 rounded-xl text-carvao placeholder-carvao/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil focus-visible:border-anil transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full h-12 bg-anil text-white font-medium rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anil-escuro focus-visible:ring-offset-2"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-xs text-center text-carvao/50 pt-1">
            Não tem conta?{" "}
            <a href="/onboarding" className="text-anil font-medium underline underline-offset-2">
              Cadastrar facção
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
