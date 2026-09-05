import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getConsent } from "../../services/consent";
import {
  deleteDocument,
  downloadDocument,
  getDocumentUrl,
  listDocuments,
  uploadDocument,
} from "../../services/documents";
import type { UploadedDocument } from "../../types/document.type";
import useAccessibility from "../../hooks/useAccessibility";
import PatientShell from "./patientShell";
import { useNavigate } from "react-router-dom";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
    : "Date being inferred";
}

export default function Documents() {
  const { t } = useAccessibility();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentConsent, setDocumentConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Track per-document loading states for view/download actions
  const [actionLoading, setActionLoading] = useState<Record<string, "view" | "download" | null>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    const latest = await listDocuments();
    setDocuments(latest);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getConsent(), listDocuments()])
      .then(([consent, loadedDocuments]) => {
        if (!active) return;
        setDocumentConsent(Boolean(consent?.status === "active" && consent.choices.document_processing));
        setDocuments(loadedDocuments);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load documents.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!documents.some((document) => document.status === "pending" || document.status === "processing")) return;
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 900);
    return () => window.clearInterval(timer);
  }, [documents, refresh]);

  const addFiles = async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    setError("");
    if (!documentConsent) {
      setError("Enable optional document-processing consent before uploading.");
      return;
    }
    const invalid = files.find((file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_BYTES);
    if (invalid) {
      setError(`${invalid.name} must be a PDF/JPG/PNG no larger than 10 MB.`);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadDocument(file)));
      setDocuments((current) => [...uploaded, ...current]);
      await refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (documentId: string) => {
    setError("");
    try {
      await deleteDocument(documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove document.");
    }
  };

  const view = async (documentId: string) => {
    setError("");
    setActionLoading((prev) => ({ ...prev, [documentId]: "view" }));
    try {
      const { url } = await getDocumentUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Unable to generate view link.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [documentId]: null }));
    }
  };

  const download = async (documentId: string, filename: string) => {
    setError("");
    setActionLoading((prev) => ({ ...prev, [documentId]: "download" }));
    try {
      await downloadDocument(documentId, filename);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download document.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [documentId]: null }));
    }
  };

  const processing = documents.some((document) => document.status === "pending" || document.status === "processing");

  return (
    <PatientShell active="Scan">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("documents.eyebrow")}</span>
          <h1>{t("documents.title")}</h1>
          <p>Mock OCR structures each file locally and flags lab values outside simple reference ranges.</p>
        </div>
      </section>

      {!documentConsent && (
        <div className="consent-warning document-consent-warning" role="status">
          <AlertTriangle size={17} />
          <span>Document processing is optional and currently off.</span>
          <button onClick={() => navigate("/patient/consent")}>Review consent</button>
        </div>
      )}

      <div className="document-layout">
        <div
          className={`card uploader ${dragging ? "dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <div className="upload-icon"><Paperclip size={22} /></div>
          <h2>Drop documents here</h2>
          <p>or choose files from your device</p>
          <small>PDF, JPG, JPEG or PNG · up to 10 MB each</small>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            multiple
            onChange={(event) => event.target.files && addFiles(event.target.files)}
          />
          <input
            ref={cameraInput}
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => event.target.files && addFiles(event.target.files)}
          />
          <button
            className="button secondary"
            disabled={!documentConsent || uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? <LoaderCircle className="spin" size={17} /> : <Paperclip size={17} />}
            {uploading ? "Uploading…" : "Browse files"}
          </button>
          <button
            className="camera-button"
            disabled={!documentConsent || uploading}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera size={17} /> Capture with camera
          </button>
        </div>

        <div className="card files-card">
          <div className="card-title">
            <h2>Your documents <span className="count-badge">{documents.length}</span></h2>
            {processing && <span className="processing"><LoaderCircle className="spin" size={14} /> OCR running</span>}
          </div>
          {documents.map((document) => (
            <div className="file-row" key={document.id}>
              <div className="file-type"><FileText size={18} /></div>
              <div className="file-meta">
                <strong>{document.original_filename}</strong>
                <span>{formatBytes(document.size_bytes)} · {formatDate(document.document_date)}</span>
              </div>
              {document.status === "done" ? (
                <span className="file-check"><Check size={14} /> Ready</span>
              ) : document.status === "failed" ? (
                <span className="status-failed">Failed</span>
              ) : (
                <span className="processing"><LoaderCircle className="spin" size={13} /> {document.status}</span>
              )}
              {/* View in browser */}
              <button
                className="remove-file"
                aria-label={`View ${document.original_filename}`}
                title="View in browser"
                disabled={actionLoading[document.id] === "view"}
                onClick={() => view(document.id)}
              >
                {actionLoading[document.id] === "view"
                  ? <LoaderCircle className="spin" size={15} />
                  : <Eye size={15} />}
              </button>
              {/* Download */}
              <button
                className="remove-file"
                aria-label={`Download ${document.original_filename}`}
                title="Download"
                disabled={actionLoading[document.id] === "download"}
                onClick={() => download(document.id, document.original_filename)}
              >
                {actionLoading[document.id] === "download"
                  ? <LoaderCircle className="spin" size={15} />
                  : <Download size={15} />}
              </button>
              {/* Delete */}
              <button className="remove-file" aria-label={`Remove ${document.original_filename}`} onClick={() => remove(document.id)}>
                <X size={16} />
              </button>
            </div>
          ))}
          {!documents.length && (
            <div className="empty-state"><FileText size={25} /><p>No documents added. You can continue without them.</p></div>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
      </div>

      {documents.some((document) => document.extraction) && (
        <section className="document-timeline">
          <div className="card-title">
            <div><span className="eyebrow">Chronological extraction</span><h2>Medical document timeline</h2></div>
            <span className="ai-pill"><Sparkles size={13} /> Mock OCR · verify originals</span>
          </div>
          {documents.filter((document) => document.extraction).map((document) => {
            const extraction = document.extraction;
            if (!extraction) return null;
            return (
              <article className="card extracted-document" key={document.id}>
                <div className="timeline-date"><strong>{formatDate(extraction.document_date)}</strong><span>{extraction.document_type}</span></div>
                <div className="extraction-content">
                  <h3>{document.original_filename}</h3>
                  <p>{extraction.raw_summary}</p>
                  <div className="extraction-tags">
                    {extraction.diagnoses.map((item) => <span key={item}>{item}</span>)}
                    {extraction.medications.map((item) => <span key={item}>💊 {item}</span>)}
                  </div>
                  {extraction.lab_values.length > 0 && (
                    <div className="lab-grid">
                      {extraction.lab_values.map((lab) => (
                        <div className={lab.abnormal ? "lab-value abnormal" : "lab-value"} key={lab.name}>
                          <span>{lab.name}</span>
                          <strong>{lab.value} {lab.unit}</strong>
                          <small>{lab.abnormal ? `${lab.flag.toUpperCase()} · ` : ""}Ref {lab.reference_low}–{lab.reference_high}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="bottom-actions">
        <button className="button secondary" onClick={() => navigate("/patient/interview")}>
          <ChevronLeft size={17} /> Back
        </button>
        <button className="button primary" onClick={() => navigate("/patient/summary")} disabled={processing || uploading}>
          Review my summary <ArrowRight size={17} />
        </button>
      </div>
    </PatientShell>
  );
}
