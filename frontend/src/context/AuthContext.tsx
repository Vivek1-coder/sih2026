import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthStatus,
  AuthUser,
} from "../types/auth.type";

import { AuthContext } from "./authContextValue";

import {
  logout as logoutRequest,
  restoreSession,
} from "../services/auth";

/*
 * React StrictMode mounts effects twice during development.
 *
 * Reusing this promise prevents two simultaneous calls to
 * /auth/me -> /auth/refresh from consuming the same rotating
 * refresh token.
 */
let initialSessionRequest:
  | Promise<AuthUser | null>
  | null = null;

/* =========================================================
   Initial Session Loader
========================================================= */

function loadInitialSession() {
  initialSessionRequest ??=
    restoreSession();

  return initialSessionRequest;
}

/* =========================================================
   Auth Provider
========================================================= */

export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  /* =======================================================
     Auth State
  ======================================================= */

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [status, setStatus] =
    useState<AuthStatus>("loading");

  /* =======================================================
     Accessibility / Language
  ======================================================= */

  const [
    preferredLanguage,
    setPreferredLanguage,
  ] = useState("en-IN");

  /* =======================================================
     Restore Existing Session

     Browser automatically sends HttpOnly access/refresh
     cookies because services/auth.ts uses:

     withCredentials: true
  ======================================================= */

  useEffect(() => {
    let active = true;

    loadInitialSession()
      .then((sessionUser) => {
        if (!active) {
          return;
        }

        setUser(sessionUser);

        setStatus(
          sessionUser
            ? "authenticated"
            : "unauthenticated",
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setUser(null);

        setStatus("unauthenticated");
      });

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
     Set Authenticated User

     Call this after:
     - password login
     - OTP login
     - registration

     No JWT is stored in context.
     Only safe user information is stored here.
  ======================================================= */

  const setAuthenticatedUser =
    useCallback(
      (
        authenticatedUser: AuthUser,
      ) => {
        setUser(
          authenticatedUser,
        );

        setStatus(
          "authenticated",
        );

        /*
         * Keep the shared initial-session cache
         * consistent with the current user.
         */
        initialSessionRequest =
          Promise.resolve(
            authenticatedUser,
          );
      },
      [],
    );

  /* =======================================================
     Reload User / Session

     Useful when:
     - profile changes
     - user returns to the app
     - session needs to be revalidated

     restoreSession() automatically:
     1. calls /auth/me
     2. refreshes token on 401
     3. retries /auth/me
  ======================================================= */

  const reloadUser =
    useCallback(async () => {
      setStatus("loading");

      try {
        /*
         * Don't use the old cached initial request here.
         *
         * We explicitly want a fresh server check.
         */
        const sessionUser =
          await restoreSession();

        setUser(
          sessionUser,
        );

        setStatus(
          sessionUser
            ? "authenticated"
            : "unauthenticated",
        );

        initialSessionRequest =
          Promise.resolve(
            sessionUser,
          );
      } catch (error) {
        setUser(null);

        setStatus(
          "unauthenticated",
        );

        initialSessionRequest =
          Promise.resolve(null);

        throw error;
      }
    }, []);

  /* =======================================================
     Logout

     POST /api/auth/logout

     Backend:
     - revokes refresh token
     - clears access cookie
     - clears refresh cookie
  ======================================================= */

  const logout =
    useCallback(async () => {
      try {
        await logoutRequest();
      } finally {
        /*
         * Regardless of whether the network request
         * succeeds, remove local authenticated state.
         */
        initialSessionRequest =
          Promise.resolve(null);

        setUser(null);

        setStatus(
          "unauthenticated",
        );
      }
    }, []);

  /* =======================================================
     Context Value
  ======================================================= */

  const value = useMemo(
    () => ({
      user,

      status,

      setAuthenticatedUser,

      reloadUser,

      logout,

      preferredLanguage,

      setPreferredLanguage,
    }),
    [
      user,
      status,
      setAuthenticatedUser,
      reloadUser,
      logout,
      preferredLanguage,
    ],
  );

  /* =======================================================
     Provider
  ======================================================= */

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}
