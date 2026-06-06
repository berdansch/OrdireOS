"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/auth/api-client";

type ProductionOrder = {
  id: string;
  reference: string;
  totalPieces: number;
  status: "open" | "in_progress" | "closed";
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Pendente",
  in_progress: "Em Producao",
  closed: "Concluida",
};

const STATUS_COLORS: Record<string, string> = {
  open: "text-yellow-600 bg-yellow-50",
  in_progress: "text-blue-600 bg-blue-50",
  closed: "text-green-600 bg-green-50",
};

export default function OrdensPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reference, setReference] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    try {
      const data = await apiClient<ProductionOrder[]>("/production-orders");
      setOrders(data);
    } catch {
      setError("Erro ao carregar as Ordens de Producao.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!reference.trim() || !quantity) {
      setError("Preencha todos os campos.");
      return;
    }
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      setError("A quantidade deve ser um numero valido maior que zero.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient("/production-orders", {
        method: "POST",
        body: JSON.stringify({ reference: reference.trim(), totalPieces: numericQuantity }),
      });
      setReference("");
      setQuantity("");
      setSuccess("Ordem de Producao cadastrada com sucesso!");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar a OP.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ordens de Producao</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastre os novos lotes que entrarão na fabrica.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Nova OP</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia / Modelo *</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => { setReference(e.target.value); setError(""); }}
              placeholder="Ex: Camiseta Gola V Branca"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Pecas *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(""); }}
              placeholder="Ex: 500"
              min="1"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          {error && <div className="bg-red-50 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
          {success && <div className="bg-green-50 rounded-xl px-4 py-3"><p className="text-sm text-green-700">{success}</p></div>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {saving ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Cadastrando...</>
            ) : "Cadastrar OP"}
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">OPs Cadastradas ({orders.length})</h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma Ordem de Producao cadastrada ainda.</p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.reference}</p>
                  <p className="text-xs text-gray-400">{order.totalPieces} pecas</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${STATUS_COLORS[order.status] ?? "text-gray-500 bg-gray-50"}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
