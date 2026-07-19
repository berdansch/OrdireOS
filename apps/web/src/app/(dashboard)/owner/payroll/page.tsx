"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/auth/api-client";
import { tokenStore } from "@/lib/auth/token-store";

type PayrollPeriod = {
  id: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
};

type SeamstressPayroll = {
  userId: string;
  userName: string;
  pieces: number;
  grossEarnings: number;
  advances: number;
  netEarnings: number;
};

type Advance = {
  id: string;
  userId: string;
  userName: string;
  amount: string;
  note: string | null;
  createdAt: string;
};

type PeriodDetail = {
  period: PayrollPeriod;
  seamstresses: SeamstressPayroll[];
  advances: Advance[];
  totals: {
    grossEarnings: number;
    advances: number;
    netEarnings: number;
  };
};

type UserOption = {
  id: string;
  name: string;
  role: string;
  active: boolean;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// ─── Modal: Novo Período ─────────────────────────────────────────────────────

function NewPeriodModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!startDate || !endDate) { setError("Preencha as duas datas."); return; }
    if (startDate >= endDate) { setError("A data de início deve ser anterior à data de fim."); return; }
    setSubmitting(true);
    try {
      await apiClient("/payroll/periods", {
        method: "POST",
        body: JSON.stringify({ startDate, endDate }),
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar período.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-carvao">Novo período de folha</h2>
          <button onClick={onClose} className="text-carvao/40 text-xl leading-none">×</button>
        </div>
        <div>
          <label className="block text-xs font-medium text-carvao/50 mb-1.5">Data de início</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao focus:outline-none focus-visible:ring-2 focus-visible:ring-anil" />
        </div>
        <div>
          <label className="block text-xs font-medium text-carvao/50 mb-1.5">Data de fim</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao focus:outline-none focus-visible:ring-2 focus-visible:ring-anil" />
        </div>
        {error && <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">{error}</p>}
        <button onClick={handleSubmit} disabled={submitting || !startDate || !endDate}
          className="w-full h-11 bg-anil text-white text-sm font-semibold rounded-xl disabled:opacity-50">
          {submitting ? "Criando..." : "Abrir período"}
        </button>
      </div>
    </div>
  );
}

// ─── Modal: Registrar Vale ───────────────────────────────────────────────────

function AdvanceModal({
  periodId,
  users,
  onClose,
  onCreated,
}: {
  periodId: string;
  users: UserOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const seamstresses = users.filter((u) => u.active && u.role !== "owner");
  const [userId, setUserId] = useState(seamstresses[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const parsed = parseFloat(amount.replace(",", "."));
    if (!userId) { setError("Selecione uma costureira."); return; }
    if (isNaN(parsed) || parsed <= 0) { setError("Informe um valor válido."); return; }
    setSubmitting(true);
    try {
      await apiClient(`/payroll/periods/${periodId}/advances`, {
        method: "POST",
        body: JSON.stringify({ userId, amount: parsed, note: note.trim() || undefined }),
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao registrar vale.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-carvao">Registrar vale</h2>
          <button onClick={onClose} className="text-carvao/40 text-xl leading-none">×</button>
        </div>
        <div>
          <label className="block text-xs font-medium text-carvao/50 mb-1.5">Colaboradora</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-anil">
            {seamstresses.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-carvao/50 mb-1.5">Valor (R$)</label>
          <input type="number" inputMode="decimal" min="0.01" step="0.01"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao focus:outline-none focus-visible:ring-2 focus-visible:ring-anil" />
        </div>
        <div>
          <label className="block text-xs font-medium text-carvao/50 mb-1.5">Observação <span className="font-normal text-carvao/40">(opcional)</span></label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: adiantamento quinzenal"
            className="w-full h-11 px-4 border border-carvao/15 rounded-xl text-sm text-carvao focus:outline-none focus-visible:ring-2 focus-visible:ring-anil" />
        </div>
        {error && <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg">{error}</p>}
        <button onClick={handleSubmit} disabled={submitting || !userId || !amount}
          className="w-full h-11 bg-anil text-white text-sm font-semibold rounded-xl disabled:opacity-50">
          {submitting ? "Salvando..." : "Confirmar vale"}
        </button>
      </div>
    </div>
  );
}

// ─── Detalhe do Período ──────────────────────────────────────────────────────

function PeriodDetail({
  periodId,
  users,
  onBack,
  onUpdated,
}: {
  periodId: string;
  users: UserOption[];
  onBack: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvance, setShowAdvance] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const token = tokenStore.getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payroll/periods/${periodId}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao gerar export.");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? "folha.csv";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Erro ao exportar.");
    } finally {
      setExporting(false);
    }
  }

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<PeriodDetail>(`/payroll/periods/${periodId}`);
      setDetail(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  async function handleClose() {
    if (!confirm("Fechar a folha deste período? Esta ação impedirá novos registros de produção nas datas cobertas.")) return;
    setClosing(true);
    setCloseError("");
    try {
      await apiClient(`/payroll/periods/${periodId}/close`, { method: "POST" });
      await loadDetail();
      onUpdated();
    } catch (e: unknown) {
      setCloseError(e instanceof Error ? e.message : "Erro ao fechar período.");
    } finally {
      setClosing(false);
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 bg-white rounded-2xl border border-carvao/10" />
      <div className="h-48 bg-white rounded-2xl border border-carvao/10" />
    </div>
  );

  if (!detail) return (
    <p className="text-sm text-carvao/40 text-center py-8">Não foi possível carregar o período.</p>
  );

  const { period, seamstresses, advances, totals } = detail;
  const isOpen = period.status === "open";

  return (
    <div className="space-y-4">

      {/* Header do período */}
      <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-carvao/40 mb-1">Período</p>
            <p className="text-base font-bold text-carvao">
              {formatDate(period.startDate)} → {formatDate(period.endDate)}
            </p>
            <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isOpen ? "bg-anil/10 text-anil" : "bg-carvao/8 text-carvao/50"
            }`}>
              {isOpen ? "Aberto" : "Fechado"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-carvao/40">Total líquido</p>
            <p className="text-xl font-bold font-display tabular text-carvao">{formatCurrency(totals.netEarnings)}</p>
            <p className="text-xs text-carvao/40 mt-0.5">{formatCurrency(totals.grossEarnings)} bruto</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || seamstresses.length === 0}
          className="w-full h-10 mt-4 border border-carvao/15 rounded-xl text-sm font-medium text-carvao/80 hover:bg-cru disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil transition-colors flex items-center justify-center gap-1.5"
        >
          {exporting ? "Gerando…" : "⬇ Exportar CSV (planilha)"}
        </button>
        {exportError && (
          <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg mt-2 text-center">
            {exportError}
          </p>
        )}
      </div>

      {/* Tabela por costureira */}
      <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-carvao/80 mb-3">Por colaboradora</h2>
        {seamstresses.length === 0 ? (
          <p className="text-sm text-carvao/40 text-center py-4">Nenhuma produção registrada neste período.</p>
        ) : (
          <div className="space-y-3">
            {seamstresses.map((s) => (
              <div key={s.userId} className="py-3 border-b border-carvao/5 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-carvao">{s.userName}</p>
                  <p className="text-sm font-bold text-carvao">{formatCurrency(s.netEarnings)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-carvao/40">
                  <span>{s.pieces.toLocaleString("pt-BR")} peças · bruto {formatCurrency(s.grossEarnings)}</span>
                  {s.advances > 0 && (
                    <span className="text-novelo">− {formatCurrency(s.advances)} vale</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vales registrados */}
      {advances.length > 0 && (
        <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-carvao/80 mb-3">Vales registrados</h2>
          <div className="space-y-2">
            {advances.map((adv) => (
              <div key={adv.id} className="flex items-center justify-between py-2 border-b border-carvao/5 last:border-0">
                <div>
                  <p className="text-sm text-carvao">{adv.userName}</p>
                  {adv.note && <p className="text-xs text-carvao/40">{adv.note}</p>}
                </div>
                <p className="text-sm font-semibold text-novelo">− {formatCurrency(parseFloat(adv.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      {isOpen && (
        <div className="space-y-2">
          <button onClick={() => setShowAdvance(true)}
            className="w-full h-11 border border-carvao/15 rounded-xl text-sm font-medium text-carvao/80 hover:bg-cru">
            + Registrar vale
          </button>
          {closeError && <p role="alert" aria-live="polite" className="text-sm text-retalho bg-retalho/10 px-4 py-2 rounded-lg text-center">{closeError}</p>}
          <button onClick={handleClose} disabled={closing}
            className="w-full h-11 bg-anil text-white text-sm font-semibold rounded-xl disabled:opacity-50">
            {closing ? "Fechando..." : "Fechar folha"}
          </button>
        </div>
      )}

      {showAdvance && (
        <AdvanceModal
          periodId={periodId}
          users={users}
          onClose={() => setShowAdvance(false)}
          onCreated={loadDetail}
        />
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showNewPeriod, setShowNewPeriod] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [periodsData, usersData] = await Promise.all([
        apiClient<PayrollPeriod[]>("/payroll/periods"),
        apiClient<UserOption[]>("/users"),
      ]);
      setPeriods(periodsData);
      setUsers(usersData);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (selectedPeriodId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        <button onClick={() => setSelectedPeriodId(null)}
          className="flex items-center gap-1.5 text-sm text-carvao/50 hover:text-carvao">
          ← Voltar
        </button>
        <PeriodDetail
          periodId={selectedPeriodId}
          users={users}
          onBack={() => setSelectedPeriodId(null)}
          onUpdated={loadData}
        />
      </div>
    );
  }

  const hasOpenPeriod = periods.some((p) => p.status === "open");

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-carvao">Folha de pagamento</h1>
          <p className="text-sm text-carvao/40 mt-0.5">Períodos e vales</p>
        </div>
        {!hasOpenPeriod && (
          <button onClick={() => setShowNewPeriod(true)}
            className="h-9 px-4 bg-anil text-white text-sm font-semibold rounded-xl">
            + Novo período
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-carvao/10 p-5 h-20" />
          ))}
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-8 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-medium text-carvao/80">Nenhum período criado</p>
          <p className="text-xs text-carvao/40 mt-1">Abra um período para começar a calcular a folha.</p>
          <button onClick={() => setShowNewPeriod(true)}
            className="mt-4 h-10 px-5 bg-anil text-white text-sm font-semibold rounded-xl">
            Abrir primeiro período
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <button key={p.id} onClick={() => setSelectedPeriodId(p.id)}
              className="w-full bg-white rounded-2xl border border-carvao/10 shadow-sm p-5 flex items-center justify-between hover:border-carvao/25 transition-colors text-left">
              <div>
                <p className="text-sm font-semibold text-carvao">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)}
                </p>
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  p.status === "open" ? "bg-anil/10 text-anil" : "bg-carvao/8 text-carvao/50"
                }`}>
                  {p.status === "open" ? "Aberto" : "Fechado"}
                </span>
              </div>
              <span className="text-carvao/25 text-lg">›</span>
            </button>
          ))}
        </div>
      )}

      {showNewPeriod && (
        <NewPeriodModal
          onClose={() => setShowNewPeriod(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}
