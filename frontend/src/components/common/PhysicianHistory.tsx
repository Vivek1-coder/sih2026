import { useEffect, useState } from 'react';
import AuditTimeline from './AuditTimeline';
import { patientRequest, type AuditEvent } from '../../services/patient';

export default function PhysicianHistory({ patientId, sessionId }: { patientId: string; sessionId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    patientRequest<AuditEvent[]>(`/api/physician/patient/${patientId}/audit-log`)
      .then(data => { if (active) setEvents(data); })
      .catch(() => { if (active) setMessage('Sign in as the assigned physician to view the audit trail and issue prescriptions.'); });
    return () => { active = false; };
  }, [patientId]);
  return <section>
    <AuditTimeline events={events}/>
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
        form.reset(); setMessage('Prescription issued.');
        setEvents(await patientRequest<AuditEvent[]>(`/api/physician/patient/${patientId}/audit-log`));
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to issue prescription.'); }
      finally { setBusy(false); }
    }}>
      <h2>Issue prescription</h2>
      <label>Medicine<input name="name" required maxLength={200}/></label>
      <label>Dosage<input name="dosage" required maxLength={200}/></label>
      <label>Frequency<input name="frequency" required maxLength={200}/></label>
      <label>Route<input name="route" maxLength={100}/></label>
      <label>Start date<input name="start_date" type="date" required/></label>
      <label>End date (optional)<input name="end_date" type="date"/></label>
      <label>Notes<textarea name="notes" maxLength={5000}/></label>
      <button className="button primary" disabled={busy}>{busy ? 'Issuing…' : 'Issue prescription'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </section>;
}
