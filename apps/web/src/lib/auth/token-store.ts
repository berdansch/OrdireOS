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
  },

  clearAuth: () => {
    store.accessToken = null;
    store.user = null;
    clearSession();
  },

  isAuthenticated: () => {
    loadFromSession();
    return store.accessToken !== null;
  },
};
