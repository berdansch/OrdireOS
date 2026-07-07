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
        // Fix de segurança: o temp_token NÃO vai mais na URL (evita
        // vazamento via histórico do navegador, logs de proxy/CDN e
        // header Referer). Guardamos em sessionStorage, que morre com a
        // aba e não é registrado em nenhum log de infraestrutura.
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
    <main>
      <div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="........"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-xs text-center text-gray-400 mt-2">
          Não tem conta?{" "}
          <a href="/onboarding" className="text-gray-900 font-medium underline">
            Cadastrar facção
          </a>
        </p>
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
