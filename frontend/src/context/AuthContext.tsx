import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
} from "../services/auth";
import type { AuthStatus, AuthUser, LoginInput } from "../types/auth.type";
import { AuthContext } from "./authContextValue";

// React StrictMode mounts effects twice in development. Sharing this promise
// prevents two simultaneous refresh attempts from consuming the same rotating
// refresh token.
let initialSessionRequest: Promise<AuthUser | null> | null = null;

function loadInitialSession() {
  initialSessionRequest ??= restoreSession();
  return initialSessionRequest;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [preferredLanguage, setPreferredLanguage] = useState("en-IN");

  useEffect(() => {
    let active = true;
    loadInitialSession()
      .then((sessionUser) => {
        if (!active) return;
        setUser(sessionUser);
        setStatus(sessionUser ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const authenticatedUser = await loginRequest(input);
    setUser(authenticatedUser);
    setStatus("authenticated");
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      initialSessionRequest = Promise.resolve(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      preferredLanguage,
      setPreferredLanguage,
    }),
    [user, status, login, logout, preferredLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
