import { tokenStore } from "./token-store";
import { refreshAccessToken } from "./refresh";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers = new Headers(fetchOptions.headers);
    headers.set("Content-Type", "application/json");

    if (token && !skipAuth) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });
  };

  let token = tokenStore.getToken();
  let res = await makeRequest(token);

  if (res.status === 401 && !skipAuth) {
    token = await refreshAccessToken();

    if (!token) {
      window.location.href = "/login";
      throw new Error("Sessao expirada");
    }

    res = await makeRequest(token);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error((error as { error: string }).error ?? "Erro na requisicao");
  }

  return res.json() as Promise<T>;
}
