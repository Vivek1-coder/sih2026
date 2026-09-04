import { apiError, apiFetch } from "./api";
import type {
  ConsentChoices,
  ConsentRecord,
  ConsentStatus,
} from "../types/consent.type";

export async function getConsent(): Promise<ConsentRecord | null> {
  const response = await apiFetch("/api/consent");
  if (response.status === 404) return null;
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ConsentRecord>;
}

export async function getConsentStatus(): Promise<ConsentStatus> {
  const response = await apiFetch("/api/consent/status");
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ConsentStatus>;
}

export async function saveConsent(
  preferredLanguage: string,
  choices: ConsentChoices,
): Promise<ConsentRecord> {
  const response = await apiFetch("/api/consent", {
    method: "POST",
    body: JSON.stringify({ preferred_language: preferredLanguage, choices }),
  });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ConsentRecord>;
}

export async function revokeConsent(): Promise<ConsentRecord> {
  const response = await apiFetch("/api/consent/revoke", { method: "POST" });
  if (!response.ok) throw await apiError(response);
  const payload = (await response.json()) as { record: ConsentRecord };
  return payload.record;
}
