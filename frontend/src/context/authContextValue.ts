import {
  createContext
} from "react";

import type {
  AuthStatus,
  AuthUser,
} from "../types/auth.type";

export interface AuthContextValue {
  user: AuthUser | null;

  status: AuthStatus;

  setAuthenticatedUser: (
    user: AuthUser,
  ) => void;

  reloadUser: () => Promise<void>;

  logout: () => Promise<void>;

  preferredLanguage: string;

  setPreferredLanguage: (language: string) => void;
}

export const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);
