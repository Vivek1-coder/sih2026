import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PatientShell from '../components/common/patientShell';
import useAccessibility from '../hooks/useAccessibility';
import { patientRequest, type Visit } from '../services/patient';

export default function LocationPicker() {
  const { t } = useAccessibility();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [locations, setLocations] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('other');
  const [other, setOther] = useState('');
  const [type, setType] = useState('other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    patientRequest<{ locations: string[] }>('/api/patient/locations').then(r => { if (active) setLocations(r.locations); })
      .catch(() => { if (active) setError(t('patient.locationFallback')); });
    return () => { active = false; };
  }, [t]);
  const location = selected === 'other' ? other.trim() : selected;
  return <PatientShell active="Converse">
    <section className="page-intro"><div><h1>{t('patient.location')}</h1><p>{t('patient.locationHelp')}</p></div></section>
    <form className="card continuity-form" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try {
        const resume = params.get('resume');
        const visit = await patientRequest<Visit>(resume ? `/api/patient/sessions/${encodeURIComponent(resume)}/resume` : '/api/patient/sessions/start', {
          method: 'POST', body: JSON.stringify({ location, location_type: type }),
        });
        sessionStorage.setItem('medikiosk-visit', visit.id);
        navigate(resume ? visit.next_path : '/patient/consent');
      } catch { setError(t('patient.error')); } finally { setBusy(false); }
    }}>
      <label>{t('patient.searchLocation')}<input value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>{t('patient.facility')}<select value={selected} onChange={e => { setSelected(e.target.value); setType(e.target.value === 'other' ? 'other' : 'on_site'); }}>
        <option value="other">{t('patient.other')}</option>
        {locations.filter(l => l.toLowerCase().includes(query.toLowerCase()) || l === selected).map(l => <option key={l}>{l}</option>)}
      </select></label>
      {selected === 'other' && <label>{t('patient.otherLocation')}<input required minLength={2} maxLength={200} value={other} onChange={e => setOther(e.target.value)} /></label>}
      <label>{t('patient.visitType')}<select value={type} onChange={e => setType(e.target.value)}>{['on_site', 'remote', 'other'].map(v => <option value={v} key={v}>{t(`patient.${v}`)}</option>)}</select></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy || location.length < 2}>{t(busy ? 'patient.saving' : 'patient.continue')}</button>
      <button type="button" className="button secondary" onClick={() => navigate('/patient/home')}>{t('patient.back')}</button>
    </form>
  </PatientShell>;
}
