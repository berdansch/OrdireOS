"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshAccessToken } from "@/lib/auth/refresh";
import { apiClient } from "@/lib/auth/api-client";

type User = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "supervisor" | "seamstress";
  active: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  supervisor: "Supervisor",
  seamstress: "Costureira",
};

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function UsersModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new">("list");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"supervisor" | "seamstress">("seamstress");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient<User[]>("/users");
      setUsers(result);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate() {
    setError("");
    setSubmitting(true);
    const password = generatePassword();
    try {
      await apiClient("/users", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      setCreatedPassword(password);
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar usuario");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: User) {
    try {
      await apiClient(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active }),
      });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
    } catch {
      // silencioso
    }
  }

  function handleCopy() {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleNewUser() {
    setView("new");
    setName("");
    setEmail("");
    setRole("seamstress");
    setError("");
    setCreatedPassword(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {view === "new" && (
              <button onClick={() => { setView("list"); setCreatedPassword(null); }}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none">←</button>
            )}
            <h2 className="text-base font-semibold text-gray-900">
              {view === "list" ? "Usuários" : "Novo usuário"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {view === "list" && (
            <>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className={`text-sm font-medium ${u.active ? "text-gray-900" : "text-gray-400"}`}>{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email} · {ROLE_LABELS[u.role]}</p>
                      </div>
                      {u.role !== "owner" && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            u.active
                              ? "border-red-200 text-red-500 hover:bg-red-50"
                              : "border-green-200 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {u.active ? "Desativar" : "Ativar"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === "new" && (
            <>
              {createdPassword ? (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-2xl p-4 text-center">
                    <p className="text-sm font-semibold text-green-800 mb-1">Usuário criado!</p>
                    <p className="text-xs text-green-700">Anote a senha temporária abaixo. Ela não será exibida novamente.</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-lg font-mono font-bold text-gray-900 tracking-widest">{createdPassword}</p>
                    <button onClick={handleCopy}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg">
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <button onClick={handleNewUser}
                    className="w-full h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-700">
                    Criar outro usuário
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ana Lima"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ana@empresa.com.br"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Função</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as "supervisor" | "seamstress")}
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <option value="seamstress">Costureira</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>
                  {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {view === "list" && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-100">
            <button onClick={handleNewUser}
              className="w-full h-11 bg-gray-900 text-white text-sm font-semibold rounded-xl">
              + Novo usuário
            </button>
          </div>
        )}
        {view === "new" && !createdPassword && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-100">
            <button
              onClick={handleCreate}
              disabled={submitting || !name.trim() || !email.trim()}
              className="w-full h-11 bg-gray-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!tokenStore.isAuthenticated()) {
        const token = await refreshAccessToken();
        if (!token) { router.replace("/login"); return; }
      }
      const user = tokenStore.getUser();
      if (user && user.role !== "owner" && user.role !== "supervisor") {
        router.replace("/login");
        return;
      }
      setUserName(user?.name ?? null);
      setReady(true);
    }
    init();
  }, [router]);

  const user = tokenStore.getUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">OrdireOS</p>
          <p className="text-sm font-semibold text-gray-900">{userName ?? "..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUsers(true)}
            className="text-xs text-gray-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Usuários
          </button>
          <a
            href="/ordens"
            className="text-xs text-gray-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Ordens
          </a>
          <a
            href="/configuracoes/operacoes"
            className="text-xs text-gray-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Operações
          </a>
          <a
            href="/owner/payroll"
            className="text-xs text-gray-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Folha
          </a>
          <button
            onClick={async () => {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
                method: "POST",
                credentials: "include",
              });
              tokenStore.clearAuth();
              router.replace("/login");
            }}
            className="text-xs text-gray-400 font-medium px-3 py-1.5 rounded-lg border border-gray-200"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="px-4 py-6">
        {ready ? children : (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          </div>
        )}
      </main>
      {showUsers && <UsersModal onClose={() => setShowUsers(false)} />}
    </div>
  );
}
