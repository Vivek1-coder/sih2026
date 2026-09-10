import { patientRequest } from './patient';
import { uploadDocumentFile } from './documents';

export type IdentifierType = 'aadhaar' | 'abha' | 'email' | 'phone';
export type LabPatient = {
  id: string; full_name: string; date_of_birth: string; gender: string; address: string;
  mobile: string | null; email: string | null; aadhaar_masked: string | null; abha_id: string | null;
  processing_consent: boolean;
};
export type Demographics = Pick<LabPatient, 'full_name' | 'date_of_birth' | 'gender' | 'address' | 'mobile' | 'email'>;
export type LabMatch = { patient: LabPatient | null; matched: boolean; created?: boolean };
export type LabReport = {
  processing_stage?: 'processing' | 'extracting' | 'done' | 'failed';
  id: string; patient_id: string; original_filename: string; status: 'pending' | 'processing' | 'done' | 'failed';
  uploaded_at: string; error: string | null;
};
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
export const lookupLabPatient = (identifier_type: IdentifierType, identifier: string) =>
  patientRequest<LabMatch>('/api/lab/patients/lookup', post({ identifier_type, identifier }));
export const registerLabPatient = (identifier_type: IdentifierType, identifier: string, details: Demographics) =>
  patientRequest<LabMatch>('/api/lab/patients', post({ identifier_type, identifier, ...details }));
export const verifyLabPatient = (patientId: string, details: Demographics, processing_consent: boolean, details_confirmed: boolean) =>
  patientRequest<{ patient: LabPatient; verification_id: string }>(`/api/lab/patients/${patientId}/verify`, post({ ...details, processing_consent, details_confirmed }));
export const uploadLabReport = (patientId: string, verificationId: string, file: File) =>
  uploadDocumentFile<LabReport>(`/api/lab/patients/${patientId}/reports`, file, { verification_id: verificationId });
export const getLabReport = (id: string) => patientRequest<LabReport>(`/api/lab/reports/${encodeURIComponent(id)}`);
