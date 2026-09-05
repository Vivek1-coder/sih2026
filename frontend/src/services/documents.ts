import { apiError, apiFetch } from "./api";
import type { DocumentUrl, UploadedDocument } from "../types/document.type";

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

/**
 * Fetch a short-lived presigned URL for the document.
 * Use the returned `url` to open a PDF in a new tab or render an image inline.
 * @param expiresIn  Seconds until the URL expires (default 3600 = 1 hour).
 */
export async function getDocumentUrl(
  documentId: string,
  expiresIn = 3600,
): Promise<DocumentUrl> {
  const response = await apiFetch(
    `/api/documents/${documentId}/url?expires_in=${expiresIn}`,
  );
  if (!response.ok) throw await apiError(response);
  return response.json() as Promise<DocumentUrl>;
}

/**
 * Trigger a browser download by proxying the file bytes through the API.
 * No presigned URL is ever exposed — the backend streams the bytes directly.
 */
export async function downloadDocument(
  documentId: string,
  filename: string,
): Promise<void> {
  const response = await apiFetch(`/api/documents/${documentId}/download`);
  if (!response.ok) throw await apiError(response);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Clean up the object URL after the download is handed off to the browser
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
