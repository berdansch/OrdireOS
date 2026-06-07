"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3;

type FormData = {
  tenantName: string;
  tenantSlug: string;
  city: string;
  state: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {([1, 2, 3] as Step[]).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            step < current ? "bg-gray-900 text-white" :
            step === current ? "bg-gray-900 text-white ring-4 ring-gray-200" :
            "bg-gray-100 text-gray-400"
          }`}>
            {step < current ? "✓" : step}
          </div>
          {step < 3 && <div className={`w-8 h-0.5 ${step < current ? "bg-gray-900" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

function InputField({
  label, type = "text", value, onChange, placeholder, hint, error,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; hint?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
          error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-gray-900"
        }`}
      />
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    tenantName: "",
    tenantSlug: "",
    city: "",
    state: "SC",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "tenantName") {
        next.tenantSlug = slugify(value);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateStep1(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.tenantName.trim()) e.tenantName = "Informe o nome da facção";
    if (!form.tenantSlug.trim()) e.tenantSlug = "Slug é obrigatório";
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.tenantSlug)) e.tenantSlug = "Use apenas letras minúsculas, números e hifens";
    if (!form.city.trim()) e.city = "Informe a cidade";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.ownerName.trim()) e.ownerName = "Informe seu nome completo";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Email inválido";
    if (!form.password || form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "As senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  async function handleSubmit() {
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: form.tenantName.trim(),
          tenantSlug: form.tenantSlug,
          ownerName: form.ownerName.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setApiError(data.error ?? "Erro ao criar conta.");
        // Nao redireciona — mantém na etapa 3 para o erro ser visivel
      }
    } catch {
      setApiError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">🎉</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Conta criada!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Bem-vindo ao OrdireOS, {form.ownerName.split(" ")[0]}. Sua facção está pronta para começar.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl"
          >
            Fazer login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">OrdireOS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Cadastro da sua facção</p>
        </div>

        <StepIndicator current={step} />

        {/* Etapa 1 — A empresa */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-gray-900">Sua facção</h2>
              <p className="text-sm text-gray-400">Como sua empresa se identifica</p>
            </div>

            <InputField
              label="Nome da facção *"
              value={form.tenantName}
              onChange={(v) => set("tenantName", v)}
              placeholder="Confecções Silva"
              error={errors.tenantName}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Identificador único *
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-gray-900">
                <span className="px-3 py-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">
                  ordireos/
                </span>
                <input
                  type="text"
                  value={form.tenantSlug}
                  onChange={(e) => set("tenantSlug", slugify(e.target.value))}
                  className="flex-1 px-3 py-3 text-sm text-gray-900 focus:outline-none bg-white"
                  placeholder="conf-silva"
                />
              </div>
              {errors.tenantSlug
                ? <p className="text-xs text-red-500 mt-1">{errors.tenantSlug}</p>
                : <p className="text-xs text-gray-400 mt-1">Gerado automaticamente. Pode editar.</p>
              }
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <InputField
                  label="Cidade *"
                  value={form.city}
                  onChange={(v) => set("city", v)}
                  placeholder="Blumenau"
                  error={errors.city}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                <select
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="w-full h-12 px-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2 — O proprietário */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-gray-900">Seu acesso</h2>
              <p className="text-sm text-gray-400">Dados do proprietário da conta</p>
            </div>

            <InputField
              label="Nome completo *"
              value={form.ownerName}
              onChange={(v) => set("ownerName", v)}
              placeholder="João Silva"
              error={errors.ownerName}
            />
            <InputField
              label="Email *"
              type="email"
              value={form.email}
              onChange={(v) => set("email", v)}
              placeholder="joao@confeccoes.com.br"
              error={errors.email}
            />
            <InputField
              label="Senha *"
              type="password"
              value={form.password}
              onChange={(v) => set("password", v)}
              placeholder="Mínimo 6 caracteres"
              error={errors.password}
            />
            <InputField
              label="Confirmar senha *"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => set("confirmPassword", v)}
              placeholder="Repita a senha"
              error={errors.confirmPassword}
            />
          </div>
        )}

        {/* Etapa 3 — Confirmação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-gray-900">Confirmar dados</h2>
              <p className="text-sm text-gray-400">Revise antes de criar a conta</p>
            </div>

            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Facção</p>
                <p className="text-sm font-medium text-gray-900">{form.tenantName}</p>
                <p className="text-xs text-gray-400">{form.city} · {form.state}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Identificador</p>
                <p className="text-sm font-mono text-gray-700">ordireos/{form.tenantSlug}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Proprietário</p>
                <p className="text-sm font-medium text-gray-900">{form.ownerName}</p>
                <p className="text-xs text-gray-400">{form.email}</p>
              </div>
            </div>

          </div>
        )}

        {/* Erro de API — visivel em qualquer etapa */}
        {apiError && (
          <div className="mt-4 bg-red-50 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{apiError}</p>
          </div>
        )}

        {/* Navegação */}
        <div className="mt-6 space-y-3">
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl active:scale-95 transition-transform"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-12 bg-gray-900 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Criando conta...</>
              ) : "Criar minha conta"}
            </button>
          )}

          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="w-full h-10 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        <p className="text-xs text-center text-gray-400 mt-4">
          Já tem conta?{" "}
          <a href="/login" className="text-gray-900 font-medium underline">Entrar</a>
        </p>
      </div>
    </main>
  );
}
