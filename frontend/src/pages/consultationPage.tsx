import { AlertTriangle, Check, ChevronLeft, FileText, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import PriorityBadge from "../components/common/priorityBadge";
import Footer from "../components/layout/footer";
import Header from "../components/layout/header";
import { getPhysicianPatientSummary } from "../services/physician";
import { updateSummary } from "../services/summary";
import type { PhysicianPatientSummary } from "../types/physician.type";

export default function Consultation({ go }: { go: (path: string) => void }) {
  const patientId = decodeURIComponent(window.location.pathname.split("/").pop() ?? "");
  const [consult, setConsult] = useState<PhysicianPatientSummary | null>(null);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    getPhysicianPatientSummary(patientId).then((payload) => { if (active) { setConsult(payload); setSections(payload.summary.sections); } }).catch((reason) => active && setMessage(reason instanceof Error ? reason.message : "Consultation unavailable"));
    return () => { active = false; };
  }, [patientId]);
  const persist = async (confirm: boolean) => {
    if (!consult) return;
    setSaving(true); setMessage("");
    try {
      const updated = await updateSummary(consult.summary.id, { sections, status: confirm ? "confirmed" : "draft" });
      setConsult({ ...consult, summary: updated });
      setMessage(confirm ? "Clinical history confirmed by physician." : "Draft edits saved.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save summary"); }
    finally { setSaving(false); }
  };
  const confirmed = consult?.summary.status === "confirmed";
  const priority = consult?.queue.priority === "urgent" ? "Urgent" : consult?.queue.priority === "priority" ? "Priority" : "Routine";
  return <><Header go={go} physician /><main className="consult-main"><button className="back-link" onClick={() => go("/physician")}><ChevronLeft size={17} /> Back to queue</button>
    {message && !consult && <div className="form-error" role="alert">{message}</div>}
    {consult && <><div className="consult-head"><div className="table-patient"><span className="avatar large-avatar">{consult.queue.token.slice(-2)}</span><div><span className="eyebrow">Consult-ready history</span><h1>{consult.queue.display_name}</h1><p>{consult.queue.token} · {consult.queue.department} · version {consult.summary.version}</p></div></div><div className="consult-actions"><PriorityBadge priority={priority} /></div></div>
      {consult.queue.red_flags.length > 0 && <div className="flag-banner" role="alert"><AlertTriangle size={20} /><div><strong>Priority triage signal</strong><p>{consult.queue.red_flags.join(" · ")}</p></div></div>}
      <div className="ai-review-note physician-summary-warning" role="note"><Sparkles size={17} /><strong>AI-drafted history—not an autonomous diagnosis.</strong><span>Compare every field with the patient and source documents before confirming.</span></div>
      <div className="consult-grid summary-consult-grid"><aside className="card consult-timeline"><h2>Source record</h2><h3>Interview</h3><p className="muted">{consult.interview.answers.length} answers · {consult.interview.preferred_language}</p><h3>Documents</h3>{consult.documents.length === 0 ? <p className="muted">No documents uploaded</p> : consult.documents.map((document) => <div className="consult-file" key={document.id}><FileText size={14} /><span>{document.original_filename}</span><Check size={13} /></div>)}<h3>ABDM demo push</h3><p className="muted">{consult.abdm?.bundle_id ?? "Not pushed"}</p></aside>
        <section className="history-column physician-editable-summary" aria-label="Structured clinical history">{Object.entries(sections).map(([title, value]) => <label className="card editable-history" key={title}><span className="section-label">{title}</span><textarea value={value} rows={Math.max(2, Math.ceil(value.length / 80))} onChange={(event) => setSections((current) => ({ ...current, [title]: event.target.value }))} disabled={confirmed} /><small>AI-organised · physician verification required</small></label>)}</section>
        <aside className="card clinical-actions"><h2>Physician controls</h2><p className="muted">Saving keeps the draft editable. Confirmation records clinical review.</p><button className="button secondary full" onClick={() => persist(false)} disabled={saving || confirmed}><Save size={17} /> Save draft edits</button><button className="button primary full" onClick={() => persist(true)} disabled={saving || confirmed}><Check size={17} /> {confirmed ? "History confirmed" : "Confirm reviewed history"}</button>{message && <div className="success-note" role="status">{message}</div>}</aside></div>
    </>}
  </main><Footer /></>;
}
