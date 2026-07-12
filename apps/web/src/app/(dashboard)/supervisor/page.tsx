"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/auth/api-client";
import { WarpProgress } from "@/components/WarpProgress";

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
        <div className="bg-white rounded-2xl border border-carvao/10 p-4 h-24" />
        <div className="bg-white rounded-2xl border border-carvao/10 p-4 h-24" />
      </div>
      <div className="bg-white rounded-2xl border border-carvao/10 p-4 h-48" />
      <div className="bg-white rounded-2xl border border-carvao/10 p-4 h-40" />
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
        <h1 className="text-xl font-bold text-carvao">Producao do dia</h1>
        <p className="text-sm text-carvao/40 mt-0.5 capitalize">{formatDate()}</p>
      </div>

      {loading ? <LoadingSkeleton /> : !summary ? (
        <div role="alert" aria-live="polite" className="bg-retalho/10 rounded-2xl px-4 py-4 text-center">
          <p className="text-sm text-retalho">Nao foi possivel carregar os dados.</p>
          <button onClick={loadSummary} className="text-sm font-medium text-carvao underline mt-2">Tentar novamente</button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-anil rounded-2xl border border-anil-escuro shadow-sm p-4">
              <p className="text-xs font-medium text-white/60">Pecas hoje</p>
              <p className="text-2xl font-bold font-display tabular text-white mt-1">{summary.today.pieces.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-white/60 mt-0.5">producao do dia</p>
            </div>
            <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-4">
              <p className="text-xs font-medium text-carvao/40">Pecas esta semana</p>
              <p className="text-2xl font-bold font-display tabular text-carvao mt-1">{summary.week.pieces.toLocaleString("pt-BR")}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-carvao/40">vs semana anterior</p>
                {summary.week.deltaPercent != null ? (
                  <p className={`text-xs font-semibold ${summary.week.deltaPercent >= 0 ? "text-linha-verde" : "text-retalho"}`}>
                    {summary.week.deltaPercent > 0 ? "+" : ""}{summary.week.deltaPercent}%
                  </p>
                ) : (
                  <p className="text-xs text-carvao/40">primeira semana</p>
                )}
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-carvao/80 mb-3">Ranking da semana</h2>
            {summary.ranking.length === 0 ? (
              <p className="text-sm text-carvao/40 text-center py-4">Sem producao registrada esta semana.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxQty = Math.max(...summary.ranking.map((s) => s.quantity));
                  return summary.ranking.map((s, i) => (
                    <div key={s.userId} className="py-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base w-6 text-center">
                            {i < 3 ? medals[i] : <span className="text-xs text-carvao/40">{i + 1}</span>}
                          </span>
                          <p className="text-sm font-medium text-carvao">{s.userName}</p>
                        </div>
                        <div className="text-right shrink-0 pl-3">
                          <p className="text-sm font-bold text-carvao tabular">{s.quantity.toLocaleString("pt-BR")}</p>
                          <p className="text-xs text-carvao/40">pecas</p>
                        </div>
                      </div>
                      <div
                        role="img"
                        aria-label={`${s.userName}: ${s.quantity.toLocaleString("pt-BR")} pecas`}
                        className="bg-carvao/8 rounded-full h-1.5 ml-8"
                      >
                        <div
                          className={`h-1.5 rounded-full transition-all ${i === 0 ? "bg-novelo" : "bg-anil"}`}
                          style={{ width: `${maxQty > 0 ? (s.quantity / maxQty) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Ordens abertas */}
          {summary.openOrders.length > 0 && (
            <div className="bg-white rounded-2xl border border-carvao/10 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-carvao/80 mb-3">Ordens em aberto</h2>
              <div className="space-y-4">
                {summary.openOrders.map((order) => (
                  <div key={order.orderId}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-carvao">{order.reference}</p>
                        {order.clientName && <p className="text-xs text-carvao/40">{order.clientName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-carvao tabular">{order.completionRate}%</p>
                        <p className={`text-xs ${order.status === "in_progress" ? "text-anil" : "text-carvao/40"}`}>
                          {order.status === "in_progress" ? "em andamento" : "aberta"}
                        </p>
                      </div>
                    </div>
                    <WarpProgress
                      value={order.completionRate}
                      label={`Progresso de ${order.reference}`}
                      size="sm"
                    />
                    <p className="text-xs text-carvao/40 mt-1">
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
