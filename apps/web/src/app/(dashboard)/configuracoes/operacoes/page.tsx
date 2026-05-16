"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/auth/api-client";

type Operation = {
  id: string;
  name: string;
  standardTimeSeconds: number | null;
  pricePerPiece: string | null;
  active: boolean;
};

export default function OperacoesPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [standardTime, setStandardTime] = useState("");
  const [pricePerPiece, setPricePerPiece] = useState("");

  useEffect(() => { loadOperations(); }, []);

  async function loadOperations() {
    try {
      const data = await apiClient<Operation[]>("/operations");
      setOperations(data);
    } catch {
      setError("Erro ao carregar operacoes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiClient("/operations", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          standardTimeSeconds: standardTime ? parseInt(standardTime) : undefined,
          pricePerPiece: pricePerPiece || undefined,
        }),
      });
      setName("");
      setStandardTime("");
      setPricePerPiece("");
      setSuccess("Operacao cadastrada com sucesso!");
      await loadOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await apiClient(`/operations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: false }),
      });
      await loadOperations();
    } catch {
      setError("Erro ao desativar operacao.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operacoes</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastre os tipos de operacao da sua fabrica.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Nova operacao</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Costura de manga"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tempo padrao (segundos)</label>
            <input type="number" value={standardTime} onChange={(e) => setStandardTime(e.target.value)}
              placeholder="Ex: 45"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor por peca (R$)</label>
            <input type="number" step="0.01" value={pricePerPiece} onChange={(e) => setPricePerPiece(e.target.value)}
              placeholder="Ex: 0.85"
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">{success}</p>}
          <button onClick={handleCreate} disabled={saving || !name.trim()}
            className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 active:scale-95 transition-transform">
            {saving ? "Cadastrando..." : "Cadastrar operacao"}
          </button>
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Operacoes cadastradas ({operations.length})</h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
          ) : operations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma operacao cadastrada ainda.</p>
          ) : (
            operations.map((op) => (
              <div key={op.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{op.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {op.standardTimeSeconds ? `${op.standardTimeSeconds}s por peca` : "Sem tempo padrao"}
                    {op.pricePerPiece ? ` · R$ ${parseFloat(op.pricePerPiece).toFixed(2)}/peca` : ""}
                  </p>
                </div>
                <button onClick={() => handleDeactivate(op.id)}
                  className="text-xs text-red-500 font-medium px-3 py-1.5 rounded-lg border border-red-100 active:scale-95 transition-transform">
                  Desativar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
