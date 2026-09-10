import Loader from "../components/common/Loader";
import { errorText } from "../i18n";
import Skeleton from "../components/common/Skeleton";
import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
import PhysicianHistory from "../components/common/PhysicianHistory";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Languages,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import PriorityBadge from "../components/common/priorityBadge";
import Footer from "../components/layout/footer";
import Header from "../components/layout/header";
import { getPhysicianPatientSummary } from "../services/physician";
import { updateSummary } from "../services/summary";
import type { PhysicianPatientSummary } from "../types/physician.type";
import { useNavigate } from "react-router-dom";

export default function Consultation() {
  useTranslation();
  const patientId = decodeURIComponent(
    window.location.pathname.split("/").pop() ?? "",
  );

  const [retryCount, setRetryCount] = useState(0);
  const [consult, setConsult] = useState<PhysicianPatientSummary | null>(null);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setMessage("");
    getPhysicianPatientSummary(patientId)
      .then((payload) => {
        if (active) {
          setConsult(payload);
          setSections(payload.summary.sections);
        }
      })
      .catch(
        (reason) =>
          active &&
          setMessage(
            reason instanceof Error
              ? reason.message
              : "errors:consultation_unavailable",
          ),
      );

    return () => {
      active = false;
    };
  }, [patientId, retryCount]);

  const persist = async (confirm: boolean) => {
    if (!consult || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const updated = await updateSummary(
        consult.summary.id,
        {
          sections,
          status: confirm ? "confirmed" : "draft",
        },
        true,
      );

      setConsult({
        ...consult,
        summary: updated,
      });

      setMessage(
        confirm
          ? "errors:clinical_history_confirmed_by_physician"
          : "errors:draft_edits_saved",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "errors:unable_to_save_summary",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmed = consult?.summary.status === "confirmed";

  const priority =
    consult?.queue.priority === "urgent"
      ? "Urgent"
      : consult?.queue.priority === "priority"
        ? "Priority"
        : "Routine";

  return (
    <>
      {/* Header untouched */}
      <Header physician />
      {!consult && !message && <Skeleton />}

      {/* Background untouched */}
      <main
        className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"
        tabIndex={-1}
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/physician")}
          className="
            group mb-5 inline-flex items-center gap-1.5
            rounded-xl border border-slate-200
            bg-white/80 px-3.5 py-2
            text-sm font-medium text-slate-600
            shadow-sm backdrop-blur-xl
            transition-all
            hover:border-blue-300
            hover:bg-blue-50
            hover:text-blue-700
          "
        >
          <ChevronLeft
            size={17}
            className="transition-transform group-hover:-translate-x-0.5"
          />{ui("consultationPage:back_to_queue")}</button>

        {/* Error */}
        {message && !consult && (
          <div
            className="
              mb-6 flex items-start gap-3
              rounded-2xl border border-red-200
              bg-red-50 px-4 py-4
              text-sm text-red-700
              shadow-sm
            "
            role="alert"
          >
            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-red-500"
            />
            {errorText(message)}<button className="button secondary" onClick={() => setRetryCount(n => n + 1)}>{ui("common:retry")}</button>
          </div>
        )}

        {consult && (
          <>
            {/* =======================================================
                PATIENT HEADER
            ======================================================= */}
            <section
              className="
                relative mb-5 overflow-hidden
                rounded-3xl
                border border-blue-100
                bg-white/90
                shadow-[0_12px_45px_-24px_rgba(37,99,235,0.35)]
                backdrop-blur-xl
              "
            >
              {/* Light neon decorations */}
              <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

              {/* Blue top accent */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

              <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  {/* Token avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="
                        flex h-14 w-14 items-center justify-center
                        rounded-2xl
                        border border-blue-200
                        bg-gradient-to-br from-blue-50 to-cyan-50
                        text-lg font-bold text-blue-700
                        shadow-[0_8px_25px_-12px_rgba(37,99,235,0.5)]
                        sm:h-16 sm:w-16
                      "
                    >
                      {consult.queue.token.slice(-2)}
                    </div>

                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
                      <Stethoscope size={13} />{ui("consultationPage:consultready_history")}</div>

                    <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {consult.queue.display_name}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:text-sm">
                      <span className="font-semibold text-slate-700">
                        {consult.queue.token}
                      </span>

                      <span className="text-slate-300">•</span>

                      <span>{ui(consult.queue.department)}</span>

                      <span className="text-slate-300">•</span>

                      <span>{ui("consultationPage:summary_v")}{consult.summary.version}</span>

                      {confirmed && (
                        <>
                          <span className="text-slate-300">•</span>

                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                            <Check size={13} />{ui("consultationPage:verified")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <PriorityBadge priority={priority} />

                  <div
                    className={`
                      hidden items-center gap-2
                      rounded-xl border px-3 py-2
                      text-xs font-semibold sm:flex
                      ${
                        confirmed
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    `}
                  >
                    {confirmed ? (
                      <ShieldCheck size={15} />
                    ) : (
                      <Sparkles size={15} />
                    )}

                    {confirmed ? ui("consultationPage:physician_verified") : ui("consultationPage:review_required")}
                  </div>
                </div>
              </div>
            </section>

            {/* =======================================================
                ALERTS
            ======================================================= */}
            <div className="mb-6 space-y-3">
              {/* Red flag */}
              {consult.queue.red_flags.length > 0 && (
                <div
                  className="
                    relative overflow-hidden
                    rounded-2xl border border-red-200
                    bg-gradient-to-r from-red-50 to-white
                    p-4
                    shadow-[0_8px_30px_-22px_rgba(239,68,68,0.45)]
                  "
                  role="alert"
                >
                  <div className="absolute bottom-0 left-0 top-0 w-1 bg-red-500" />

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-red-100 p-2 text-red-600">
                      <AlertTriangle size={18} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-semibold text-red-800">{ui("consultationPage:priority_triage_signal")}</strong>

                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">{ui("consultationPage:requires_attention")}</span>
                      </div>

                      <p className="mt-1.5 text-sm leading-6 text-red-700">
                        {consult.queue.red_flags.join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI notice */}
              <div
                className="
                  flex items-start gap-3
                  rounded-2xl
                  border border-violet-200
                  bg-gradient-to-r from-violet-50/90 via-white to-blue-50/60
                  px-4 py-3.5
                  shadow-sm
                "
                role="note"
              >
                <div className="mt-0.5 rounded-xl bg-violet-100 p-2 text-violet-600">
                  <Sparkles size={16} />
                </div>

                <div className="text-sm">
                  <strong className="font-semibold text-violet-800">{ui("consultationPage:aiassisted_clinical_history")}</strong>

                  <p className="mt-0.5 leading-5 text-slate-600">{ui("consultationPage:aidrafted_content_is_not_an_autonomous_diagnosis_verify")}</p>
                </div>
              </div>
            </div>

            {/* =======================================================
                WORKSPACE
            ======================================================= */}
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
              {/* =====================================================
                  LEFT — SOURCE RECORDS
              ===================================================== */}
              <aside className="space-y-4 xl:sticky xl:top-24">
                <div
                  className="
                    overflow-hidden rounded-2xl
                    border border-slate-200
                    bg-white/90
                    shadow-[0_8px_30px_-20px_rgba(15,23,42,0.18)]
                    backdrop-blur-xl
                  "
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <FileText size={17} />
                      </div>

                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">{ui("consultationPage:source_records")}</h2>

                        <p className="text-[11px] text-slate-500">{ui("consultationPage:clinical_information_sources")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {/* Interview */}
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{ui("consultationPage:interview")}</span>

                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />{ui("consultationPage:complete")}</span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{ui("consultationPage:captured_answers")}</span>

                          <span className="font-semibold text-slate-900">
                            {consult.interview.answers.length}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Languages size={14} />{ui("consultationPage:language")}</span>

                          <span className="truncate font-medium text-slate-700">
                            {consult.interview.preferred_language}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{ui("consultationPage:documents")}</span>

                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {consult.documents.length}
                        </span>
                      </div>

                      {consult.documents.length === 0 ? (
                        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-5 text-center">
                          <Upload
                            size={20}
                            className="mb-2 text-slate-400"
                          />

                          <p className="text-xs text-slate-500">{ui("consultationPage:no_documents_uploaded")}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {consult.documents.map((document) => (
                            <div
                              key={document.id}
                              title={document.original_filename}
                              className="
                                group flex items-center gap-2
                                rounded-xl border border-slate-200
                                bg-slate-50/60 px-3 py-2.5
                                transition-all
                                hover:border-blue-200
                                hover:bg-blue-50/70
                              "
                            >
                              <FileText
                                size={14}
                                className="shrink-0 text-blue-600"
                              />

                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">
                                {document.original_filename}
                              </span>

                              <Check
                                size={13}
                                className="shrink-0 text-emerald-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ABDM */}
                    <div className="p-4">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">{ui("consultationPage:abdm_integration")}</span>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-blue-500">{ui("consultationPage:bundle_id")}</p>

                        <p className="mt-1 break-all text-xs font-semibold text-blue-800">
                          {consult.abdm?.bundle_id ?? ui("consultationPage:not_pushed")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* =====================================================
                  CENTER — HISTORY
              ===================================================== */}
              <section
                aria-label={ui("consultationPage:structured_clinical_history")}
                className="min-w-0"
              >
                <div className="mb-4 flex items-end justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-blue-50 p-1.5">
                        <ClipboardCheck
                          size={17}
                          className="text-blue-600"
                        />
                      </div>

                      <h2 className="text-lg font-bold text-slate-900">{ui("consultationPage:structured_clinical_history")}</h2>
                    </div>

                    <p className="mt-1.5 pl-8 text-xs text-slate-500">{ui("consultationPage:review_and_edit_aiorganised_clinical_information")}</p>
                  </div>

                  {!confirmed && (
                    <span className="hidden items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 sm:inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{ui("consultationPage:editable")}</span>
                  )}
                </div>

                <div className="space-y-3">
                  {Object.entries(sections).map(([title, value], index) => (
                    <div
                      key={title}
                      className="
                        group relative overflow-hidden
                        rounded-2xl
                        border border-slate-200
                        bg-white/90
                        shadow-[0_6px_24px_-18px_rgba(15,23,42,0.25)]
                        transition-all duration-200
                        hover:border-blue-200
                        hover:shadow-[0_10px_30px_-20px_rgba(37,99,235,0.3)]
                        focus-within:border-blue-400
                        focus-within:ring-4
                        focus-within:ring-blue-500/5
                      "
                    >
                      {/* Neon left bar */}
                      <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-500 opacity-70 transition-opacity group-focus-within:opacity-100" />

                      {/* Section title */}
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-3">
                          <span
                            className="
                              flex h-7 w-7 items-center justify-center
                              rounded-lg
                              border border-blue-100
                              bg-blue-50
                              text-[10px] font-bold text-blue-600
                            "
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <label
                            htmlFor={`section-${index}`}
                            className="text-sm font-semibold capitalize text-slate-800"
                          >
                            {ui(title)}
                          </label>
                        </div>

                        {confirmed && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                            <Check size={12} />{ui("consultationPage:verified")}</span>
                        )}
                      </div>

                      {/* Editable content */}
                      <div className="p-4 sm:p-5">
                        <textarea
                          id={`section-${index}`}
                          value={value}
                          rows={Math.max(
                            3,
                            Math.min(8, Math.ceil(value.length / 75)),
                          )}
                          onChange={(event) =>
                            setSections((current) => ({
                              ...current,
                              [title]: event.target.value,
                            }))
                          }
                          disabled={confirmed}
                          className="
                            w-full resize-y
                            bg-transparent
                            text-sm leading-6 text-slate-700
                            outline-none
                            placeholder:text-slate-400
                            disabled:cursor-default
                            disabled:text-slate-600
                            sm:text-[15px]
                          "
                        />

                        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                          <Sparkles size={11} className="text-violet-500" />{ui("consultationPage:aiorganised_physician_verification_required")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* =====================================================
                  RIGHT — CONTROLS
              ===================================================== */}
              <aside className="space-y-4 xl:sticky xl:top-24">
                <div
                  className="
                    overflow-hidden rounded-2xl
                    border border-blue-100
                    bg-white/95
                    shadow-[0_10px_35px_-22px_rgba(37,99,235,0.3)]
                    backdrop-blur-xl
                  "
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <Stethoscope size={17} />
                      </div>

                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">{ui("consultationPage:physician_controls")}</h2>

                        <p className="text-[11px] text-slate-500">{ui("consultationPage:review_workflow")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Status */}
                    <div
                      className={`mb-4 rounded-xl border p-3 ${
                        confirmed
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            confirmed ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />

                        <span
                          className={`text-xs font-semibold ${
                            confirmed
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {confirmed
                            ? ui("consultationPage:review_completed")
                            : ui("consultationPage:awaiting_verification")}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] leading-5 text-slate-600">
                        {confirmed
                          ? ui("consultationPage:this_clinical_history_has_been_reviewed_and_confirmed")
                          : ui("consultationPage:save_changes_as_draft_or_confirm_after_clinical")}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => persist(false)}
                        disabled={saving || confirmed}
                        className="
                          flex w-full items-center justify-center gap-2
                          rounded-xl
                          border border-blue-200
                          bg-blue-50
                          px-4 py-2.5
                          text-sm font-semibold text-blue-700
                          transition-all
                          hover:border-blue-300
                          hover:bg-blue-100
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        <Save size={16} />
                        {saving ? <Loader label="consultationPage:saving" /> : ui("consultationPage:save_draft")}
                      </button>

                      <button
                        type="button"
                        onClick={() => persist(true)}
                        disabled={saving || confirmed}
                        className="
                          flex w-full items-center justify-center gap-2
                          rounded-xl
                          border border-blue-600
                          bg-gradient-to-r from-blue-600 to-indigo-600
                          px-4 py-2.5
                          text-sm font-semibold text-white
                          shadow-[0_8px_22px_-10px_rgba(37,99,235,0.75)]
                          transition-all
                          hover:-translate-y-0.5
                          hover:from-blue-700
                          hover:to-indigo-700
                          hover:shadow-[0_12px_28px_-10px_rgba(37,99,235,0.75)]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                          disabled:hover:translate-y-0
                        "
                      >
                        <Check size={17} />

                        {confirmed
                          ? ui("consultationPage:history_confirmed")
                          : saving
                            ? <Loader label="consultationPage:saving" />
                            : ui("consultationPage:confirm_history")}
                      </button>
                    </div>

                    {message && (
                      <div
                        className={`mt-4 rounded-xl border px-3 py-3 text-xs leading-5 ${
                          message.toLowerCase().includes("unable")
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                        role="status"
                      >
                        <div className="flex items-start gap-2">
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0"
                          />
                          {errorText(message)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                {!confirmed && (
                  <div
                    className="
                      rounded-2xl
                      border border-violet-100
                      bg-white/90
                      p-4
                      shadow-[0_6px_24px_-18px_rgba(124,58,237,0.25)]
                    "
                  >
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <div className="rounded-lg bg-violet-50 p-1.5">
                        <ShieldCheck
                          size={15}
                          className="text-violet-600"
                        />
                      </div>{ui("consultationPage:before_confirming")}</div>

                    <div className="space-y-2">
                      {[
                        "consultationPage:verify_patient",
                        "consultationPage:review_documents",
                        "consultationPage:check_flags",
                      ].map((item) => (
                        <div
                          key={ui(item)}
                          className="flex items-start gap-2 text-[11px] leading-5 text-slate-500"
                        >
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                          {ui(item)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}

        {/* Previous history */}
        {consult && (
          <div className="mt-8">
            <PhysicianHistory
              patientId={patientId}
              sessionId={consult.queue.session_id}
            />
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
