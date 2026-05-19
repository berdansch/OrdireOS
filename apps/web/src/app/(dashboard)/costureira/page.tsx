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
  const [error, setError] = useState("");

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
    } catch {
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        <button onClick={loadData} className="text-sm font-medium text-gray-900 underline">
          Tentar novamente
        </button>
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
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Ordens disponiveis ({orders.length})
        </h2>
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{order.reference}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  order.status === "in_progress"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {order.status === "in_progress" ? "Em andamento" : "Aberta"}
                </span>
              </div>
              {order.clientName && <p className="text-xs text-gray-400 mt-0.5">{order.clientName}</p>}
              {order.productDescription && <p className="text-xs text-gray-400">{order.productDescription}</p>}
              <p className="text-xs text-gray-400 mt-1">{order.totalPieces} pecas no total</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Operacoes disponíveis ({operations.length})
        </h2>
        <div className="space-y-2">
          {operations.map((op) => (
            <div key={op.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{op.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {op.standardTimeSeconds ? `${op.standardTimeSeconds}s por peca` : "Sem tempo padrao"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
