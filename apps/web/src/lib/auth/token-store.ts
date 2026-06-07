type User = {
  id: string;
  name: string;
  role: "owner" | "supervisor" | "seamstress";
  tenant_id: string;
};

type AuthStore = {
  accessToken: string | null;
  user: User | null;
};

const store: AuthStore = {
  accessToken: null,
  user: null,
};

const SESSION_KEY = "ordireos_auth";
const SESSION_COOKIE = "ordireos_session";

function loadFromSession(): void {
  if (store.accessToken !== null) return;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as AuthStore;
    store.accessToken = parsed.accessToken;
    store.user = parsed.user;
  } catch {
    // sessionStorage indisponivel ou dado corrompido
  }
}

function saveToSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(store));
  } catch {
    // sessionStorage indisponivel
  }
}

function setSessionCookie(): void {
  // Cookie leve no dominio do Vercel — permite middleware proteger rotas
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax; Secure; Max-Age=604800`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0`;
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sessionStorage indisponivel
  }
}

export const tokenStore = {
  getToken: () => {
    loadFromSession();
    return store.accessToken;
  },

  getUser: () => {
    loadFromSession();
    return store.user;
  },

  setAuth: (token: string, user: User | null) => {
    store.accessToken = token;
    store.user = user;
    saveToSession();
    setSessionCookie();
  },

  clearAuth: () => {
    store.accessToken = null;
    store.user = null;
    clearSession();
    clearSessionCookie();
  },

  isAuthenticated: () => {
    loadFromSession();
    return store.accessToken !== null;
  },
};
