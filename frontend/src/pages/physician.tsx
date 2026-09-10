import { formatNumber } from "../i18n";
import Loader from "../components/common/Loader";
import Skeleton from "../components/common/Skeleton";
import { errorText } from "../i18n";
import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
import {
  Activity,
  ArrowRight,
  Clock3,
  FileText,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PriorityBadge from "../components/common/priorityBadge";
import Footer from "../components/layout/footer";
import Header from "../components/layout/header";
import { getPhysicianQueue } from "../services/physician";
import type { QueuePatient } from "../types/physician.type";
import { useNavigate } from "react-router-dom";

const priorityLabel = (value: QueuePatient["priority"]) =>
  value === "urgent" ? "Urgent" : value === "priority" ? "Priority" : "Routine";

export default function Physician() {
  useTranslation();
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const queue = await getPhysicianQueue();
        if (!active) return;
        setPatients(queue);
        timer = setTimeout(load, 5000);
      } catch { if (active) setError('errors:queue_unavailable'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [retryCount]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter(
      (patient) =>
        !query ||
        [patient.display_name, patient.token, patient.complaint].some((value) =>
          value.toLowerCase().includes(query),
        ),
    );
  }, [patients, search]);
  const priorityCount = patients.filter(
    (patient) => patient.priority !== "routine",
  ).length;
  const documentCount = patients.reduce(
    (total, patient) => total + patient.document_count,
    0,
  );
  const stats = [
    ["physician:waiting_patients", patients.length, Clock3],
    ["physician:priority_cases", priorityCount, Zap],
    ["physician:submitted_histories", patients.length, Activity],
    ["physician:source_documents", documentCount, FileText],
  ] as const;
  const navigate = useNavigate();
  return (
    <>
      <Header physician />
      <main className="physician-main" id="physician-content" tabIndex={-1}>
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">{ui("physician:live_consultation_queue")}</span>
            <h1>{ui("physician:opd_consultation_queue")}</h1>
            <p>{ui("physician:redflag_patients_are_automatically_placed_first")}</p>
          </div>
        </div>
        <div className="stats-grid" aria-label={ui("physician:queue_statistics")}>
          {stats.map(([label, value, Icon]) => (
            <div className="card stat-card" key={label}>
              <div className="stat-icon">
                <Icon size={18} />
              </div>
              <span>{ui(label)}</span>
              <strong>{formatNumber(value)}</strong>
              <small>{ui("physician:live_demo_data")}</small>
            </div>
          ))}
        </div>
        <div className="ai-review-note physician-ai-notice" role="note">
          <Sparkles size={16} />
          <span>{ui("physician:all_histories_are_aidrafted_organisational_aidsnot_diagnosesand_require")}</span>
        </div>
        <section className="card queue-card" aria-labelledby="queue-heading">
          <div className="card-title">
            <div>
              <h2 id="queue-heading">{ui("physician:patient_queue")}</h2>
              <p className="muted">{ui("physician:priority_order_newest_data")}</p>
            </div>
            <label className="search-box">
              <Search size={17} />
              <span className="sr-only">{ui("physician:search_patients")}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={ui("physician:search_patients")}
              />
            </label>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {errorText(error)}<button className="button secondary" onClick={() => setRetryCount(n => n + 1)}>{ui("common:retry")}</button>
            </div>
          )}
          {loading && (patients.length ? <Loader /> : <Skeleton />)}<div className="table-wrap" aria-busy={loading}>
            <table>
              <thead>
                <tr>
                  <th>{ui("physician:patient")}</th>
                  <th>{ui("physician:complaint")}</th>
                  <th>{ui("physician:priority")}</th>
                  <th>{ui("physician:wait")}</th>
                  <th>{ui("physician:history")}</th>
                  <th>
                    <span className="sr-only">{ui("physician:actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.patient_id}>
                    <td>
                      <div className="table-patient">
                        <span className="avatar small-avatar">
                          {patient.token.slice(-2)}
                        </span>
                        <div>
                          <strong>{patient.display_name}</strong>
                          <small>
                            {patient.token}{ui("physician:position")}{formatNumber(patient.queue_position)}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {patient.complaint}
                      <small>{ui(patient.department)}</small><small>{patient.location} · {patient.doctor_name || ui("physician:awaiting_doctor_assignment")}</small>
                    </td>
                    <td>
                      <PriorityBadge
                        priority={priorityLabel(patient.priority)}
                      />
                      {patient.red_flags.length > 0 && (
                        <small>{formatNumber(patient.red_flags.length)}{ui("physician:red_flags")}</small>
                      )}
                    </td>
                    <td>
                      <Clock3 size={14} /> {ui("common:waitMinutes", { value: formatNumber(patient.estimated_wait_minutes) })}</td>
                    <td>
                      <div className="mini-progress">
                        <span style={{ width: "100%" }} />
                      </div>
                      <small>{ui(patient.summary_status)}</small>
                    </td>
                    <td>
                      <button
                        className="open-button"
                        aria-label={ui("common:fileAction", { action: ui("physician:open"), filename: patient.token })}
                        onClick={() =>
                          navigate(
                            `/physician/patient/${encodeURIComponent(patient.patient_id)}`,
                          )
                        }
                      >{ui("physician:open")}<ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>{ui("physician:no_submitted_patients_are_waiting")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
