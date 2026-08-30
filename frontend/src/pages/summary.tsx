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
  const { user } = useAuth();
  const { t } = useAccessibility();
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [readbackLanguage, setReadbackLanguage] = useState("en-IN");
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const speech = useSpeech(readbackLanguage);
  const stopSummarySpeech = speech.stopSpeaking;
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    Promise.all([generateSummary(), listDocuments()])
      .then(([generated, loadedDocuments]) => {
        if (!active) return;
        setSummary(generated);
        setDocuments(loadedDocuments);
        setReviewed(Boolean(generated.patient_acknowledged_at));
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to generate summary.",
          );
      });
    return () => {
      active = false;
      stopSummarySpeech();
    };
  }, [stopSummarySpeech]);

  const languageChoices = useMemo(() => {
    if (!summary) return ["en-IN"];
    return Object.keys(summary.readbacks);
  }, [summary]);
  const readback =
    summary?.readbacks[readbackLanguage] ?? summary?.readbacks["en-IN"] ?? "";

  const acknowledge = async () => {
    if (!summary || !reviewed) return;
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
          : "Unable to submit summary.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const download = () => {
    if (!summary) return;
    const content = Object.entries(summary.sections)
      .map(([title, value]) => `${title}\n${value}`)
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([`${summary.disclaimer}\n\n${content}`], { type: "text/plain" }),
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
          <p>
            Review and listen before sharing this draft with your assigned care
            team.
          </p>
        </div>
        <span className="ai-disclaimer">
          <Sparkles size={15} /> AI-drafted · not a diagnosis · physician
          confirmation required
        </span>
      </section>

      {error && (
        <div className="form-error summary-error" role="alert">
          {error}
          <button onClick={() => navigate("/patient/interview")}>
            Return to interview
          </button>
        </div>
      )}

      {!summary && !error && (
        <main className="route-loading">Generating your structured draft…</main>
      )}

      {summary && (
        <div className="summary-layout">
          <div>
            <div className="card identity-card">
              <div className="avatar large-avatar">
                {(user?.display_name ?? "Demo patient")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h2>{user?.display_name ?? "Demo patient"}</h2>
                <p>Patient-provided history · Version {summary.version}</p>
              </div>
              <PriorityBadge priority={displayPriority(summary.priority)} />
            </div>

            <div className="card bilingual-readback">
              <div className="card-title">
                <div>
                  <h2>Bilingual read-back</h2>
                  <p className="muted">
                    Listen in English or your selected language before
                    acknowledgement.
                  </p>
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
                      ? "English"
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
                {speech.speaking ? "Stop read-back" : "Play audio read-back"}
              </button>
            </div>

            <div className="summary-sections">
              {Object.entries(summary.sections).map(([title, text]) => (
                <div className="card summary-section" key={title}>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <small>
                      Drafted from patient answers and available document
                      extractions.
                    </small>
                  </div>
                </div>
              ))}
            </div>

            <div className="card timeline">
              <div className="card-title">
                <h2>Document timeline</h2>
                <span className="count-badge">{documents.length} files</span>
              </div>
              {documents
                .filter((document) => document.extraction)
                .map((document) => (
                  <div className="timeline-item" key={document.id}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>
                        {document.document_date ?? "Date unknown"} ·{" "}
                        {document.extraction?.document_type}
                      </strong>
                      <p>{document.extraction?.raw_summary}</p>
                    </div>
                  </div>
                ))}
              {!documents.length && (
                <p className="muted">No documents were supplied.</p>
              )}
            </div>
          </div>

          <aside className="routing">
            <div className="card">
              <h3>Ready to share</h3>
              <p className="muted">
                Acknowledgement submits a draft. Only a physician can mark it
                confirmed.
              </p>
              {[
                ["Summary generated", true],
                ["Patient read-back", Boolean(summary.patient_acknowledged_at)],
                ["Physician review", summary.status === "confirmed"],
              ].map(([label, complete]) => (
                <div className="route-row" key={String(label)}>
                  <span
                    className={complete ? "route-icon complete" : "route-icon"}
                  >
                    {complete ? <Check size={14} /> : <Clock3 size={14} />}
                  </span>
                  <span>{label}</span>
                  <em>{complete ? "Done" : "Pending"}</em>
                </div>
              ))}
              <label className="summary-acknowledgement">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                <span>
                  I reviewed the draft and understand a physician must verify
                  it.
                </span>
              </label>
              <button
                className="button primary full"
                onClick={acknowledge}
                disabled={!reviewed || submitting}
              >
                {submitting ? "Submitting…" : "Acknowledge and submit"}{" "}
                <ArrowRight size={17} />
              </button>
              <button
                className="button text-button full"
                onClick={() => navigate("/patient/interview")}
              >
                Go back and edit answers
              </button>
            </div>
            <button className="download-button" onClick={download}>
              <FileText size={17} /> Download marked draft
            </button>
          </aside>
        </div>
      )}
    </PatientShell>
  );
}
