import { apiError, apiFetch } from "./api";
import type { PhysicianPatientSummary, QueuePatient } from "../types/physician.type";

export async function getPhysicianQueue(): Promise<QueuePatient[]> {
  const response = await apiFetch("/api/physician/queue");
  if (!response.ok) throw await apiError(response);
  return ((await response.json()) as { patients: QueuePatient[] }).patients;
}

export async function getMyQueueStatus(): Promise<QueuePatient> {
  const response = await apiFetch("/api/physician/queue/me");
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<QueuePatient>;
}

export async function getPhysicianPatientSummary(patientId: string): Promise<PhysicianPatientSummary> {
  const response = await apiFetch(`/api/physician/patient/${encodeURIComponent(patientId)}/summary`);
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<PhysicianPatientSummary>;
}
