"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/auth/api-client";

type User = {
  id: string;
  name: string;
  email: string;
  role: "supervisor" | "seamstress";
  active: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  supervisor: "Supervisor",
  seamstress: "Costureira",
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"supervisor" | "seamstress">("seamstress");

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await apiClient<User[]>("/users");
      setUsers(data);
    } catch {
      setError("Erro ao carregar usuarios.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient("/users", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("seamstress");
      setSuccess("Usuario cadastrado com sucesso!");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await apiClient(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !current }),
      });
      await loadUsers();
    } catch {
      setError("Erro ao atualizar usuario.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastre supervisores e costureiras da sua fabrica.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Novo usuario</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Ex: Ana Silva" className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="ana@fabrica.com.br" className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Minimo 6 caracteres" className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funcao *</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "supervisor" | "seamstress")} className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="seamstress">Costureira</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
          {error && <div className="bg-red-50 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          {success && <div className="bg-green-50 rounded-xl px-4 py-3"><p className="text-sm text-green-700">{success}</p></div>}
          <button onClick={handleCreate} disabled={saving} className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2">
            {saving ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Cadastrando...</>
            ) : "Cadastrar usuario"}
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Usuarios cadastrados ({users.filter(u => u.active).length} ativos)
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum usuario cadastrado ainda.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between ${user.active ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email} · {ROLE_LABELS[user.role]}{!user.active && " · Inativo"}</p>
                </div>
                <button
                  onClick={() => handleToggleActive(user.id, user.active)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border active:scale-95 transition-transform ${user.active ? "text-red-500 border-red-100" : "text-green-600 border-green-100"}`}
                >
                  {user.active ? "Desativar" : "Reativar"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
