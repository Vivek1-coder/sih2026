import { formatNumber } from "../i18n";
import { errorText } from "../i18n";
import Loader from "../components/common/Loader";
import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  Play,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import PatientShell from "../components/common/patientShell";
import PriorityBadge from "../components/common/priorityBadge";
import useAuth from "../hooks/useAuth";
import useAccessibility from "../hooks/useAccessibility";
import useSpeech from "../hooks/useSpeech";
import { listDocuments } from "../services/documents";
import { generateSummary, updateSummary } from "../services/summary";
import type { UploadedDocument } from "../types/document.type";
import type { Priority } from "../types/priority.type";
import type { ClinicalSummary } from "../types/summary.type";
import { useNavigate } from "react-router-dom";

function displayPriority(priority: ClinicalSummary["priority"]): Priority {
  return priority === "urgent"
    ? "Urgent"
    : priority === "priority"
      ? "Priority"
      : "Routine";
}

export default function Summary() {
  useTranslation();
  const { user } = useAuth();
  const { t, language } = useAccessibility();
  const [retryCount, setRetryCount] = useState(0);
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [readbackLanguage, setReadbackLanguage] = useState(language);
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const speech = useSpeech(readbackLanguage);
  const stopSummarySpeech = speech.stopSpeaking;
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setSummary(null);
    setError("");
    setReadbackLanguage(language);
    Promise.all([generateSummary(), listDocuments()])
      .then(([generated, loadedDocuments]) => {
        if (!active) return;
        setSummary(generated);
        setDocuments(loadedDocuments);
        setReviewed(current => current || Boolean(generated.patient_acknowledged_at));
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "errors:unable_to_generate_summary",
          );
      });
    return () => {
      active = false;
      stopSummarySpeech();
    };
  }, [stopSummarySpeech, language, retryCount]);

  const languageChoices = useMemo(() => {
    if (!summary) return ["en-IN"];
    return Object.keys(summary.readbacks);
  }, [summary]);
  const readback =
    summary?.readbacks[readbackLanguage] ?? summary?.readbacks["en-IN"] ?? "";

  const acknowledge = async () => {
    if (!summary || !reviewed || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const updated = await updateSummary(summary.id, {
        patient_acknowledged: true,
      });
      setSummary(updated);
      navigate("/patient/complete");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "errors:unable_to_submit_summary",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const download = () => {
    if (!summary) return;
    const content = Object.entries(summary.sections)
      .map(([title, value]) => `${ui(title)}\n${value}`)
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([`${ui("summary:disclaimer")}\n\n${content}`], { type: "text/plain" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "clinical-history-draft.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PatientShell active="Summarize">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("summary.eyebrow")}</span>
          <h1>{t("summary.title")}</h1>
          <p>{ui("summary:review_and_listen_before_sharing_this_draft_with")}</p>
        </div>
        <span className="ai-disclaimer">
          <Sparkles size={15} />{ui("summary:aidrafted_not_a_diagnosis_physician_confirmation_required")}</span>
      </section>

      {error && (
        <div className="form-error summary-error" role="alert">
          {errorText(error)}
          <button onClick={() => setRetryCount(n => n + 1)}>{ui("common:retry")}</button>
        </div>
      )}

      {!summary && !error && (
        <Loader fullPage label="summary:generating_your_structured_draft" />
      )}

      {summary && (
        <div className="summary-layout">
          <div>
            <div className="card identity-card">
              <div className="avatar large-avatar">
                {(user?.display_name ?? ui("summary:demo_patient"))
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h2>{user?.display_name ?? ui("summary:demo_patient")}</h2>
                <p>{ui("summary:historyVersion", { version: formatNumber(summary.version) })}</p>
              </div>
              <PriorityBadge priority={displayPriority(summary.priority)} />
            </div>

            <div className="card bilingual-readback">
              <div className="card-title">
                <div>
                  <h2>{ui("summary:bilingual_readback")}</h2>
                  <p className="muted">{ui("summary:listen_in_english_or_your_selected_language_before")}</p>
                </div>
                <Volume2 size={20} />
              </div>
              <div className="readback-tabs">
                {languageChoices.map((language) => (
                  <button
                    className={readbackLanguage === language ? "active" : ""}
                    key={language}
                    onClick={() => {
                      speech.stopSpeaking();
                      setReadbackLanguage(language);
                    }}
                  >
                    {language === "en-IN"
                      ? ui("summary:english")
                      : `Preferred · ${language}`}
                  </button>
                ))}
              </div>
              <p className="readback-text">{readback}</p>
              <button
                className="button secondary"
                onClick={() =>
                  speech.speaking
                    ? speech.stopSpeaking()
                    : speech.speak(readback)
                }
              >
                <Play size={17} />{" "}
                {speech.speaking ? ui("summary:stop_readback") : ui("summary:play_audio_readback")}
              </button>
            </div>

            <div className="summary-sections">
              {Object.entries(summary.sections).map(([title, text]) => (
                <div className="card summary-section" key={title}>
                  <div>
                    <h3>{ui(title)}</h3>
                    <p>{text}</p>
                    <small>{ui("summary:drafted_from_patient_answers_and_available_document_extractions")}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="card timeline">
              <div className="card-title">
                <h2>{ui("summary:document_timeline")}</h2>
                <span className="count-badge">{ui("summary:fileCount", { count: documents.length, value: formatNumber(documents.length) })}</span>
              </div>
              {documents
                .filter((document) => document.extraction)
                .map((document) => (
                  <div className="timeline-item" key={document.id}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>
                        {document.document_date ?? ui("summary:date_unknown")} ·{" "}
                        {document.extraction?.document_type}
                      </strong>
                      <p>{document.extraction?.raw_summary}</p>
                    </div>
                  </div>
                ))}
              {!documents.length && (
                <p className="muted">{ui("summary:no_documents_were_supplied")}</p>
              )}
            </div>
          </div>

          <aside className="routing">
            <div className="card">
              <h3>{ui("summary:ready_to_share")}</h3>
              <p className="muted">{ui("summary:acknowledgement_submits_a_draft_only_a_physician_can")}</p>
              {[
                ["summary:summary_generated", true],
                ["summary:patient_readback", Boolean(summary.patient_acknowledged_at)],
                ["summary:physician_review", summary.status === "confirmed"],
              ].map(([label, complete]) => (
                <div className="route-row" key={String(label)}>
                  <span
                    className={complete ? "route-icon complete" : "route-icon"}
                  >
                    {complete ? <Check size={14} /> : <Clock3 size={14} />}
                  </span>
                  <span>{ui(String(label))}</span>
                  <em>{complete ? ui("summary:done") : ui("summary:pending")}</em>
                </div>
              ))}
              <label className="summary-acknowledgement">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                <span>{ui("summary:i_reviewed_the_draft_and_understand_a_physician")}</span>
              </label>
              <button
                className="button primary full"
                onClick={acknowledge}
                disabled={!reviewed || submitting}
              >
                {submitting ? <Loader label="summary:submitting" /> : ui("summary:acknowledge_and_submit")}{" "}
                <ArrowRight size={17} />
              </button>
              <button
                className="button text-button full"
                onClick={() => navigate("/patient/interview")}
              >{ui("summary:go_back_and_edit_answers")}</button>
            </div>
            <button className="download-button" onClick={download}>
              <FileText size={17} />{ui("summary:download_marked_draft")}</button>
          </aside>
        </div>
      )}
    </PatientShell>
  );
}
