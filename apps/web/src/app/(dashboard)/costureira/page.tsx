"use client";

// apps/web/src/app/(dashboard)/costureira/page.tsx

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/auth/api-client";

import type { ProductionOrder, Operation, DailyHistory } from "@ordireos/db";

type SeamstressStats = {
  week: { pieces: number };
  month: { pieces: number; estimatedEarnings: number };
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatsSection({ stats }: { stats: SeamstressStats }) {
  const hasEarnings = stats.month.estimatedEarnings > 0;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-medium text-gray-400">Pecas esta semana</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {stats.week.pieces.toLocaleString("pt-BR")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">ultimos 7 dias</p>
      </div>
      <div className={`rounded-2xl border shadow-sm p-4 ${hasEarnings ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
        <p className="text-xs font-medium text-gray-400">Ganho estimado</p>
        <p className={`text-2xl font-bold mt-1 ${hasEarnings ? "text-white" : "text-gray-900"}`}>
          {hasEarnings ? formatCurrency(stats.month.estimatedEarnings) : "—"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {stats.month.pieces.toLocaleString("pt-BR")} pcs no mes
        </p>
      </div>
    </div>
  );
}

const SHIFT_LABELS: Record<string, string> = {
  morning: "Manha",
  afternoon: "Tarde",
  night: "Noite",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LoadingSkeleton() {
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 h-24" />
        <div className="bg-white rounded-2xl border border-gray-100 p-4 h-24" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-14 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function CostureiraPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [history, setHistory] = useState<DailyHistory>({ logs: [], total: 0 });
  const [stats, setStats] = useState<SeamstressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reworkQuantity, setReworkQuantity] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiClient<DailyHistory>("/production-logs/my");
      setHistory(data);
    } catch (err) {
      console.error("[loadHistory]", err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient<SeamstressStats>("/production-logs/my-stats");
      setStats(data);
    } catch (err) {
      console.error("[loadStats]", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, operationsData] = await Promise.all([
        apiClient<ProductionOrder[]>("/production-orders"),
        apiClient<Operation[]>("/operations"),
      ]);

      const sorted = [...ordersData].sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;
        return 0;
      });

      setOrders(sorted);
      setOperations(operationsData);

      const inProgress = sorted.find((o) => o.status === "in_progress");
      if (inProgress) setSelectedOrderId(inProgress.id);
    } catch (err) {
      console.error("[loadData]", err);
      setError("Nao foi possivel carregar os dados. Verifique sua conexao e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadData(), loadHistory(), loadStats()]);
  }, [loadData, loadHistory, loadStats]);

  function validateForm(): string | null {
    if (!selectedOrderId) return "Selecione uma ordem de producao.";
    if (!selectedOperationId) return "Selecione uma operacao.";
    if (!quantity || parseInt(quantity) <= 0) return "Informe a quantidade produzida.";
    if (reworkQuantity && parseInt(reworkQuantity) > parseInt(quantity)) {
      return "O retrabalho nao pode ser maior que a quantidade produzida.";
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await apiClient("/production-logs", {
        method: "POST",
        body: JSON.stringify({
          productionOrderId: selectedOrderId,
          operationId: selectedOperationId,
          quantity: parseInt(quantity),
          reworkQuantity: reworkQuantity ? parseInt(reworkQuantity) : 0,
        }),
      });

      setQuantity("");
      setReworkQuantity("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      await Promise.all([loadHistory(), loadStats()]);
    } catch (err) {
      console.error("[handleSubmit]", err);
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a producao.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
        <div className="bg-red-50 rounded-2xl px-4 py-4 text-center w-full max-w-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
        <button onClick={() => { setError(""); setLoading(true); loadData(); }}
          className="text-sm font-medium text-gray-900 underline">Tentar novamente</button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-medium text-gray-700">Nenhuma ordem disponivel</p>
          <p className="text-xs text-gray-400 mt-1">Fale com seu supervisor.</p>
        </div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">⚙️</p>
          <p className="text-sm font-medium text-gray-700">Nenhuma operacao cadastrada</p>
          <p className="text-xs text-gray-400 mt-1">Fale com seu supervisor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">

      {/* Stats: semana + ganho estimado */}
      {stats && <StatsSection stats={stats} />}

      {success && (
        <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 text-center">
          <p className="text-base">✅</p>
          <p className="text-sm font-semibold text-green-700 mt-1">Producao registrada com sucesso!</p>
          <p className="text-xs text-green-600 mt-1">Em caso de erro, fale com seu supervisor.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Registrar producao</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ordem de producao <span className="text-red-400">*</span>
          </label>
          <select value={selectedOrderId} onChange={(e) => { setSelectedOrderId(e.target.value); setError(""); }}
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Selecione...</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.reference}
                {order.status === "in_progress" ? " (em andamento)" : ""}
                {order.clientName ? ` — ${order.clientName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operacao <span className="text-red-400">*</span>
          </label>
          <select value={selectedOperationId} onChange={(e) => { setSelectedOperationId(e.target.value); setError(""); }}
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Selecione...</option>
            {operations.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade produzida <span className="text-red-400">*</span>
          </label>
          <input type="number" inputMode="numeric" pattern="[0-9]*"
            value={quantity} onChange={(e) => { setQuantity(e.target.value); setError(""); }}
            placeholder="0" min="1"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 text-lg font-medium" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Retrabalho <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input type="number" inputMode="numeric" pattern="[0-9]*"
            value={reworkQuantity} onChange={(e) => { setReworkQuantity(e.target.value); setError(""); }}
            placeholder="0" min="0"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 text-lg font-medium" />
        </div>

        {error && (
          <div className="bg-red-50 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full h-14 bg-gray-900 text-white font-semibold rounded-xl disabled:opacity-60 active:scale-95 transition-all text-base flex items-center justify-center gap-2">
          {submitting ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Registrando...</>
          ) : "Registrar producao"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Meu dia</h2>
          {history.total > 0 && (
            <span className="text-sm font-bold text-gray-900">
              {history.total} {history.total === 1 ? "peca" : "pecas"}
            </span>
          )}
        </div>

        {history.logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum lancamento ainda hoje.</p>
        ) : (
          <div className="space-y-2">
            {history.logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{log.operationName}</p>
                  <p className="text-xs text-gray-400">
                    {log.orderReference}
                    {log.shift ? ` · ${SHIFT_LABELS[log.shift]}` : ""}
                    {" · "}{formatTime(log.loggedAt.toString())}
                  </p>
                  {log.reworkQuantity > 0 && (
                    <p className="text-xs text-orange-500">
                      {log.reworkQuantity} {log.reworkQuantity === 1 ? "peca" : "pecas"} de retrabalho
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{log.quantity}</p>
                  <p className="text-xs text-gray-400">pecas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
