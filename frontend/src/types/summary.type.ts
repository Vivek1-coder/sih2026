export type ClinicalSummary = {
  id: string;
  patient_id: string;
  interview_session_id: string;
  sections: Record<string, string>;
  readbacks: Record<string, string>;
  preferred_language: string;
  source_document_ids: string[];
  priority: "routine" | "priority" | "urgent";
  status: "draft" | "confirmed";
  patient_acknowledged_at: string | null;
  confirmed_at: string | null;
  version: number;
  disclaimer: string;
  created_at: string;
  updated_at: string;
};
