import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./contexts.js";
import { api, getToken, setToken, clearToken, ApiError } from "../api/client.js";

const USER_KEY = "es_user";

function cachedUser() {
  try {
    return getToken() ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  // Start from the cached profile so a refresh doesn't flash the login page, then re-validate.
  const [user, setUser] = useState(cachedUser);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  const store = useCallback((u) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    api
      .me()
      .then(({ user: u }) => alive && store(u))
      .catch((err) => {
        // Only log out if the server actually rejected the token; keep the session if we're just offline.
        if (alive && err instanceof ApiError && err.status === 401) logout();
      })
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [store, logout]);

  useEffect(() => {
    window.addEventListener("es:unauthorized", logout);
    return () => window.removeEventListener("es:unauthorized", logout);
  }, [logout]);

  const authenticate = useCallback(
    async (fn, payload) => {
      const { token, user: u } = await fn(payload);
      setToken(token);
      store(u);
      return u;
    },
    [store]
  );

  const value = useMemo(
    () => ({
      user,
      checking,
      login: (p) => authenticate(api.login, p),
      register: (p) => authenticate(api.register, p),
      logout,
      updateProfile: async (changes) => {
        const { user: u } = await api.updateMe(changes);
        store(u);
        return u;
      },
    }),
    [user, checking, authenticate, logout, store]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
