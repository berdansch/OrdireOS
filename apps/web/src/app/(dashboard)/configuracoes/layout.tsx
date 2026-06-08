"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshAccessToken } from "@/lib/auth/refresh";
import Link from "next/link";

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!tokenStore.isAuthenticated()) {
        const token = await refreshAccessToken();
        if (!token) { router.replace("/login"); return; }
      }
      const user = tokenStore.getUser();
      if (user && user.role !== "owner" && user.role !== "supervisor") {
        router.replace("/login");
        return;
      }
      setUserName(tokenStore.getUser()?.name ?? null);
      setReady(true);
    }
    init();
  }, [router]);

  const user = tokenStore.getUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="text-gray-400 hover:text-gray-700 text-sm">←</Link>
          <div>
            <p className="text-xs text-gray-400">OrdireOS</p>
            <p className="text-sm font-semibold text-gray-900">{userName ?? "..."}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, { method: "POST", credentials: "include" });
            tokenStore.clearAuth();
            router.replace("/login");
          }}
          className="text-xs text-gray-400 font-medium px-3 py-1.5 rounded-lg border border-gray-200"
        >
          Sair
        </button>
      </header>
      <main className="px-4 py-6">
        {ready ? children : (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
