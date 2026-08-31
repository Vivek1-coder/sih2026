export type QuestionOption = {
  value: string;
  label: string;
  icon?: string;
};

export type InterviewQuestion = {
  id: string;
  text: string;
  section: string;
  input_type: "single_choice" | "free_text" | "scale";
  options: QuestionOption[];
  required: boolean;
  source: "ontology" | "llm_fallback";
};

export type InterviewAnswer = {
  id: string;
  question_id: string;
  question_text: string;
  section: string;
  value: string;
  input_mode: "voice" | "touch" | "text";
  answered_at: string;
};

export type RedFlagAlert = {
  id: string;
  rule_id: string;
  reason: string;
  priority: "routine" | "priority" | "urgent";
  evidence: string[];
  created_at: string;
};

export type InterviewSession = {
  id: string;
  patient_id: string;
  preferred_language: string;
  department: string | null;
  status: "active" | "completed";
  priority: "routine" | "priority" | "urgent";
  progress: number;
  current_question: InterviewQuestion | null;
  answers: InterviewAnswer[];
  alerts: RedFlagAlert[];
  triage_required: boolean;
};
