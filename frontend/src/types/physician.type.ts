import type { UploadedDocument } from "./document.type";
import type { InterviewSession } from "./interview.type";
import type { ClinicalSummary } from "./summary.type";

export type QueuePatient = {
  session_id: string;
  location: string;
  doctor_id: string | null;
  doctor_name: string | null;
  patient_id: string;
  summary_id: string;
  token: string;
  display_name: string;
  complaint: string;
  department: string;
  priority: "routine" | "priority" | "urgent";
  red_flags: string[];
  document_count: number;
  summary_status: string;
  queue_position: number;
  estimated_wait_minutes: number;
};

export type ABDMPush = {
  summary_id: string;
  bundle_id: string;
  status: string;
  pushed_at: string;
  mock: true;
};

export type PhysicianPatientSummary = {
  queue: QueuePatient;
  summary: ClinicalSummary;
  interview: InterviewSession;
  documents: UploadedDocument[];
  abdm: ABDMPush | null;
  metadata: { ai_generated: boolean; requires_physician_confirmation: boolean };
};
