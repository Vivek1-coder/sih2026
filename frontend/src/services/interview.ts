import { apiError, apiFetch } from "./api";
import type { InterviewSession } from "../types/interview.type";

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
): Promise<InterviewSession> {
  const response = await apiFetch(`/api/interview/session/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, answer }),
  });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<InterviewSession>;
}
