import { apiError, apiFetch } from "./api";
import type { ABDMPush } from "../types/physician.type";

export async function pushSummaryToABDM(summaryId: string): Promise<ABDMPush> {
  const response = await apiFetch(`/api/abdm/push/${summaryId}`, { method: "POST" });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<ABDMPush>;
}
