'use client';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const tempToken = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");

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

  if (!tempToken) {
    return (
      <main>
        <div>
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
            Link inválido. Faça login novamente.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Crie sua senha</h1>
          <p className="text-sm text-gray-500 mt-1">
            Você está acessando pela primeira vez. Defina uma senha pessoal para continuar.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="........"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          {loading ? "Salvando..." : "Definir senha"}
        </button>
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
