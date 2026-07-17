"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshAccessToken } from "@/lib/auth/refresh";

export default function CostureiraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!tokenStore.isAuthenticated()) {
        const token = await refreshAccessToken();
        if (!token) {
          router.replace("/login");
          return;
        }
      }
      const user = tokenStore.getUser();
      if (user && user.role !== "seamstress") {
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
    <div className="min-h-screen bg-cru">
      <header className="bg-white border-b border-carvao/10 px-4 py-3 flex items-center justify-between pt-safe">
        <div>
          <p className="text-xs text-carvao/40">Bem-vinda,</p>
          <p className="text-sm font-semibold text-carvao">
            {userName ?? "..."}
          </p>
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
          className="min-h-11 min-w-11 px-3 text-xs text-carvao/50 font-medium rounded-lg border border-carvao/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-anil touch-manipulation"
        >
          Sair
        </button>
      </header>
      <main className="px-4 py-6">
        {ready ? children : (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-carvao/15 border-t-anil rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
