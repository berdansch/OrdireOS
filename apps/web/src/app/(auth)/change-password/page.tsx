'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";

type ChangePasswordResponse = {
  access_token: string;
  user: {
    id: string;
    name: string;
    role: "owner" | "supervisor" | "seamstress";
    tenant_id: string;
  };
};

function ChangePasswordForm() {
  const router = useRouter();

  const [tempToken, setTempToken] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("ordireos_temp_token");
    setTempToken(stored);
    setCheckedStorage(true);
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");

    if (!tempToken) {
      setError("Sessão expirada. Faça login novamente.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Senhas não conferem");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          temp_token: tempToken,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error ?? "Erro ao trocar senha");
        return;
      }

      const data = await res.json() as ChangePasswordResponse;
      sessionStorage.removeItem("ordireos_temp_token");
      tokenStore.setAuth(data.access_token, data.user);

      const roleRedirect: Record<string, string> = {
        seamstress: "/costureira",
        supervisor: "/supervisor",
        owner: "/owner",
      };

      router.replace(roleRedirect[data.user.role] ?? "/");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (checkedStorage && !tempToken) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cru px-5 pt-safe pb-safe">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-carvao/10 shadow-sm p-6">
          <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">
            Link inválido ou sessão expirada. Faça login novamente.
          </p>
          <a href="/login" className="block text-center text-sm text-anil font-medium underline underline-offset-2 mt-4">
            Voltar ao login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cru px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-carvao">
            Ordire<span className="text-anil">OS</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-carvao">Crie sua senha</h1>
            <p className="text-sm text-carvao/60 mt-1">
              Você está acessando pela primeira vez. Defina uma senha pessoal para continuar.
            </p>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-carvao mb-1">
              Nova senha
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className="w-full h-12 px-4 border border-carvao/15 rounded-xl text-carvao placeholder-carvao/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil focus-visible:border-anil transition-colors"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-carvao mb-1">
              Confirmar senha
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full h-12 px-4 border border-carvao/15 rounded-xl text-carvao placeholder-carvao/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil focus-visible:border-anil transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full h-12 bg-anil text-white font-medium rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anil-escuro focus-visible:ring-offset-2"
          >
            {loading ? "Salvando…" : "Definir senha"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordForm />
    </Suspense>
  );
}
