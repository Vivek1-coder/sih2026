import { apiError, apiFetch } from './api';

export async function patientRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<T>;
}
export type Visit = {
  id: string; created_at: string; location: string; location_type: string;
  status: 'in_progress' | 'completed' | 'abandoned'; assigned_doctor_id: string | null;
  next_path: string; answers: { id: string; question_text: string; value: string; answered_at: string }[];
  prescriptions?: { id: string; doctor_id: string; issued_at: string; medication_ids: string[]; notes: string }[];
  documents?: ProfileDocument[];
};
export type SessionStatus = { resumable: boolean; session: Visit | null; latest_session?: Visit | null };
export type Medicine = {
  id: string; name: string; dosage: string; frequency: string; route: string;
  start_date: string; end_date: string | null; status: string; prescribed_by: string | null; notes: string;
};
export type ProfileDocument = {
  id: string; original_filename: string; document_type: string; uploaded_by_role: string;
  uploaded_by_id: string | null; uploaded_at: string; session_id: string | null;
};
export type AuditEvent = {
  id: string; event_type: string; timestamp: string; actor_role: string;
  actor_id: string | null; session_id: string | null; metadata: Record<string, unknown>;
};
export type MedicationSummary = {
  id: string; content: string; qr_image: string; generated_at: string; confirmed: boolean;
};
export type ProfileDetails = {
  id: string; full_name: string; date_of_birth: string; gender: string; contact_number: string;
  address: string; abha_id: string | null; blood_group: string; allergies: string[];
  emergency_contact: string | null; preferred_language: string;
};
export type PatientProfile = {
  profile: ProfileDetails; medications: Medicine[]; documents: ProfileDocument[];
  sessions: Visit[]; medication_summary: MedicationSummary | null; audit_log: AuditEvent[];
};
export const getSessionStatus = () => patientRequest<SessionStatus>('/api/patient/session-status');
export async function finishDocuments() {
  const { session } = await getSessionStatus();
  if (!session) throw new Error('No active visit');
  return patientRequest<Visit>(`/api/patient/sessions/${session.id}/documents-complete`, { method: 'POST' });
}
