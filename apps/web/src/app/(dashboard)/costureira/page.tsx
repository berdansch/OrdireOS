"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/auth/api-client";

type ProductionOrder = {
  id: string;
  reference: string;
  clientName: string | null;
  productDescription: string | null;
  totalPieces: number;
  status: "open" | "in_progress" | "closed";
};

type Operation = {
  id: string;
  name: string;
  standardTimeSeconds: number | null;
  pricePerPiece: string | null;
};

export default function CostureiraPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOperationId, setSelectedOperationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reworkQuantity, setReworkQuantity] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [ordersData, operationsData] = await Promise.all([
        apiClient<ProductionOrder[]>("/production-orders"),
        apiClient<Operation[]>("/operations"),
      ]);
      const sorted = ordersData.sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;
        return 0;
      });
      setOrders(sorted);
      setOperations(operationsData);
      const inProgress = sorted.find((o) => o.status === "in_progress");
      if (inProgress) setSelectedOrderId(inProgress.id);
    } catch {
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedOrderId || !selectedOperationId || !quantity) return;
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
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar producao.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-400 text-center">
          Nenhuma ordem disponivel. Fale com seu supervisor.
        </p>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-400 text-center">
          Nenhuma operacao cadastrada. Fale com seu supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 text-center">
          <p className="text-sm font-medium text-green-700">Producao registrada com sucesso.</p>
          <p className="text-xs text-green-600 mt-1">Em caso de erro, fale com seu supervisor.</p>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Registrar producao</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de producao</label>
          <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Selecione uma ordem</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.reference}{order.status === "in_progress" ? " (em andamento)" : ""}{order.clientName ? ` — ${order.clientName}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Operacao</label>
          <select value={selectedOperationId} onChange={(e) => setSelectedOperationId(e.target.value)}
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Selecione uma operacao</option>
            {operations.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade produzida</label>
          <input type="number" inputMode="numeric" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} placeholder="Ex: 45" min="1"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Retrabalho (opcional)</label>
          <input type="number" inputMode="numeric" value={reworkQuantity}
            onChange={(e) => setReworkQuantity(e.target.value)} placeholder="Ex: 2" min="0"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
        <button onClick={handleSubmit}
          disabled={submitting || !selectedOrderId || !selectedOperationId || !quantity}
          className="w-full h-14 bg-gray-900 text-white font-semibold rounded-xl disabled:opacity-50 active:scale-95 transition-transform text-base">
          {submitting ? "Registrando..." : "Registrar producao"}
        </button>
      </div>
    </div>
  );
}
