"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";
import { refreshAccessToken } from "@/lib/auth/refresh";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/supervisor" },
  { label: "Ordens", href: "/supervisor/ordens" },
];

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      if (user && user.role !== "supervisor") {
        router.replace("/login");
        return;
      }
      setUserName(tokenStore.getUser()?.name ?? null);
      setReady(true);
    }
    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Ordire<span className="text-indigo-600">OS</span></p>
          <p className="text-sm font-semibold text-gray-900">{userName ?? "..."}</p>
        </div>
        <div className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                pathname === item.href
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </a>
          ))}
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
        </div>
      </header>
      <main className="px-4 py-6">
        {ready ? children : (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
