"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshAccessToken } from "@/lib/auth/refresh";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      if (!tokenStore.isAuthenticated()) {
        const token = await refreshAccessToken();
        if (!token) { router.replace("/login"); return; }
      }
      const user = tokenStore.getUser();
      if (user && user.role !== "owner" && user.role !== "supervisor") {
        router.replace("/login");
      }
    }
    init();
  }, [router]);

  const user = tokenStore.getUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">OrdireOS</p>
          <p className="text-sm font-semibold text-gray-900">{user?.name ?? "Carregando..."}</p>
        </div>
        <button
          onClick={async () => {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
              method: "POST",
              credentials: "include",
            });
            tokenStore.clearAuth();
            router.replace("/login");
          }}
          className="text-xs text-gray-400 font-medium px-3 py-1.5 rounded-lg border border-gray-200"
        >
          Sair
        </button>
      </header>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
