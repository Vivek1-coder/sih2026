import { apiError, apiFetch } from "./api";
import type { InterviewQuestion, InterviewSession } from "../types/interview.type";

export type InputMode = "voice" | "touch" | "text";

export async function startInterview(): Promise<InterviewSession> {
  const response = await apiFetch("/api/interview/session", { method: "POST" });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<InterviewSession>;
}

export async function getCurrentInterview(): Promise<InterviewSession> {
  const response = await apiFetch("/api/interview/session/current");
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<InterviewSession>;
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  answer: string,
  inputMode: InputMode = "touch",
): Promise<InterviewSession> {
  const response = await apiFetch(`/api/interview/session/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, answer, input_mode: inputMode }),
  });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<InterviewSession>;
}

export async function getNextQuestion(
  sessionId: string,
): Promise<InterviewQuestion | null> {
  const response = await apiFetch(`/api/interview/session/${sessionId}/next-question`);
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<InterviewQuestion | null>;
}

export async function getProgress(
  sessionId: string,
): Promise<{ progress: number; status: string }> {
  const response = await apiFetch(`/api/interview/session/${sessionId}/progress`);
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<{ progress: number; status: string }>;
}
