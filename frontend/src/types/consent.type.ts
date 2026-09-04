export type ConsentChoices = {
  medical_history: boolean;
  ai_assistance: boolean;
  document_processing: boolean;
  physician_sharing: boolean;
  abha_linking: boolean;
  privacy_notice: boolean;
};

export type ConsentRecord = {
  id: string;
  patient_id: string;
  preferred_language: string;
  choices: ConsentChoices;
  status: "active" | "revoked";
  version: number;
  required_granted: boolean;
  granted_at: string;
  updated_at: string;
  revoked_at: string | null;
};

export type ConsentStatus = {
  exists: boolean;
  active: boolean;
  required_granted: boolean;
  preferred_language: string;
};
