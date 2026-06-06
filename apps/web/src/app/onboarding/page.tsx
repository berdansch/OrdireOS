"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tenantName: "",
    tenantSlug: "",
    ownerName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!form.tenantName || !form.tenantSlug || !form.ownerName || !form.email || !form.password) {
      setError("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Faccao criada com sucesso! Agora voce pode logar.");
        router.push("/login");
      } else {
        setError(data.error ?? "Erro ao criar conta.");
      }
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cadastrar Faccao</h1>
          <p className="text-sm text-gray-500 mt-1">Crie a conta da sua fabrica para comecar.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Faccao *</label>
          <input
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Ex: Confeccoes Silva"
            onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <input
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Ex: conf-silva"
            onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">Apenas letras minusculas, numeros e hifens.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome *</label>
          <input
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Ex: Joao Silva"
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="joao@fabrica.com.br"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
          <input
            type="password"
            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Minimo 6 caracteres"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        {error && <div className="bg-red-50 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Registrando...</>
          ) : "Criar Conta"}
        </button>
        <p className="text-xs text-center text-gray-400">
          Ja tem conta?{" "}
          <a href="/login" className="text-gray-900 font-medium underline">Entrar</a>
        </p>
      </div>
    </main>
  );
}
