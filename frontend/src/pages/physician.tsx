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
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => getPhysicianQueue()
      .then((queue) => active && setPatients(queue))
      .catch(
        (reason) =>
          active &&
          setError(
            reason instanceof Error ? reason.message : "Queue unavailable",
          ),
      );
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      window.clearInterval(timer);
      active = false;
    };
  }, []);
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
    ["Waiting patients", patients.length, Clock3],
    ["Priority cases", priorityCount, Zap],
    ["Submitted histories", patients.length, Activity],
    ["Source documents", documentCount, FileText],
  ] as const;
  const navigate = useNavigate();
  return (
    <>
      <Header physician />
      <main className="physician-main" id="physician-content" tabIndex={-1}>
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Live consultation queue</span>
            <h1>OPD consultation queue</h1>
            <p>Red-flag patients are automatically placed first.</p>
          </div>
        </div>
        <div className="stats-grid" aria-label="Queue statistics">
          {stats.map(([label, value, Icon]) => (
            <div className="card stat-card" key={label}>
              <div className="stat-icon">
                <Icon size={18} />
              </div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>Live demo data</small>
            </div>
          ))}
        </div>
        <div className="ai-review-note physician-ai-notice" role="note">
          <Sparkles size={16} />
          <span>
            All histories are AI-drafted organisational aids—not diagnoses—and
            require physician review before confirmation.
          </span>
        </div>
        <section className="card queue-card" aria-labelledby="queue-heading">
          <div className="card-title">
            <div>
              <h2 id="queue-heading">Patient queue</h2>
              <p className="muted">Priority order · newest data</p>
            </div>
            <label className="search-box">
              <Search size={17} />
              <span className="sr-only">Search patients</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patients"
              />
            </label>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Complaint</th>
                  <th>Priority</th>
                  <th>Wait</th>
                  <th>History</th>
                  <th>
                    <span className="sr-only">Actions</span>
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
                            {patient.token} · position {patient.queue_position}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {patient.complaint}
                      <small>{patient.department}</small><small>{patient.location} · {patient.doctor_name || "Awaiting doctor assignment"}</small>
                    </td>
                    <td>
                      <PriorityBadge
                        priority={priorityLabel(patient.priority)}
                      />
                      {patient.red_flags.length > 0 && (
                        <small>{patient.red_flags.length} red flag(s)</small>
                      )}
                    </td>
                    <td>
                      <Clock3 size={14} /> ~{patient.estimated_wait_minutes} min
                    </td>
                    <td>
                      <div className="mini-progress">
                        <span style={{ width: "100%" }} />
                      </div>
                      <small>{patient.summary_status}</small>
                    </td>
                    <td>
                      <button
                        className="open-button"
                        aria-label={`Open ${patient.token}`}
                        onClick={() =>
                          navigate(
                            `/physician/patient/${encodeURIComponent(patient.patient_id)}`,
                          )
                        }
                      >
                        Open <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>No submitted patients are waiting.</td>
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
