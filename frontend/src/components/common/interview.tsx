import { errorText } from "../../i18n";
import { useTranslation } from 'react-i18next';
import Loader from "./Loader";
import { questionText, formatNumber } from "../../i18n";
import { ui } from "../../i18n";
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
import { useEffect, useMemo, useRef, useState } from "react";

import useAuth from "../../hooks/useAuth";
import useAccessibility from "../../hooks/useAccessibility";
import useSpeech from "../../hooks/useSpeech";
import { startInterview, submitAnswer } from "../../services/interview";
import type { InputMode } from "../../services/interview";
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

function humanize(value: string, questionId?: string) {
  return questionText(`${questionId}.${value}`, value.replaceAll("_", " "));
}

interface InterviewProps {
  /** Optional navigation override used in tests instead of useNavigate. */
  go?: (path: string, state?: unknown) => void;
}

export default function Interview({ go }: InterviewProps) {
  useTranslation();
  const { preferredLanguage } = useAuth();
  const { t } = useAccessibility();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const languageRef = useRef(preferredLanguage);
  useEffect(() => { languageRef.current = preferredLanguage; }, [preferredLanguage]);
  const [retryCount, setRetryCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = busy || loadingQuestion;
  const [error, setError] = useState("");
  const [readAloud, setReadAloud] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("touch");
  const speech = useSpeech(preferredLanguage);
  const stopInterviewListening = speech.stopListening;
  const stopInterviewSpeech = speech.stopSpeaking;
  const speakQuestion = speech.speak;
  const question = session?.current_question;
  const navigate = useNavigate();

  const navTo = (path: string, state?: unknown) => {
    if (go) {
      go(path, state);
    } else {
      navigate(path, { state });
    }
  };

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setLoadingQuestion(true);
    setError("");
    startInterview()
      .then((loadedSession) => {
        if (!active) return;
        setSession(loadedSession);

      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "errors:unable_to_start_interview",
        );
      }).finally(() => { if (active) setLoadingQuestion(false); });
    return () => {
      active = false;
      stopInterviewListening();
      stopInterviewSpeech();
    };
  }, [preferredLanguage, retryCount, stopInterviewListening, stopInterviewSpeech]);

  useEffect(() => {
    if (readAloud && question) {
      speakQuestion(questionText(`${question.id}.text`, question.text));
    }
  }, [question, readAloud, speakQuestion, preferredLanguage]);

  const answeredSections = useMemo(
    () => new Set(session?.answers.map((item) => item.section) ?? []),
    [session?.answers],
  );

  const respond = async (value: string, mode: InputMode) => {
    if (!session?.current_question || pending || !value.trim()) return;
    setBusy(true);
    setError("");
    const requestLanguage = preferredLanguage;
    setInputMode(mode);
    speech.stopListening();
    try {
      const updated = await submitAnswer(
        session.id,
        session.current_question.id,
        value.trim(),
        mode,
      );
      setSession(updated);
      if (languageRef.current !== requestLanguage) setRetryCount(n => n + 1);

      setAnswer("");
      setInputMode("touch");

      // Auto-navigate on urgent triage
      if (updated.triage_required) {
        navTo("/patient/triage-alert", { alerts: updated.alerts });
        return;
      }

      // Auto-navigate on completion
      if (updated.status === "completed") {
        navTo("/patient/documents");
        return;
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "errors:unable_to_save_answer",
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
          <p>{ui("interview:choose_an_option_type_or_speak_your_answers")}</p>
        </div>
        <span className="save-status">
          <span className="save-dot" />{ui("interview:server_autosave_enabled")}</span>
      </div>

      {session?.triage_required && latestAlert && (
        <div className="triage-banner" role="alert" aria-live="assertive">
          <AlertTriangle size={22} />
          <div>
            <PriorityBadge priority="Urgent" />
            <strong>{ui("interview:immediate_clinical_triage_recommended")}</strong>
            <p>{latestAlert.reason}</p>
          </div>
          <button
            className="button secondary"
            onClick={() => navTo("/patient/triage-alert", { alerts: session.alerts })}
          >{ui("interview:open_triage_alert")}<ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="interview-layout">
        <aside className="card interview-sidebar">
          <div className="progress-ring" aria-label={ui("common:percentComplete", { value: formatNumber((session?.progress ?? 0) / 100, { style: "percent" }) })}>
            <strong>{formatNumber((session?.progress ?? 0) / 100, { style: "percent" })}</strong>
            <span>{ui("interview:complete")}</span>
          </div>
          <h3>{ui("interview:your_sections")}</h3>
          {sections.map((section, index) => {
            const complete = answeredSections.has(section);
            return (
              <div
                className={`section-row ${complete ? "complete" : ""}`}
                key={section}
              >
                <span>{complete ? <Check size={13} /> : index + 1}</span>
                {ui(section)}
              </div>
            );
          })}
          {session?.department === "ayurveda" && (
            <div className="section-row complete">
              <span>🌿</span>{ui("interview:dashavidha")}</div>
          )}
        </aside>

        <section
          className="card conversation"
          aria-busy={pending}
          id="patient-content"
          tabIndex={-1}
        >
          {pending && !error && <Loader label="interview:waiting" />}
          {question ? (
            <>
              <div className="ai-message">
                <div className="ai-avatar">
                  <Sparkles size={19} />
                </div>
                <div>
                  <span className="label">
                    {question.source === "llm_fallback"
                      ? ui("interview:generated_followup_reviewable")
                      : ui(question.section)}
                  </span>
                  <p id="question-text">{questionText(`${question.id}.text`, question.text)}</p>
                </div>
              </div>

              {/* Touch affordance: options for single_choice, scale, and multi_choice */}
              {(question.input_type === "single_choice" ||
                question.input_type === "scale" ||
                question.input_type === "free_text") &&
                question.options.length > 0 && (
                  <div
                    className="suggestions"
                    role="group"
                    aria-labelledby="question-text"
                    aria-label={ui("interview:answer_options")}
                  >
                    {question.options.map((option) => (
                      <button
                        key={option.value}
                        disabled={pending}
                        onClick={() => respond(option.value, "touch")}
                        aria-label={questionText(`${question.id}.${option.value}`, option.label)}
                      >
                        {option.icon && (
                          <span className="option-icon" aria-hidden="true">
                            {option.icon}
                          </span>
                        )}
                        {questionText(`${question.id}.${option.value}`, option.label)}
                      </button>
                    ))}
                  </div>
                )}

              {/* Voice + text affordance — always shown */}
              <div
                className={`voice-input ${speech.listening ? "listening" : ""}`}
                aria-label={ui("interview:voice_and_text_answer_input")}
              >
                <div className="voice-hint">
                  {speech.listening ? (
                    <>
                      <AudioLines size={18} />{ui("interview:listening", { language: ui(preferredLanguage) })}
                    </>
                  ) : (
                    <>{ui("interview:or_answer_in_your_own_words")}</>
                  )}
                </div>
                {speech.listening && (
                  <div className="waveform" aria-hidden="true">
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
                    aria-label={ui("interview:your_answer")}
                    aria-describedby="question-text"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") respond(answer, "text");
                    }}
                    placeholder={ui("interview:type_your_answer_here")}
                    disabled={pending}
                  />
                  <button
                    className="mic-button"
                    onClick={() => {
                      if (speech.listening) {
                        speech.stopListening();
                      } else {
                        speech.startListening((text) => {
                          setAnswer(text);
                          setInputMode("voice");
                        });
                      }
                    }}
                    aria-label={
                      speech.listening ? ui("interview:stop_recording") : ui("interview:start_recording")
                    }
                    disabled={pending || !speech.speechRecognitionSupported}
                    title={
                      speech.speechRecognitionSupported
                        ? ui("interview:voice_answer")
                        : ui("interview:speech_recognition_is_unavailable_in_this_browser")
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
                    onClick={() => respond(answer, inputMode === "voice" ? "voice" : "text")}
                    disabled={!answer.trim() || pending}
                    aria-label={ui("interview:send_answer")}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <div className="conversation-footer">
                <button
                  className="text-button"
                  onClick={() => speech.speak(questionText(`${question.id}.text`, question.text))}
                  aria-label={ui("interview:repeat_question_aloud")}
                >
                  <RotateCcw size={16} />{ui("interview:repeat_question")}</button>
                <button
                  className="text-button"
                  onClick={() => respond("not_sure", "touch")}
                  disabled={pending}
                >{ui("interview:i_dont_know")}</button>
              </div>
            </>
          ) : session?.status === "completed" ? (
            <div className="interview-complete">
              <Check size={28} />
              <h2>{ui("interview:your_health_history_is_complete")}</h2>
              <p>{ui("interview:the_structured_draft_will_remain_clearly_marked_for")}</p>
            </div>
          ) : null}
          {error && (
            <div className="form-error" role="alert">
              {errorText(error)}
              <button
                className="text-button"
                disabled={pending} onClick={() => setRetryCount(n => n + 1)}
              >{ui("interview:retry")}</button>
            </div>
          )}
          {session?.answers.length ? (
            <div className="last-answer">
              <Check size={15} />{ui("interview:saved")}{" "}
              {humanize(session.answers.at(-1)?.value ?? "", session.answers.at(-1)?.question_id)}
            </div>
          ) : null}
        </section>

        <aside className="card preview-card">
          <div className="card-title">
            <h3>{ui("interview:live_history_preview")}</h3>
            <span className="ai-pill">
              <Sparkles size={13} />{ui("interview:draft")}</span>
          </div>
          <p className="preview-muted">{ui("interview:patientprovided_answers_structured_as_you_go")}</p>
          {!session?.answers.length ? (
            <div className="empty-preview">
              <ClipboardList size={25} />
              <p>{ui("interview:start_answering_to_build_your_story")}</p>
            </div>
          ) : (
            <div className="preview-items">
              {session.answers.slice(-6).map((item) => (
                <div key={item.id}>
                  <span>{ui(item.section)}</span>
                  <strong>{humanize(item.value, item.question_id)}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="accessibility-box">
            <Volume2 size={17} />
            <span>{ui("interview:read_each_question_aloud")}</span>
            <button
              className={`toggle ${readAloud ? "toggle-on" : ""}`}
              aria-label={ui("interview:toggle_automatic_read_aloud")}
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
          onClick={() => navTo("/patient/consent")}
        >
          <ChevronLeft size={17} />{ui("interview:back")}</button>
        <button
          className="button primary"
          onClick={() =>
            navTo(
              session?.triage_required
                ? "/patient/triage-alert"
                : "/patient/documents",
              session?.triage_required ? { alerts: session.alerts } : undefined,
            )
          }
          disabled={
            !session ||
            (session.status !== "completed" && !session.triage_required)
          }
        >
          {session?.triage_required ? ui("interview:go_to_triage") : ui("interview:continue_to_documents")}{" "}
          <ArrowRight size={17} />
        </button>
      </div>
    </PatientShell>
  );
}
