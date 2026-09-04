import { AlertTriangle, ArrowLeft, PhoneCall, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import PatientShell from "../components/common/patientShell";
import PriorityBadge from "../components/common/priorityBadge";
import { getCurrentInterview } from "../services/interview";
import type { RedFlagAlert } from "../types/interview.type";
import { useNavigate } from "react-router-dom";

export default function TriageAlert() {
  const [alerts, setAlerts] = useState<RedFlagAlert[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    getCurrentInterview()
      .then((session) => {
        if (active) setAlerts(session.alerts.filter((alert) => alert.priority === "urgent"));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <PatientShell active="Converse">
      <main className="triage-alert-page" role="alert" aria-live="assertive">
        <div className="triage-alert-icon"><AlertTriangle size={38} /></div>
        <PriorityBadge priority="Urgent" />
        <h1>Please speak to the triage team now.</h1>
        <p>
          Your answers contain symptoms that need prompt review by a qualified clinician.
          This alert is a safety rule, not a diagnosis.
        </p>
        {alerts.map((alert) => (
          <div className="card triage-reason" key={alert.id}>
            <strong>{alert.reason}</strong>
            <span>Reported: {alert.evidence.join(" · ")}</span>
          </div>
        ))}
        <div className="triage-actions">
          <a className="button primary" href="tel:112"><PhoneCall size={18} /> Call 112 if this is an emergency</a>
          <button className="button secondary" onClick={() => navigate("/patient/interview")}>
            <ArrowLeft size={18} /> Return to answers
          </button>
        </div>
        <small><ShieldCheck size={14} /> Notify on-site clinical staff immediately if available.</small>
      </main>
    </PatientShell>
  );
}
