"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/auth/api-client";

type SummaryData = {
  today: { pieces: number };
  week: { pieces: number; prevWeekPieces: number; deltaPercent: number | null };
  ranking: { userId: string; userName: string; quantity: number }[];
  openOrders: {
    orderId: string;
    reference: string;
    clientName: string | null;
    totalPieces: number;
    producedPieces: number;
    completionRate: number;
    status: string;
  }[];
};

const POLL_INTERVAL_MS = 60_000;

function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 h-24" />
        <div className="bg-white rounded-2xl border border-gray-100 p-4 h-24" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 h-48" />
      <div className="bg-white rounded-2xl border border-gray-100 p-4 h-40" />
    </div>
  );
}

export default function SupervisorPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const medals = ["🥇", "🥈", "🥉"];

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiClient<SummaryData>("/dashboard/summary");
      setSummary(data);
    } catch {
      // falha silenciosa — mantém último valor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    pollRef.current = setInterval(loadSummary, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") loadSummary();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadSummary]);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Producao do dia</h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{formatDate()}</p>
      </div>

      {loading ? <LoadingSkeleton /> : !summary ? (
        <div className="bg-red-50 rounded-2xl px-4 py-4 text-center">
          <p className="text-sm text-red-600">Nao foi possivel carregar os dados.</p>
          <button onClick={loadSummary} className="text-sm font-medium text-gray-900 underline mt-2">Tentar novamente</button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400">Pecas hoje</p>
              <p className="text-2xl font-bold text-white mt-1">{summary.today.pieces.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-gray-400 mt-0.5">producao do dia</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400">Pecas esta semana</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.week.pieces.toLocaleString("pt-BR")}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400">vs semana anterior</p>
                {summary.week.deltaPercent != null ? (
                  <p className={`text-xs font-semibold ${summary.week.deltaPercent >= 0 ? "text-green-500" : "text-red-400"}`}>
                    {summary.week.deltaPercent > 0 ? "+" : ""}{summary.week.deltaPercent}%
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">primeira semana</p>
                )}
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Ranking da semana</h2>
            {summary.ranking.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sem producao registrada esta semana.</p>
            ) : (
              <div className="space-y-2">
                {summary.ranking.map((s, i) => (
                  <div key={s.userId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base w-6 text-center">
                        {i < 3 ? medals[i] : <span className="text-xs text-gray-400">{i + 1}</span>}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{s.userName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{s.quantity.toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-gray-400">pecas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ordens abertas */}
          {summary.openOrders.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Ordens em aberto</h2>
              <div className="space-y-4">
                {summary.openOrders.map((order) => (
                  <div key={order.orderId}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.reference}</p>
                        {order.clientName && <p className="text-xs text-gray-400">{order.clientName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{order.completionRate}%</p>
                        <p className={`text-xs ${order.status === "in_progress" ? "text-blue-500" : "text-gray-400"}`}>
                          {order.status === "in_progress" ? "em andamento" : "aberta"}
                        </p>
                      </div>
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
      )}
    </div>
  );
}
