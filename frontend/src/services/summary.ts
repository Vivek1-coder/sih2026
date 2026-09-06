import { apiError, apiFetch } from "./api";
import type { ClinicalSummary } from "../types/summary.type";

export async function generateSummary(): Promise<ClinicalSummary> {
  const response = await apiFetch("/api/summary/generate", { method: "POST" });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ClinicalSummary>;
}

export async function getCurrentSummary(): Promise<ClinicalSummary | null> {
  const response = await apiFetch("/api/summary/current");
  if (response.status === 404 || response.status === 401) return null;
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ClinicalSummary>;
}

export async function updateSummary(
  summaryId: string,
  changes: {
    sections?: Record<string, string>;
    status?: "draft" | "confirmed";
    patient_acknowledged?: boolean;
  },
  physician = false,
): Promise<ClinicalSummary> {
  const response = await apiFetch(physician ? `/api/physician/summary/${summaryId}` : `/api/summary/${summaryId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ClinicalSummary>;
}
