import useAccessibility from '../../hooks/useAccessibility';
import type { AuditEvent } from '../../services/patient';

export default function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const { t } = useAccessibility();
  return <section className="card continuity-panel"><h2>{t('patient.timeline')}</h2>
    {!events.length && <p>{t('patient.empty')}</p>}
    <ol className="audit-list">{events.map(event => <li key={event.id}>
      <strong>{t(`event.${event.event_type}`)}</strong>
      <p><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time> · {t(`role.${event.actor_role}`)} {event.actor_id}</p>
      {event.session_id && <small>{t('patient.session')}: {event.session_id}</small>}
      {typeof event.metadata.location === 'string' && <p>{event.metadata.location}</p>}
      {typeof event.metadata.doctor_name === 'string' && <p>{event.metadata.doctor_name}</p>}
    </li>)}</ol>
  </section>;
}
