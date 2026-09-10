const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function getApiBaseUrl(): string {
  const apiUrl = new URL(configuredApiBaseUrl);

  if (typeof window !== "undefined") {
    const browserHost = window.location.hostname;
    const isLoopbackHost =
      browserHost === "localhost" ||
      browserHost === "127.0.0.1";
    const isConfiguredLoopback =
      apiUrl.hostname === "localhost" ||
      apiUrl.hostname === "127.0.0.1";

    if (isLoopbackHost && isConfiguredLoopback) {
      apiUrl.hostname = browserHost;
    }
  }

  return apiUrl.toString().replace(/\/$/, "");
}
