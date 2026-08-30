import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import PatientShell from "../components/common/patientShell";
import useAccessibility from "../hooks/useAccessibility";
import useAuth from "../hooks/useAuth";
import { pushSummaryToABDM } from "../services/abdm";
import { getMyQueueStatus } from "../services/physician";
import { getCurrentSummary } from "../services/summary";
import type { ABDMPush, QueuePatient } from "../types/physician.type";

export default function Complete({ go }: { go: (path: string) => void }) {
  const { user } = useAuth();
  const { t } = useAccessibility();
  const [queue, setQueue] = useState<QueuePatient | null>(null);
  const [push, setPush] = useState<ABDMPush | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getCurrentSummary().then(async (summary) => {
      if (!summary) throw new Error("No submitted summary was found.");
      const pushed = await pushSummaryToABDM(summary.id);
      const position = await getMyQueueStatus();
      if (active) { setPush(pushed); setQueue(position); }
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : "Check-in could not be completed"));
    return () => { active = false; };
  }, []);

  return <PatientShell active="Consult" go={go}><div className="complete-page">
    <div className="success-mark">{queue ? <Check size={38} /> : <LoaderCircle className="spin" size={38} />}</div>
    <span className="eyebrow">Check-in {queue ? "complete" : "processing"}</span>
    <h1>{queue ? `${t("complete.done")}, ${user?.display_name ?? "patient"}.` : t("complete.processing")}</h1>
    <p>Your submitted history is ready for the care team. The ABDM transfer below is a demo and leaves no external system.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    {queue && <div className="token-card card" aria-live="polite">
      <span>{t("complete.token")}</span><strong>{queue.token}</strong>
      <div className="token-details"><div><span>Department</span><b>{queue.department}</b></div><div><span>Priority</span><b>{queue.priority}</b></div><div><span>Estimated wait</span><b>~{queue.estimated_wait_minutes} min</b></div><div><span>Queue position</span><b>{queue.queue_position}</b></div></div>
      {push && <p className="muted">Mock FHIR Bundle: {push.bundle_id}</p>}
    </div>}
    <div className="complete-actions"><button className="button primary" onClick={() => go("/patient/summary")}>{t("complete.view")} <ArrowRight size={17} /></button><button className="button secondary" onClick={() => go("/")}>{t("complete.home")}</button></div>
    <p className="muted small">Wait times are estimates. If you feel worse, alert a staff member immediately.</p>
  </div></PatientShell>;
}
