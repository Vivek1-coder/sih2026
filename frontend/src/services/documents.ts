import { apiError, apiFetch } from "./api";
import type { UploadedDocument } from "../types/document.type";

export async function listDocuments(): Promise<UploadedDocument[]> {
  const response = await apiFetch("/api/documents");
  if (!response.ok) throw await apiError(response);
  const payload = (await response.json()) as { documents: UploadedDocument[] };
  return payload.documents;
}

export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file);
  const response = await apiFetch("/api/documents/upload", {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<UploadedDocument>;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await apiFetch(`/api/documents/${documentId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await apiError(response);
}
