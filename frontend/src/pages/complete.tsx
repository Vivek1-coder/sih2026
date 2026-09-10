import { formatNumber } from "../i18n";
import { errorText } from "../i18n";
import Loader from "../components/common/Loader";
import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
import { ArrowRight, Check, } from "lucide-react";
import { useEffect, useState } from "react";
import PatientShell from "../components/common/patientShell";
import useAccessibility from "../hooks/useAccessibility";
import useAuth from "../hooks/useAuth";
import { pushSummaryToABDM } from "../services/abdm";
import { getMyQueueStatus } from "../services/physician";
import { getCurrentSummary } from "../services/summary";
import type { ABDMPush, QueuePatient } from "../types/physician.type";
import { useNavigate } from "react-router-dom";

export default function Complete() {
  useTranslation();
  const { user } = useAuth();
  const { t } = useAccessibility();
  const [retryCount, setRetryCount] = useState(0);
  const [queue, setQueue] = useState<QueuePatient | null>(null);
  const [push, setPush] = useState<ABDMPush | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setError("");
    getCurrentSummary()
      .then(async (summary) => {
        if (!summary) throw new Error("errors:no_submitted_summary_was_found");
        const pushed = await pushSummaryToABDM(summary.id);
        const position = await getMyQueueStatus();
        if (active) {
          setPush(pushed);
          setQueue(position);
        }
      })
      .catch(
        (reason) =>
          active &&
          setError(
            reason instanceof Error
              ? reason.message
              : "errors:checkin_could_not_be_completed",
          ),
      );
    return () => {
      active = false;
    };
  }, [retryCount]);

  return (
    <PatientShell active="Consult">
      <div className="complete-page">
        <div className="success-mark">
          {queue ? (
            <Check size={38} />
          ) : (
            !error && <Loader size={38} />
          )}
        </div>
        <span className="eyebrow">{ui("complete:checkin")}{queue ? ui("complete:complete") : ui("complete:processing")}
        </span>
        <h1>
          {queue
            ? ui("complete:greeting", { greeting: t("complete.done"), name: user?.display_name ?? ui("common:patient") })
            : t("complete.processing")}
        </h1>
        <p>{ui("complete:your_submitted_history_is_ready_for_the_care")}</p>
        {error && (
          <div className="form-error" role="alert">
            {errorText(error)}<button className="button secondary" onClick={() => setRetryCount(n => n + 1)}>{ui("common:retry")}</button>
          </div>
        )}
        {queue && (
          <div className="token-card card" aria-live="polite">
            <span>{t("complete.token")}</span>
            <strong>{queue.token}</strong>
            <div className="token-details">
              <div>
                <span>{ui("complete:department")}</span>
                <b>{ui(queue.department)}</b>
              </div>
              <div>
                <span>{ui("complete:priority")}</span>
                <b>{ui(queue.priority)}</b>
              </div>
              <div>
                <span>{ui("complete:estimated_wait")}</span>
                <b>{ui("common:waitMinutes", { value: formatNumber(queue.estimated_wait_minutes) })}</b>
              </div>
              <div>
                <span>{ui("complete:queue_position")}</span>
                <b>{formatNumber(queue.queue_position)}</b>
              </div>
            </div>
            {push && (
              <p className="muted">{ui("complete:mock_fhir_bundle")}{push.bundle_id}</p>
            )}
          </div>
        )}
        <div className="complete-actions">
          <button
            className="button primary"
            onClick={() => navigate("/patient/summary")}
          >
            {t("complete.view")} <ArrowRight size={17} />
          </button>
          <button className="button secondary" onClick={() => navigate("/")}>
            {t("complete.home")}
          </button>
        </div>
        <p className="muted small">{ui("complete:wait_times_are_estimates_if_you_feel_worse")}</p>
      </div>
    </PatientShell>
  );
}
