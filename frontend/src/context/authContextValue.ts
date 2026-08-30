import { createContext } from "react";

import type {
  AuthStatus,
  AuthUser,
  LoginInput,
} from "../types/auth.type";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  preferredLanguage: string;
  setPreferredLanguage: (language: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
