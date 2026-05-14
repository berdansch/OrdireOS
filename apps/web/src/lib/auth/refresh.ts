import { tokenStore } from "./token-store";

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        tokenStore.clearAuth();
        return null;
      }

      const data = await res.json() as { access_token: string };
      tokenStore.setAuth(data.access_token, tokenStore.getUser());
      return data.access_token;
    } catch {
      tokenStore.clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
