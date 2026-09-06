export type AuthMethod = "abha_mock" | "aadhaar_mock" | "guest";

export type AuthUser = {
  role?: "patient" | "doctor" | "lab_assistant";
  id: string;
  auth_method: AuthMethod;
  display_name: string;
  is_mock: boolean;
};

export type LoginInput = {
  auth_method: AuthMethod;
  identifier?: string;
  full_name?: string;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
