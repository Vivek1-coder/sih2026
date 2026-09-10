import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import type { AuthUser } from "../types/auth.type";
import type { RegisterForm } from "../pages/identify";
import { getApiBaseUrl } from "./baseUrl";

export type IdentifierType =
  | "abha"
  | "aadhaar"
  | "email_or_phone";

export interface PasswordLoginInput {
  identifier_type: IdentifierType;
  identifier: string;
  password: string;
}

export interface OtpLoginInput {
  identifier_type: IdentifierType;
  identifier: string;
  otp: string;
}

export interface RequestOtpInput {
  identifier_type: IdentifierType;
  identifier: string;
  purpose: "login";
}

// export interface RegisterInput {
//   full_name: string;
//   date_of_birth: string;
//   gender: string;

//   aadhaar: string;
//   abha_id: string | null;

//   mobile: string;
//   email: string | null;

//   address: string;
//   state: string;
//   district: string;

//   emergency_contact: string | null;
//   emergency_contact_relationship: string | null;

//   password: string;
// }

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
}

interface SessionResponse {
  user: AuthUser;
}

interface OtpResponse {
  message: string;
}

interface LogoutResponse {
  message: string;
}

interface ApiValidationError {
  msg?: string;
}

interface ApiErrorBody {
  code?: string;
  detail?:
    | string
    | ApiValidationError[];

  message?: string;
}

/* =========================================================
   API URL
========================================================= */

const API_BASE_URL = getApiBaseUrl();

/* =========================================================
   Axios instance
========================================================= */

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,

  /*
   * VERY IMPORTANT:
   *
   * Allows browser to receive/send:
   *
   * access_token HttpOnly cookie
   * refresh_token HttpOnly cookie
   */
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },

  timeout: 15000,
});

/* =========================================================
   Error
========================================================= */

export class AuthApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name = "AuthApiError";
    this.status = status;
  }
}

/* =========================================================
   Convert Axios error
========================================================= */

function getApiError(
  error: unknown,
): AuthApiError {
  if (!axios.isAxiosError(error)) {
    return new AuthApiError(
      error instanceof Error
        ? error.message
        : "Authentication request failed.",
      500,
    );
  }

  const axiosError =
    error as AxiosError<ApiErrorBody>;

  const status =
    axiosError.response?.status ?? 500;

  const body =
    axiosError.response?.data;

  if (body?.code) return new AuthApiError(`errors:${body.code}`, status);

  let message =
    "Authentication request failed. Please try again.";

  if (
    typeof body?.detail === "string"
  ) {
    message = body.detail;
  } else if (
    Array.isArray(body?.detail)
  ) {
    message =
      body.detail
        .map((item) => item.msg)
        .filter(
          (value): value is string =>
            Boolean(value),
        )
        .join(" ") || message;
  } else if (body?.message) {
    message = body.message;
  } else if (
    axiosError.code ===
    "ECONNABORTED"
  ) {
    message =
      "The server took too long to respond.";
  } else if (
    !axiosError.response
  ) {
    message =
      "Unable to connect to the server.";
  }

  return new AuthApiError(
    message,
    status,
  );
}

/* =========================================================
   Automatic Refresh Token Handling
========================================================= */

interface RetryRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise:
  | Promise<void>
  | null = null;

/*
 * These endpoints should NEVER automatically
 * trigger another refresh request.
 */
const refreshExcludedPaths = [
  "/login/password",
  "/login/otp",
  "/otp/request",
  "/register",
  "/refresh",
  "/logout",
];

function shouldAttemptRefresh(
  url?: string,
) {
  if (!url) {
    return false;
  }

  return !refreshExcludedPaths.some(
    (path) => url.includes(path),
  );
}

async function refreshSessionCookie() {
  /*
   * Use the base Axios instance instead of authApi
   * so the interceptor cannot recursively intercept
   * this request.
   */
  await axios.post(
    `${API_BASE_URL}/api/auth/refresh`,
    {},
    {
      withCredentials: true,
      timeout: 15000,

      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );
}

/* =========================================================
   Response Interceptor
========================================================= */

authApi.interceptors.response.use(
  (response) => response,

  async (
    error: AxiosError<ApiErrorBody>,
  ) => {
    const originalRequest =
      error.config as
        | RetryRequestConfig
        | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      !shouldAttemptRefresh(
        originalRequest.url,
      )
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Multiple API requests could receive 401
       * simultaneously.
       *
       * Only ONE refresh request should be made.
       */
      if (!refreshPromise) {
        refreshPromise =
          refreshSessionCookie().finally(
            () => {
              refreshPromise = null;
            },
          );
      }

      await refreshPromise;

      /*
       * Refresh succeeded.
       *
       * Browser now has new HttpOnly cookies.
       * Retry original request.
       */
      return authApi.request(
        originalRequest,
      );
    } catch {
      return Promise.reject(error);
    }
  },
);

export async function loginWithPassword(
  input: PasswordLoginInput,
): Promise<AuthUser> {
  try {
    const response =
      await authApi.post<TokenResponse>(
        "/login/password",
        input,
      );

    return response.data.user;
  } catch (error) {
    throw getApiError(error);
  }
}

export async function requestLoginOtp(
  input: RequestOtpInput,
): Promise<string> {
  try {
    const response =
      await authApi.post<OtpResponse>(
        "/otp/request",
        input,
      );

    return response.data.message;
  } catch (error) {
    throw getApiError(error);
  }
}


export async function loginWithOtp(
  input: OtpLoginInput,
): Promise<AuthUser> {
  try {
    const response =
      await authApi.post<TokenResponse>(
        "/login/otp",
        input,
      );

    return response.data.user;
  } catch (error) {
    throw getApiError(error);
  }
}

export async function registerPatient(
  input: RegisterForm,
): Promise<AuthUser> {
  try {

    const response =
      await authApi.post<TokenResponse>(
        "/register",
        input,
      );

    return response.data.user;
  } catch (error) {

    throw getApiError(error);
  }
}


export async function restoreSession(): Promise<AuthUser | null> {
  try {
    const response =
      await authApi.get<SessionResponse>(
        "/me",
      );

    return response.data.user;
  } catch (error) {
    const authError =
      getApiError(error);

    if (
      authError.status === 401 ||
      authError.status === 403
    ) {
      return null;
    }

    throw authError;
  }
}

export async function logout(): Promise<void> {
  try {
    await authApi.post<LogoutResponse>(
      "/logout",
      {},
    );
  } catch (error) {
    throw getApiError(error);
  }
}

export default authApi;