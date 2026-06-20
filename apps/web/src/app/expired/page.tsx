// apps/web/src/app/expired/page.tsx
export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
        <p className="text-4xl">⏳</p>
        <h1 className="text-lg font-bold text-gray-900">Periodo de teste encerrado</h1>
        <p className="text-sm text-gray-500">
          O seu periodo de teste gratuito de 14 dias chegou ao fim.
          Entre em contato para continuar usando o OrdireOS.
        </p>
        <a
          href="https://wa.me/5547999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-12 bg-gray-900 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          Falar no WhatsApp
        </a>
        <a
          href="/login"
          className="block text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Voltar ao login
        </a>
      </div>
    </div>
  );
}
