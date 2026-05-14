type AuthStore = {
  accessToken: string | null;
  user: {
    id: string;
    name: string;
    role: "owner" | "supervisor" | "seamstress";
    tenant_id: string;
  } | null;
};

const store: AuthStore = {
  accessToken: null,
  user: null,
};

export const tokenStore = {
  getToken: () => store.accessToken,
  getUser: () => store.user,

  setAuth: (token: string, user: AuthStore["user"]) => {
    store.accessToken = token;
    store.user = user;
  },

  clearAuth: () => {
    store.accessToken = null;
    store.user = null;
  },

  isAuthenticated: () => store.accessToken !== null,
};
