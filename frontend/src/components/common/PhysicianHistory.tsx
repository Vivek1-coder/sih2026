import Loader from "./Loader";
import Skeleton from "./Skeleton";
import { errorText } from "../../i18n";
import { useTranslation } from 'react-i18next';
import { ui } from "../../i18n";
import { useEffect, useState } from 'react';
import AuditTimeline from './AuditTimeline';
import { patientRequest, type AuditEvent } from '../../services/patient';

export default function PhysicianHistory({ patientId, sessionId }: { patientId: string; sessionId: string }) {
  useTranslation();
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setLoading(true); setMessage("");
    patientRequest<AuditEvent[]>(`/api/physician/patient/${patientId}/audit-log`)
      .then(data => { if (active) setEvents(data); })
      .catch(() => { if (active) setMessage("errors:sign_in_as_the_assigned_physician_to_view_the"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId, retryCount]);
  return <section>
    {loading ? <Skeleton /> : <AuditTimeline events={events}/>}
    <form className="card continuity-form" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      const form = event.currentTarget;
      const fields = new FormData(form);
      setBusy(true); setMessage('');
      try {
        await patientRequest('/api/physician/prescriptions', { method: 'POST', body: JSON.stringify({
          session_id: sessionId, notes: fields.get('notes'), medications: [{
            name: fields.get('name'), dosage: fields.get('dosage'), frequency: fields.get('frequency'), route: fields.get('route'),
            start_date: fields.get('start_date'), end_date: fields.get('end_date') || null,
          }],
        }) });
        form.reset(); setMessage("errors:prescription_issued");
        setEvents(await patientRequest<AuditEvent[]>(`/api/physician/patient/${patientId}/audit-log`));
      } catch (error) { setMessage(error instanceof Error ? error.message : "errors:unable_to_issue_prescription"); }
      finally { setBusy(false); }
    }}>
      <h2>{ui("PhysicianHistory:issue_prescription")}</h2>
      <label>{ui("PhysicianHistory:medicine")}<input name="name" required maxLength={200}/></label>
      <label>{ui("PhysicianHistory:dosage")}<input name="dosage" required maxLength={200}/></label>
      <label>{ui("PhysicianHistory:frequency")}<input name="frequency" required maxLength={200}/></label>
      <label>{ui("PhysicianHistory:route")}<input name="route" maxLength={100}/></label>
      <label>{ui("PhysicianHistory:start_date")}<input name="start_date" type="date" required/></label>
      <label>{ui("PhysicianHistory:end_date_optional")}<input name="end_date" type="date"/></label>
      <label>{ui("PhysicianHistory:notes")}<textarea name="notes" maxLength={5000}/></label>
      <button className="button primary" disabled={busy}>{busy ? <Loader /> : ui("PhysicianHistory:issue_prescription")}</button>
      {message && <p role="status">{errorText(message)}<button type="button" disabled={loading || busy} onClick={() => setRetryCount(n => n + 1)}>{ui("common:retry")}</button></p>}
    </form>
  </section>;
}
