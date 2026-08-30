import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
  Check,
  ChevronLeft,
  ClipboardList,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import useAuth from "../../hooks/useAuth";
import useAccessibility from "../../hooks/useAccessibility";
import useSpeech from "../../hooks/useSpeech";
import { startInterview, submitAnswer } from "../../services/interview";
import type { InterviewSession } from "../../types/interview.type";
import PriorityBadge from "./priorityBadge";
import PatientShell from "./patientShell";
import { useNavigate } from "react-router-dom";

const sections = [
  "Chief complaint",
  "Present illness",
  "Symptoms",
  "Past history",
  "Medications",
  "Allergies",
  "Family history",
  "Lifestyle",
];

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export default function Interview() {
  const { preferredLanguage, setPreferredLanguage } = useAuth();
  const { t } = useAccessibility();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [readAloud, setReadAloud] = useState(false);
  const speech = useSpeech(preferredLanguage);
  const stopInterviewListening = speech.stopListening;
  const stopInterviewSpeech = speech.stopSpeaking;
  const speakQuestion = speech.speak;
  const question = session?.current_question;
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    startInterview()
      .then((loadedSession) => {
        if (!active) return;
        setSession(loadedSession);
        setPreferredLanguage(loadedSession.preferred_language);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to start interview.",
        );
      });
    return () => {
      active = false;
      stopInterviewListening();
      stopInterviewSpeech();
    };
  }, [setPreferredLanguage, stopInterviewListening, stopInterviewSpeech]);

  useEffect(() => {
    if (readAloud && question) {
      speakQuestion(question.text);
    }
  }, [question, readAloud, speakQuestion]);

  const answeredSections = useMemo(
    () => new Set(session?.answers.map((item) => item.section) ?? []),
    [session?.answers],
  );

  const respond = async (value: string) => {
    if (!session?.current_question || busy || !value.trim()) return;
    setBusy(true);
    setError("");
    speech.stopListening();
    try {
      const updated = await submitAnswer(
        session.id,
        session.current_question.id,
        value.trim(),
      );
      setSession(updated);
      setPreferredLanguage(updated.preferred_language);
      setAnswer("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save answer.",
      );
    } finally {
      setBusy(false);
    }
  };

  const latestAlert = session?.alerts.at(-1);

  return (
    <PatientShell active="Converse">
      <div className="interview-head">
        <div>
          <span className="eyebrow">{t("interview.eyebrow")}</span>
          <h1>{t("interview.title")}</h1>
          <p>
            Choose an option, type, or speak. Your answers determine the next
            question.
          </p>
        </div>
        <span className="save-status">
          <span className="save-dot" /> Server autosave enabled
        </span>
      </div>

      {session?.triage_required && latestAlert && (
        <div className="triage-banner" role="alert" aria-live="assertive">
          <AlertTriangle size={22} />
          <div>
            <PriorityBadge priority="Urgent" />
            <strong> Immediate clinical triage recommended</strong>
            <p>{latestAlert.reason}</p>
          </div>
          <button
            className="button secondary"
            onClick={() => navigate("/patient/triage-alert")}
          >
            Open triage alert <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="interview-layout">
        <aside className="card interview-sidebar">
          <div className="progress-ring">
            <strong>{session?.progress ?? 0}%</strong>
            <span>complete</span>
          </div>
          <h3>Your sections</h3>
          {sections.map((section, index) => {
            const complete = answeredSections.has(section);
            return (
              <div
                className={`section-row ${complete ? "complete" : ""}`}
                key={section}
              >
                <span>{complete ? <Check size={13} /> : index + 1}</span>
                {section}
              </div>
            );
          })}
          {session?.department === "ayurveda" && (
            <div className="section-row complete">
              <span>🌿</span> Dashavidha
            </div>
          )}
        </aside>

        <section className="card conversation" aria-busy={busy}>
          {!session && !error && (
            <div className="conversation-loading">
              Preparing your first question…
            </div>
          )}
          {question ? (
            <>
              <div className="ai-message">
                <div className="ai-avatar">
                  <Sparkles size={19} />
                </div>
                <div>
                  <span className="label">
                    {question.source === "llm_fallback"
                      ? "Generated follow-up · reviewable"
                      : question.section}
                  </span>
                  <p>{question.text}</p>
                </div>
              </div>

              <div className="suggestions">
                {question.options.map((option) => (
                  <button
                    key={option.value}
                    disabled={busy}
                    onClick={() => respond(option.value)}
                  >
                    {option.icon && (
                      <span className="option-icon" aria-hidden="true">
                        {option.icon}
                      </span>
                    )}
                    {option.label}
                  </button>
                ))}
              </div>

              <div
                className={`voice-input ${speech.listening ? "listening" : ""}`}
              >
                <div className="voice-hint">
                  {speech.listening ? (
                    <>
                      <AudioLines size={18} /> Listening in {preferredLanguage}…
                    </>
                  ) : (
                    <>Or answer in your own words</>
                  )}
                </div>
                {speech.listening && (
                  <div className="waveform">
                    {[2, 5, 8, 4, 10, 6, 3, 9, 5, 7, 3, 8, 4, 6].map(
                      (height, index) => (
                        <i key={index} style={{ height: `${height * 3}px` }} />
                      ),
                    )}
                  </div>
                )}
                {speech.transcript && speech.listening && (
                  <p className="live-transcript" aria-live="polite">
                    {speech.transcript}
                  </p>
                )}
                <div className="voice-actions">
                  <input
                    aria-label="Your answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") respond(answer);
                    }}
                    placeholder="Type your answer here…"
                    disabled={busy}
                  />
                  <button
                    className="mic-button"
                    onClick={() => {
                      if (speech.listening) {
                        speech.stopListening();
                      } else {
                        speech.startListening((text) => setAnswer(text));
                      }
                    }}
                    aria-label={
                      speech.listening ? "Stop recording" : "Start recording"
                    }
                    disabled={!speech.speechRecognitionSupported}
                    title={
                      speech.speechRecognitionSupported
                        ? "Voice answer"
                        : "Speech recognition is unavailable in this browser"
                    }
                  >
                    {speech.listening ? (
                      <span className="stop-square" />
                    ) : (
                      <Mic size={20} />
                    )}
                  </button>
                  <button
                    className="mic-button send-answer"
                    onClick={() => respond(answer)}
                    disabled={!answer.trim() || busy}
                    aria-label="Send answer"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <div className="conversation-footer">
                <button
                  className="text-button"
                  onClick={() => speech.speak(question.text)}
                >
                  <RotateCcw size={16} /> Repeat question
                </button>
                <button
                  className="text-button"
                  onClick={() => respond("not_sure")}
                  disabled={busy}
                >
                  I don’t know
                </button>
              </div>
            </>
          ) : session?.status === "completed" ? (
            <div className="interview-complete">
              <Check size={28} />
              <h2>Your health history is complete.</h2>
              <p>
                The structured draft will remain clearly marked for physician
                review.
              </p>
            </div>
          ) : null}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {session?.answers.length ? (
            <div className="last-answer">
              <Check size={15} /> Saved:{" "}
              {humanize(session.answers.at(-1)?.value ?? "")}
            </div>
          ) : null}
        </section>

        <aside className="card preview-card">
          <div className="card-title">
            <h3>Live history preview</h3>
            <span className="ai-pill">
              <Sparkles size={13} /> Draft
            </span>
          </div>
          <p className="preview-muted">
            Patient-provided answers, structured as you go.
          </p>
          {!session?.answers.length ? (
            <div className="empty-preview">
              <ClipboardList size={25} />
              <p>Start answering to build your story.</p>
            </div>
          ) : (
            <div className="preview-items">
              {session.answers.slice(-6).map((item) => (
                <div key={item.id}>
                  <span>{item.section}</span>
                  <strong>{humanize(item.value)}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="accessibility-box">
            <Volume2 size={17} />
            <span>Read each question aloud</span>
            <button
              className={`toggle ${readAloud ? "toggle-on" : ""}`}
              aria-label="Toggle automatic read aloud"
              aria-pressed={readAloud}
              onClick={() => setReadAloud((current) => !current)}
            >
              <i />
            </button>
          </div>
        </aside>
      </div>

      <div className="bottom-actions">
        <button
          className="button secondary"
          onClick={() => navigate("/patient/consent")}
        >
          <ChevronLeft size={17} /> Back
        </button>
        <button
          className="button primary"
          onClick={() =>
            navigate(
              session?.triage_required
                ? "/patient/triage-alert"
                : "/patient/documents",
            )
          }
          disabled={
            !session ||
            (session.status !== "completed" && !session.triage_required)
          }
        >
          {session?.triage_required ? "Go to triage" : "Continue to documents"}{" "}
          <ArrowRight size={17} />
        </button>
      </div>
    </PatientShell>
  );
}
