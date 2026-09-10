import { getApiBaseUrl } from "./baseUrl";

const API_BASE_URL = getApiBaseUrl();

type ApiErrorBody = {
  detail?: string | Array<{ msg?: string }>;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshRequest: Promise<boolean> | null = null;

async function refreshAccess(): Promise<boolean> {
  refreshRequest ??= fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .finally(() => {
      refreshRequest = null;
    });
  return refreshRequest;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  if (response.status === 401 && retry && (await refreshAccess())) {
    return apiFetch(path, init, false);
  }
  return response;
}

export async function apiError(response: Response): Promise<ApiError> {
  let message = "The request could not be completed.";
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === "string") message = body.detail;
    if (Array.isArray(body.detail)) {
      message = body.detail.map((item) => item.msg).filter(Boolean).join(" ") || message;
    }
  } catch {
    // Keep the safe fallback for non-JSON responses.
  }
  return new ApiError(message, response.status);
}
