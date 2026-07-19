"use client";

import { useState, useEffect, useCallback } from "react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: "trial" | "active" | "expired";
  trialEndsAt: string | null;
  createdAt: string;
};

const SECRET_KEY = "ordireos_admin_secret";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const PLAN_LABEL: Record<Tenant["plan"], string> = {
  trial: "Trial",
  active: "Ativo",
  expired: "Expirado",
};

const PLAN_COLOR: Record<Tenant["plan"], string> = {
  trial: "bg-novelo/10 text-novelo",
  active: "bg-linha-verde/10 text-linha-verde",
  expired: "bg-retalho/10 text-retalho",
};

// ─── Modal: Editar tenant ────────────────────────────────────────────────────

function EditTenantModal({
  tenant,
  secret,
  onClose,
  onSaved,
}: {
  tenant: Tenant;
  secret: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState<Tenant["plan"]>(tenant.plan);
  const [trialEndsAt, setTrialEndsAt] = useState(tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          plan,
          trialEndsAt: trialEndsAt ? new Date(`${trialEndsAt}T00:00:00`).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-carvao/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-carvao">{tenant.name}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-11 min-w-11 flex items-center justify-center text-carvao/40 text-xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-anil rounded-lg"
          >
            ×
          </button>
        </div>

        <div>
          <label htmlFor="plan-select" className="block text-xs font-medium text-carvao/50 mb-1.5">Plano</label>
          <select
            id="plan-select"
            value={plan}
            onChange={(e) => setPlan(e.target.value as Tenant["plan"])}
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-anil"
          >
            <option value="trial">Trial</option>
            <option value="active">Ativo</option>
            <option value="expired">Expirado</option>
          </select>
        </div>

        <div>
          <label htmlFor="trial-date" className="block text-xs font-medium text-carvao/50 mb-1.5">
            Trial termina em <span className="font-normal text-carvao/40">(opcional)</span>
          </label>
          <input
            id="trial-date"
            type="date"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao focus:outline-none focus-visible:ring-2 focus-visible:ring-anil"
          />
        </div>

        {error && (
          <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-11 bg-anil text-white text-sm font-semibold rounded-xl disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil-escuro focus-visible:ring-offset-2"
        >
          {submitting ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}

// ─── Prompt de acesso ────────────────────────────────────────────────────────

function AdminGate({ onUnlock }: { onUnlock: (secret: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit() {
    if (!input) return;
    setError("");
    setChecking(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants`, {
        headers: { "x-admin-secret": input },
      });
      if (!res.ok) {
        setError("Chave incorreta.");
        return;
      }
      sessionStorage.setItem(SECRET_KEY, input);
      onUnlock(input);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cru px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-carvao">
            Ordire<span className="text-anil">OS</span>
          </p>
          <h1 className="text-sm text-carvao/60 mt-1">Painel administrativo</h1>
        </div>

        <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="admin-secret" className="block text-sm font-medium text-carvao mb-1">
              Chave de acesso
            </label>
            <input
              id="admin-secret"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full h-12 px-4 border border-carvao/15 rounded-xl text-carvao focus:outline-none focus-visible:ring-2 focus-visible:ring-anil"
            />
          </div>

          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={checking || !input}
            className="w-full h-12 bg-anil text-white font-medium rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-anil-escuro focus-visible:ring-offset-2"
          >
            {checking ? "Verificando…" : "Entrar"}
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    setSecret(sessionStorage.getItem(SECRET_KEY));
    setCheckedStorage(true);
  }, []);

  const loadTenants = useCallback(async (activeSecret: string) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/tenants`, {
        headers: { "x-admin-secret": activeSecret },
      });
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(SECRET_KEY);
          setSecret(null);
          return;
        }
        throw new Error("Erro ao carregar tenants.");
      }
      const data = await res.json() as Tenant[];
      setTenants(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (secret) loadTenants(secret);
  }, [secret, loadTenants]);

  function handleLogout() {
    sessionStorage.removeItem(SECRET_KEY);
    setSecret(null);
    setTenants([]);
  }

  if (!checkedStorage) return null;

  if (!secret) {
    return <AdminGate onUnlock={setSecret} />;
  }

  return (
    <div className="min-h-screen bg-cru">
      <header className="bg-white border-b border-carvao/10 px-4 py-3 flex items-center justify-between pt-safe">
        <p className="font-display text-sm font-bold text-carvao">
          Ordire<span className="text-anil">OS</span> <span className="text-carvao/40 font-sans font-normal">· admin</span>
        </p>
        <button
          onClick={handleLogout}
          className="min-h-11 px-3 text-xs text-carvao/50 font-medium rounded-lg border border-carvao/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil touch-manipulation"
        >
          Sair
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-12">
        <div>
          <h1 className="text-xl font-bold font-display text-carvao">Tenants</h1>
          <p className="text-sm text-carvao/50 mt-0.5">{tenants.length} facções cadastradas</p>
        </div>

        {loadError && (
          <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg text-center">
            {loadError}
          </p>
        )}

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-carvao/10 p-5 h-20" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-8 text-center">
            <p className="text-2xl mb-2">🏭</p>
            <p className="text-sm font-medium text-carvao/80">Nenhum tenant cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => setEditingTenant(t)}
                className="w-full bg-white rounded-2xl border border-carvao/10 shadow-sm p-5 flex items-center justify-between hover:border-carvao/25 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-anil"
              >
                <div>
                  <p className="text-sm font-semibold text-carvao">{t.name}</p>
                  <p className="text-xs text-carvao/40 mt-0.5">{t.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLOR[t.plan]}`}>
                      {PLAN_LABEL[t.plan]}
                    </span>
                    {t.plan === "trial" && (
                      <span className="text-xs text-carvao/40">até {formatDateTime(t.trialEndsAt)}</span>
                    )}
                  </div>
                </div>
                <span className="text-carvao/25 text-lg">›</span>
              </button>
            ))}
          </div>
        )}
      </main>

      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          secret={secret}
          onClose={() => setEditingTenant(null)}
          onSaved={() => loadTenants(secret)}
        />
      )}
    </div>
  );
}
