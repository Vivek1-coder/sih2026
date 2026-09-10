import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
import { AlertTriangle, ArrowLeft, PhoneCall, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import PatientShell from "../components/common/patientShell";
import PriorityBadge from "../components/common/priorityBadge";
import { getCurrentInterview } from "../services/interview";
import type { RedFlagAlert } from "../types/interview.type";
import { useNavigate } from "react-router-dom";

export default function TriageAlert() {
  useTranslation();
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
        <h1>{ui("triageAlert:please_speak_to_the_triage_team_now")}</h1>
        <p>{ui("triageAlert:your_answers_contain_symptoms_that_need_prompt_review")}</p>
        {alerts.map((alert) => (
          <div className="card triage-reason" key={alert.id}>
            <strong>{alert.reason}</strong>
            <span>{ui("triageAlert:reported")}{alert.evidence.join(" · ")}</span>
          </div>
        ))}
        <div className="triage-actions">
          <a className="button primary" href="tel:112"><PhoneCall size={18} />{ui("triageAlert:call_112_if_this_is_an_emergency")}</a>
          <button className="button secondary" onClick={() => navigate("/patient/interview")}>
            <ArrowLeft size={18} />{ui("triageAlert:return_to_answers")}</button>
        </div>
        <small><ShieldCheck size={14} />{ui("triageAlert:notify_onsite_clinical_staff_immediately_if_available")}</small>
      </main>
    </PatientShell>
  );
}
