import { errorText } from "../../i18n";
import Skeleton from "./Skeleton";
import ProgressIndicator from "./ProgressIndicator";
import Loader from "./Loader";
import { useTranslation } from 'react-i18next';
import { locale, formatNumber } from "../../i18n";
import { ui } from "../../i18n";
import DocumentFilePicker from "./DocumentFilePicker";
import { finishDocuments } from "../../services/patient";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  Download,
  Eye,
  FileText,
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
    ? `${formatNumber(bytes / 1024 / 1024, { maximumFractionDigits: 1 })} MB`
    : `${formatNumber(Math.ceil(bytes / 1024))} KB`;
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(locale(), { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
    : ui("common:unknownDate");
}

export default function Documents() {
  useTranslation();
  const { t } = useAccessibility();
  const [documentType, setDocumentType] = useState("other");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [documentConsent, setDocumentConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Track per-document loading states for view/download actions
  const [actionLoading, setActionLoading] = useState<Record<string, "view" | "download" | "delete" | null>>({});
  const cameraInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    const latest = await listDocuments();
    setDocuments(latest);
  }, []);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setLoading(true);
    setError("");
    Promise.all([getConsent(), listDocuments()])
      .then(([consent, loadedDocuments]) => {
        if (!active) return;
        setDocumentConsent(Boolean(consent?.status === "active" && consent.choices.document_processing));
        setDocuments(loadedDocuments);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "errors:unable_to_load_documents");
      }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [retryCount]);

  const processing = documents.some(document => document.status === "pending" || document.status === "processing");
  useEffect(() => {
    if (!processing || error) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 120000;
    const poll = async () => {
      try {
        const latest = await listDocuments();
        if (!active) return;
        setDocuments(latest);
        if (latest.some(d => d.status === 'pending' || d.status === 'processing')) {
          if (Date.now() >= deadline) setError('errors:timeout');
          else timer = setTimeout(poll, 1500);
        }
      } catch { if (active) setError('errors:requestFailed'); }
    };
    timer = setTimeout(poll, 1500);
    return () => { active = false; clearTimeout(timer); };
  }, [processing, error, retryCount]);

  const addFiles = async (incoming: FileList | File[]) => {
    if (uploading || loading) return;
    const files = Array.from(incoming);
    setError("");
    if (!documentConsent) {
      setError("errors:enable_optional_documentprocessing_consent_before_uploading");
      return;
    }
    const invalid = files.find((file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_BYTES);
    if (invalid) {
      setError("errors:invalidFile");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadDocument(file, documentType)));
      setDocuments((current) => [...uploaded, ...current]);
      await refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "errors:upload_failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (documentId: string) => {
    if (actionLoading[documentId]) return;
    setError("");
    setActionLoading(prev => ({...prev, [documentId]: "delete"}));
    try {
      await deleteDocument(documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "errors:unable_to_remove_document");
    } finally { setActionLoading(prev => ({...prev, [documentId]: null})); }
  };

  const view = async (documentId: string) => {
    setError("");
    setActionLoading((prev) => ({ ...prev, [documentId]: "view" }));
    try {
      const { url } = await getDocumentUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "errors:unable_to_generate_view_link");
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
      setError(downloadError instanceof Error ? downloadError.message : "errors:unable_to_download_document");
    } finally {
      setActionLoading((prev) => ({ ...prev, [documentId]: null }));
    }
  };



  return (
    <PatientShell active="Scan">
      <label className="continuity-form">{t("patient.documents")}
        <select value={documentType} onChange={event => setDocumentType(event.target.value)}>
          {["lab_report", "prescription", "other"].map(value => <option key={value} value={value}>{t(`document.${value}`)}</option>)}
        </select>
      </label>
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("documents.eyebrow")}</span>
          <h1>{t("documents.title")}</h1>
          <p>{ui("documents:mock_ocr_structures_each_file_locally_and_flags")}</p>
        </div>
      </section>

      {!documentConsent && (
        <div className="consent-warning document-consent-warning" role="status">
          <AlertTriangle size={17} />
          <span>{ui("documents:document_processing_is_optional_and_currently_off")}</span>
          <button onClick={() => navigate("/patient/consent")}>{ui("documents:review_consent")}</button>
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
          <h2>{ui("documents:drop_documents_here")}</h2>
          <p>{ui("documents:or_choose_files_from_your_device")}</p>
          <small>{ui("documents:pdf_jpg_jpeg_or_png_up_to_10")}</small>
          <DocumentFilePicker multiple disabled={!documentConsent || uploading || loading} label={uploading ? ui("documents:uploading") : ui("documents:browse_files")} onFiles={addFiles}/>
          <input
            ref={cameraInput}
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => event.target.files && addFiles(event.target.files)}
          />
          <button
            className="camera-button"
            disabled={!documentConsent || uploading || loading}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera size={17} />{ui("documents:capture_with_camera")}</button>
        </div>

        <div className="card files-card">
          <div className="card-title">
            <h2>{ui("documents:your_documents")}<span className="count-badge">{documents.length}</span></h2>
            {processing && <span className="processing"><Loader className="spin" size={14} />{ui("documents:ocr_running")}</span>}
          </div>
          {loading && <Skeleton />}
          {uploading && <ProgressIndicator stage="uploading" />}
          {documents.map((document) => (
            <div className="file-row" key={document.id}>
              <div className="file-type"><FileText size={18} /></div>
              <div className="file-meta">
                <strong>{document.original_filename}</strong>
                <span>{formatBytes(document.size_bytes)} · {formatDate(document.document_date)}</span>
              </div>
              {document.status === "done" ? (
                <span className="file-check"><Check size={14} />{ui("documents:ready")}</span>
              ) : document.status === "failed" ? (
                <span className="status-failed">{ui("documents:failed")}</span>
              ) : (
                <ProgressIndicator stage={document.processing_stage === "extracting" ? "extracting" : "processing"} failed={Boolean(error)} />
              )}
              {/* View in browser */}
              <button
                className="remove-file"
                aria-label={ui("common:fileAction", { action: ui("common:view"), filename: document.original_filename })}
                title={ui("documents:view_in_browser")}
                disabled={Boolean(actionLoading[document.id])}
                onClick={() => view(document.id)}
              >
                {actionLoading[document.id] === "view"
                  ? <Loader className="spin" size={15} />
                  : <Eye size={15} />}
              </button>
              {/* Download */}
              <button
                className="remove-file"
                aria-label={ui("common:fileAction", { action: ui("common:download"), filename: document.original_filename })}
                title={ui("documents:download")}
                disabled={Boolean(actionLoading[document.id])}
                onClick={() => download(document.id, document.original_filename)}
              >
                {actionLoading[document.id] === "download"
                  ? <Loader className="spin" size={15} />
                  : <Download size={15} />}
              </button>
              {/* Delete */}
              <button className="remove-file" aria-label={ui("common:fileAction", { action: ui("common:remove"), filename: document.original_filename })} disabled={Boolean(actionLoading[document.id])} onClick={() => remove(document.id)}>
                {actionLoading[document.id] === "delete" ? <Loader /> : <X size={16} />}
              </button>
            </div>
          ))}
          {!loading && !documents.length && (
            <div className="empty-state"><FileText size={25} /><p>{ui("documents:no_documents_added_you_can_continue_without_them")}</p></div>
          )}
          {error && <div className="form-error" role="alert">{errorText(error)}<button className="button secondary" onClick={() => { setError(""); setRetryCount(n => n + 1); }}>{ui("common:retry")}</button></div>}
        </div>
      </div>

      {documents.some((document) => document.extraction) && (
        <section className="document-timeline">
          <div className="card-title">
            <div><span className="eyebrow">{ui("documents:chronological_extraction")}</span><h2>{ui("documents:medical_document_timeline")}</h2></div>
            <span className="ai-pill"><Sparkles size={13} />{ui("documents:mock_ocr_verify_originals")}</span>
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
                          <strong>{formatNumber(lab.value)} {lab.unit}</strong>
                          <small>{lab.abnormal ? `${lab.flag.toUpperCase()} · ` : ""}{ui("documents:ref")}{formatNumber(lab.reference_low)}–{formatNumber(lab.reference_high)}</small>
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
          <ChevronLeft size={17} />{ui("documents:back")}</button>
        <button className="button primary" onClick={async () => { if (finishing) return; setFinishing(true); try { await finishDocuments(); navigate("/patient/summary"); } catch (reason) { setError(reason instanceof Error ? reason.message : "errors:unable_to_continue"); } finally { setFinishing(false); } }} disabled={finishing || loading || processing || uploading}>{finishing ? <Loader /> : ui("documents:review_my_summary")}<ArrowRight size={17} />
        </button>
      </div>
    </PatientShell>
  );
}
