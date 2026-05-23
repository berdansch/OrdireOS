"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/auth/api-client";

type Period = "today" | "week" | "month" | "custom";

type DashboardData = {
  totalPieces: number;
  totalRework: number;
  reworkRate: number;
  byShift: { morning: number; afternoon: number; night: number };
  byOperation: {
    operationId: string;
    operationName: string;
    quantity: number;
    reworkQuantity: number;
    pricePerPiece: string | null;
    totalCost: number;
  }[];
  bySeamstress: {
    userId: string;
    userName: string;
    quantity: number;
    reworkQuantity: number;
  }[];
  openOrders: {
    orderId: string;
    reference: string;
    clientName: string | null;
    totalPieces: number;
    producedPieces: number;
    completionRate: number;
  }[];
};

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mes",
  custom: "Personalizado",
};

function getPeriodDates(period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  switch (period) {
    case "today":
      return { start: today.toISOString(), end: now.toISOString() };
    case "week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start: start.toISOString(), end: now.toISOString() };
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    case "custom":
      return {
        start: customStart ? new Date(customStart).toISOString() : today.toISOString(),
        end: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : now.toISOString(),
      };
  }
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${highlight ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-white" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ShiftBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-sm font-bold text-gray-900">
          {value.toLocaleString("pt-BR")} pcs
          <span className="text-xs text-gray-400 font-normal ml-1">({pct.toFixed(0)}%)</span>
        </p>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-24" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 h-40" />
      <div className="bg-white rounded-2xl border border-gray-100 p-4 h-40" />
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const totalShift = data.byShift.morning + data.byShift.afternoon + data.byShift.night;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total produzido" value={data.totalPieces.toLocaleString("pt-BR")} sub="pecas no periodo" highlight />
        <StatCard label="Taxa de retrabalho" value={`${data.reworkRate.toFixed(1)}%`} sub={`${data.totalRework} pecas`} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Producao por turno</h2>
        {totalShift === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Sem dados no periodo.</p>
        ) : (
          <>
            <ShiftBar label="Manha" value={data.byShift.morning} total={totalShift} color="bg-yellow-400" />
            <ShiftBar label="Tarde" value={data.byShift.afternoon} total={totalShift} color="bg-blue-400" />
            <ShiftBar label="Noite" value={data.byShift.night} total={totalShift} color="bg-indigo-500" />
          </>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ranking de costureiras</h2>
        {data.bySeamstress.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sem dados no periodo.</p>
        ) : (
          <div className="space-y-3">
            {data.bySeamstress.map((s, i) => {
              const reworkPct = s.quantity > 0 ? ((s.reworkQuantity / s.quantity) * 100).toFixed(1) : "0.0";
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={s.userId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base w-6 text-center">
                      {i < 3 ? medals[i] : <span className="text-xs text-gray-400">{i + 1}</span>}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.userName}</p>
                      {s.reworkQuantity > 0 && <p className="text-xs text-orange-500">{reworkPct}% retrabalho</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{s.quantity.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-gray-400">pecas</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Por operacao</h2>
        {data.byOperation.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sem dados no periodo.</p>
        ) : (
          <div className="space-y-2">
            {data.byOperation.map((op) => (
              <div key={op.operationId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm text-gray-900">{op.operationName}</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{op.quantity.toLocaleString("pt-BR")} pcs</p>
                  {op.reworkQuantity > 0 && <p className="text-xs text-orange-500">{op.reworkQuantity} retrabalho</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {data.openOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ordens em andamento</h2>
          <div className="space-y-4">
            {data.openOrders.map((order) => (
              <div key={order.orderId}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.reference}</p>
                    {order.clientName && <p className="text-xs text-gray-400">{order.clientName}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-900">{order.completionRate.toFixed(0)}%</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-gray-900 h-2 rounded-full transition-all" style={{ width: `${order.completionRate}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {order.producedPieces.toLocaleString("pt-BR")} de {order.totalPieces.toLocaleString("pt-BR")} pecas
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = getPeriodDates(period, customStart, customEnd);
      const result = await apiClient<DashboardData>(
        `/dashboard?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      setData(result);
    } catch {
      setError("Nao foi possivel carregar o dashboard. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    if (period !== "custom") loadDashboard();
  }, [period, loadDashboard]);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visao geral da producao</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">De</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Ate</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <button onClick={loadDashboard} disabled={!customStart || !customEnd}
              className="h-10 px-4 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-50">
              Buscar
            </button>
          </div>
        )}
      </div>
      {loading ? <LoadingSkeleton /> : error ? (
        <div className="bg-red-50 rounded-2xl px-4 py-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadDashboard} className="text-sm font-medium text-gray-900 underline mt-2">Tentar novamente</button>
        </div>
      ) : data ? <DashboardContent data={data} /> : null}
    </div>
  );
}
