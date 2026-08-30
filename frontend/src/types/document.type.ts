export type LabValue = {
  name: string;
  value: number;
  unit: string;
  reference_low: number;
  reference_high: number;
  abnormal: boolean;
  flag: "low" | "normal" | "high";
};

export type ExtractedDocument = {
  document_type: string;
  document_date: string;
  facility: string;
  diagnoses: string[];
  medications: string[];
  investigations: string[];
  lab_values: LabValue[];
  raw_summary: string;
  extracted_at: string;
};

export type UploadedDocument = {
  id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  status: "pending" | "processing" | "done" | "failed";
  document_date: string | null;
  extraction: ExtractedDocument | null;
  error: string | null;
  uploaded_at: string;
  updated_at: string;
};
