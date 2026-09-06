import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientShell from '../components/common/patientShell';
import AuditTimeline from '../components/common/AuditTimeline';
import useAccessibility from '../hooks/useAccessibility';
import useSpeech from '../hooks/useSpeech';
import { apiFetch, apiError } from '../services/api';
import { patientRequest, type PatientProfile, type ProfileDetails, type Medicine, type ProfileDocument, type Visit, type MedicationSummary } from '../services/patient';

const tabs = ['details', 'medicines', 'documents', 'sessions', 'medicationSummary'] as const;
type Tab = typeof tabs[number];

export function ProfileDetailsTab({ profile }: { profile: ProfileDetails }) {
  const { t } = useAccessibility();
  return <dl className="profile-details-grid">{(['full_name', 'date_of_birth', 'gender', 'contact_number', 'address', 'abha_id', 'blood_group', 'allergies', 'emergency_contact', 'preferred_language'] as const).map(key => <div key={key}>
    <dt>{t(`profile.${key}`)}</dt><dd>{Array.isArray(profile[key]) ? profile[key].join(', ') || t('patient.empty') : profile[key] || t('patient.empty')}</dd>
  </div>)}</dl>;
}

export function MedicinesTab({ medicines }: { medicines: Medicine[] }) {
  const { t } = useAccessibility();
  return <>{!medicines.length && <p>{t('patient.empty')}</p>}{['active', 'completed'].map(status => <section key={status}>
    <h3>{t(`patient.${status}`)}</h3>{medicines.filter(m => m.status === status).map(m => <article className="history-row" key={m.id}>
      <strong>{m.name}</strong><p>{m.dosage} · {m.frequency} · {m.route}</p>
      <p>{m.start_date.slice(0, 10)} — {m.end_date?.slice(0, 10) || t('patient.ongoing')}</p>
      {m.prescribed_by && <p>{t('patient.doctor')}: {m.prescribed_by}</p>}{m.notes && <p>{m.notes}</p>}
    </article>)}
  </section>)}</>;
}

export function DocumentsTab({ documents }: { documents: ProfileDocument[] }) {
  const { t } = useAccessibility();
  const [error, setError] = useState('');
  return <>{error && <p role="alert">{error}</p>}{!documents.length && <p>{t('patient.empty')}</p>}{documents.map(d => <article className="history-row" key={d.id}>
    <strong>{d.original_filename}</strong><p>{t(`document.${d.document_type}`)} · {t(`role.${d.uploaded_by_role}`)} {d.uploaded_by_id}</p>
    <p><time dateTime={d.uploaded_at}>{new Date(d.uploaded_at).toLocaleString()}</time></p>
    <button className="button secondary" onClick={async () => {
      try {
        const response = await apiFetch(`/api/documents/${d.id}/download`);
        if (!response.ok) throw await apiError(response);
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = d.original_filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch { setError(t('patient.error')); }
    }}>{t('patient.download')}</button>
  </article>)}</>;
}

export function SessionHistoryTab({ sessions, medicines }: { sessions: Visit[]; medicines: Medicine[] }) {
  const { t } = useAccessibility();
  const [detail, setDetail] = useState<Visit | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => { if (detail) detailRef.current?.focus(); }, [detail]);
  return <>{!sessions.length && <p>{t('patient.empty')}</p>}{sessions.map(s => <article className="history-row" key={s.id}>
    <strong>{new Date(s.created_at).toLocaleString()} · {s.location || t('patient.empty')}</strong>
    <p>{t(`patient.${s.status}`)} · {t('patient.doctor')}: {s.assigned_doctor_id || t('patient.pending')}</p>
    <button disabled={busy} className="button secondary" onClick={async () => {
      setBusy(true); setError('');
      try { setDetail(await patientRequest<Visit>(`/api/patient/sessions/${s.id}`)); }
      catch { setError(t('patient.error')); } finally { setBusy(false); }
    }}>{t('patient.viewSession')}</button>
  </article>)}
    {error && <p role="alert">{error}</p>}
    {detail && <section ref={detailRef} tabIndex={-1} className="card continuity-panel" aria-label={t('patient.session')}>
      <h3>{t('patient.answers')}</h3>{detail.answers.map(a => <div className="history-row" key={a.id}><strong>{a.question_text}</strong><p>{a.value}</p><small>{new Date(a.answered_at).toLocaleString()}</small></div>)}
      {!detail.answers.length && <p>{t('patient.empty')}</p>}
      <h3>{t('patient.prescriptions')}</h3>{detail.prescriptions?.map(p => <article className="history-row" key={p.id}>
        <p>{t('patient.doctor')}: {p.doctor_id} · {new Date(p.issued_at).toLocaleString()}</p><p>{p.notes}</p>
        <MedicinesTab medicines={medicines.filter(m => p.medication_ids.includes(m.id))}/>
      </article>)}{!detail.prescriptions?.length && <p>{t('patient.empty')}</p>}
      <h3>{t('patient.documents')}</h3><DocumentsTab documents={detail.documents ?? []}/>
    </section>}
  </>;
}

export function QRCodeDisplay({ summary }: { summary: MedicationSummary }) {
  const { t } = useAccessibility();
  return <figure className="summary-qr"><img src={summary.qr_image} width="260" height="260" alt={t('patient.qrAlt')}/><figcaption>{t('patient.qrHelp')}</figcaption></figure>;
}

export function MedicationSummaryTab({ summary }: { summary: MedicationSummary | null }) {
  const { t, language } = useAccessibility();
  const speech = useSpeech(language);
  const stop = speech.stopSpeaking;
  useEffect(() => () => stop(), [stop]);
  if (!summary) return <p>{t('patient.empty')}</p>;
  return <><p>{new Date(summary.generated_at).toLocaleString()} · {t(summary.confirmed ? 'patient.confirmed' : 'patient.draft')}</p>
    <p className="medication-summary-text">{summary.content}</p>
    <button className="button secondary" disabled={!speech.speechSynthesisSupported} onClick={() => speech.speaking ? speech.stopSpeaking() : speech.speak(summary.content)}>{t(speech.speaking ? 'patient.stop' : 'patient.listen')}</button>
    <QRCodeDisplay summary={summary}/></>;
}

export default function PatientProfilePage() {
  const { t } = useAccessibility();
  const navigate = useNavigate();
  const [data, setData] = useState<PatientProfile | null>(null);
  const [tab, setTab] = useState<Tab>('details');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    patientRequest<PatientProfile>('/api/patient/profile').then(p => { if (active) setData(p); })
      .catch(() => { if (active) setError(t('patient.error')); });
    return () => { active = false; };
  }, [t]);
  return <PatientShell active="Identify">
    <section className="page-intro"><div><h1>{t('patient.profile')}</h1><p>{data?.profile.full_name}</p></div>
      <button className="button secondary" onClick={() => navigate('/patient/home')}>{t('patient.back')}</button></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!data && !error && <p role="status">{t('patient.loading')}</p>}
    {data && <><div className="profile-tabs" role="tablist" aria-label={t('patient.profile')}>
      {tabs.map((key, index) => <button key={key} id={`tab-${key}`} role="tab" aria-selected={tab === key} aria-controls="profile-panel" tabIndex={tab === key ? 0 : -1} className={`button ${tab === key ? 'primary' : 'secondary'}`} onClick={() => setTab(key)} onKeyDown={e => {
        let next: number;
        if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;
        e.preventDefault(); setTab(tabs[next]); document.getElementById(`tab-${tabs[next]}`)?.focus();
      }}>{t(`patient.${key}`)}</button>)}
    </div><section className="card continuity-panel" role="tabpanel" id="profile-panel" tabIndex={0} aria-labelledby={`tab-${tab}`}>
      {tab === 'details' && <ProfileDetailsTab profile={data.profile}/>}
      {tab === 'medicines' && <MedicinesTab medicines={data.medications}/>}
      {tab === 'documents' && <DocumentsTab documents={data.documents}/>}
      {tab === 'sessions' && <SessionHistoryTab sessions={data.sessions} medicines={data.medications}/>}
      {tab === 'medicationSummary' && <MedicationSummaryTab summary={data.medication_summary}/>}
    </section><AuditTimeline events={data.audit_log}/></>}
  </PatientShell>;
}
