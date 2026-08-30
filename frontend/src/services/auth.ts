import type { AuthUser, LoginInput } from "../types/auth.type";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

type AuthResponse = {
  user: AuthUser;
};

type ApiErrorBody = {
  detail?: string | Array<{ msg?: string }>;
};

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

async function errorFrom(response: Response): Promise<AuthApiError> {
  let message = "Authentication request failed. Please try again.";
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message =
        body.detail.map((item) => item.msg).filter(Boolean).join(" ") || message;
    }
  } catch {
    // Keep the safe fallback when the server did not return JSON.
  }
  return new AuthApiError(message, response.status);
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/auth${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const response = await authFetch("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await errorFrom(response);
  return ((await response.json()) as AuthResponse).user;
}

export async function restoreSession(): Promise<AuthUser | null> {
  let response = await authFetch("/me");
  if (response.status === 401) {
    response = await authFetch("/refresh", { method: "POST" });
  }
  if (response.status === 401) return null;
  if (!response.ok) throw await errorFrom(response);
  return ((await response.json()) as AuthResponse).user;
}

export async function logout(): Promise<void> {
  const response = await authFetch("/logout", { method: "POST" });
  if (!response.ok) throw await errorFrom(response);
}
