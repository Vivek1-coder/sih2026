import { errorText } from "../i18n";
import Skeleton from "../components/common/Skeleton";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, History, UserRound } from "lucide-react";
import PatientShell from "../components/common/patientShell";
import useAccessibility from "../hooks/useAccessibility";
import { getSessionStatus, type SessionStatus } from "../services/patient";

export default function PatientHomeHub() {
  const { t } = useAccessibility();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setError("");
    let active = true;
    getSessionStatus()
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        if (active) setError("patient.error");
      });
    return () => {
      active = false;
    };
  }, [retryCount]);
  return (
    <PatientShell active="Identify">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("patient.welcome")}</span>
          <h1>{t("patient.home")}</h1>
          <p>{t("patient.homeHelp")}</p>
        </div>
      </section>
      {error && (
        <p role="alert" className="form-error">
          {errorText(error)}
          <button
            className="button secondary"
            onClick={() => setRetryCount((n) => n + 1)}
          >
            {t("common:retry")}
          </button>
        </p>
      )}
      {!status && !error && <Skeleton />}
      <div className="continuity-grid">
        <button
          className="card hub-choice"
          onClick={() => navigate("/patient/location")}
        >
          <ArrowRight aria-hidden="true" />
          <strong>{t("patient.start")}</strong>
          <span>{t("patient.startHelp")}</span>
        </button>
        <button
          className="card hub-choice"
          disabled={!status?.resumable}
          onClick={() =>
            navigate(
              `/patient/location?resume=${encodeURIComponent(status!.session!.id)}`,
            )
          }
        >
          <History aria-hidden="true" />
          <strong>{t("patient.resume")}</strong>
          <span>
            {status?.resumable
              ? status.session?.location
              : t("patient.noSession")}
          </span>
        </button>
        <button
          className="card hub-choice"
          onClick={() => navigate("/patient/profile")}
        >
          <UserRound aria-hidden="true" />
          <strong>{t("patient.profile")}</strong>
          <span>{t("patient.profileHelp")}</span>
        </button>
      </div>
    </PatientShell>
  );
}
