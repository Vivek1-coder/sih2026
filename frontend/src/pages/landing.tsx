import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Brain,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  Languages,
  Mic2,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Pill,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Header from "../components/layout/header";
import Footer from "../components/layout/footer";
import "./styles/landing.css";
import ClinicalHistoryItem from "../components/common/ClinicalHistoryItem";

interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
}

const workflowSteps: WorkflowStep[] = [
  {
    number: "01",
    title: "Identify",
    description: "Verify who you are.",
    detail: "ABHA, Aadhaar or new patient",
    icon: UserRound,
  },
  {
    number: "02",
    title: "Converse",
    description: "Speak naturally.",
    detail: "Voice + adaptive questions",
    icon: AudioLines,
  },
  {
    number: "03",
    title: "Scan",
    description: "Add your records.",
    detail: "Reports, prescriptions & files",
    icon: ScanLine,
  },
  {
    number: "04",
    title: "Summarize",
    description: "AI drafts your history.",
    detail: "Patient-reviewed summary",
    icon: ClipboardList,
  },
  {
    number: "05",
    title: "Consult",
    description: "Walk in prepared.",
    detail: "More time for care",
    icon: Stethoscope,
  },
];

/** Reveals its target once, the first time it scrolls into view. */
function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function Landing() {
  const navigate = useNavigate();
  const { ref: workflowRef, inView: workflowInView } =
    useInView<HTMLDivElement>();

  return (
    <>
      <Header />

      <main className="landing-page">
        {/* Radial-intersection lotus-petal background */}
        {/* <div className="petal-background" aria-hidden="true">
          <div className="petal-cluster petal-cluster-one">
            {Array.from({ length: 10 }).map((_, index) => (
              <span className="radial-petal" key={`hero-petal-${index}`} />
            ))}
          </div>

          <div className="petal-cluster petal-cluster-two">
            {Array.from({ length: 5 }).map((_, index) => (
              <span className="radial-petal" key={`side-petal-${index}`} />
            ))}
          </div>

          <span className="floating-petal floating-petal-one" />
          <span className="floating-petal floating-petal-two" />
        </div> */}

        <section className="landing-hero">
          <div className="hero-background-grid" />
          <div className="hero-gradient hero-gradient-one" />
          <div className="hero-gradient hero-gradient-two" />

          <div className="landing-container hero-layout">
            {/* LEFT */}
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-pulse" />
                AI-powered clinical intake
              </div>

              <h1 className="hero-title flex items-center">
                Medi<span className="hero-title-gradient">Kiosk</span>
              </h1>

              <p className="hero-description">
                Your story, structured before you meet your doctor.
              </p>

              <div className="hero-buttons">
                <button
                  className="hero-button hero-button-primary"
                  onClick={() => navigate("/patient/identify")}
                >
                  Start check-in
                  <span className="button-icon-circle">
                    <ArrowRight size={17} />
                  </span>
                </button>

                <button
                  className="hero-button hero-button-secondary"
                  onClick={() => navigate("/physician")}
                >
                  <Stethoscope size={18} />
                  Physician dashboard
                </button>
              </div>

              <div className="hero-trust">
                <div className="trust-item glass-card glass-trust-card">
                  <div className="trust-icon">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <strong>Consent-first</strong>
                    <span>Privacy protected</span>
                  </div>
                </div>

                <div className="trust-item glass-card glass-trust-card">
                  <div className="trust-icon">
                    <Languages size={17} />
                  </div>
                  <div>
                    <strong>Multilingual</strong>
                    <span>7 Indian languages</span>
                  </div>
                </div>

                <div className="trust-item glass-card glass-trust-card">
                  <div className="trust-icon">
                    <Mic2 size={17} />
                  </div>
                  <div>
                    <strong>Voice-first</strong>
                    <span>Speak naturally</span>
                  </div>
                </div>
              </div>
            </div>
            {/* RIGHT BENTO VISUAL */}
            <div className="hero-visual">
              <div className="hero-bento neon-bento">
                {/* Main Patient Journey */}
                <div className="bento-card orb-card neon-card neon-card-main">
                  <div className="card-shine" />
                  <div className="card-grid" />

                  <div className="orb-card-top">
                    <span>
                      <span className="neon-icon-box">
                        <Sparkles size={15} />
                      </span>
                      Patient journey
                    </span>

                    <span className="live-indicator">
                      <i />
                      Active
                    </span>
                  </div>

                  <div className="health-orb-scene">
                    <div className="health-orb">
                      <div className="orb-glow" />

                      <div className="orb-ring orb-ring-one">
                        <span className="ring-dot ring-dot-one" />
                      </div>

                      <div className="orb-ring orb-ring-two">
                        <span className="ring-dot ring-dot-two" />
                      </div>

                      <div className="orb-ring orb-ring-three">
                        <span className="ring-dot ring-dot-three" />
                      </div>

                      <div className="orb-core">
                        <div className="orb-core-inner">
                          <HeartPulse size={46} strokeWidth={1.7} />
                        </div>
                      </div>

                      <div className="orbit-node orbit-node-one">
                        <Mic2 size={15} />
                      </div>

                      <div className="orbit-node orbit-node-two">
                        <FileText size={15} />
                      </div>

                      <div className="orbit-node orbit-node-three">
                        <Brain size={15} />
                      </div>
                    </div>
                  </div>

                  <div className="orb-status">
                    <svg
                      className="orb-status-trace"
                      viewBox="0 0 232 22"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        className="trace-base"
                        d="M0,11 L70,11 L80,3 L90,19 L100,11 L110,11 L118,1 L126,21 L134,11 L232,11"
                      />

                      <path
                        className="trace-glow"
                        d="M0,11 L70,11 L80,3 L90,19 L100,11 L110,11 L118,1 L126,21 L134,11 L232,11"
                      />

                      <path
                        className="trace-pulse"
                        d="M0,11 L70,11 L80,3 L90,19 L100,11 L110,11 L118,1 L126,21 L134,11 L232,11"
                      />
                    </svg>
                  </div>
                </div>

                {/* Patient score */}
                <div className="bento-card neon-card patient-score-card">
                  <div className="card-shine" />

                  <div className="patient-score-top">
                    <div className="neon-icon-box cyan">
                      <UserRound size={20} />
                    </div>

                    <span className="score-status">
                      <i />
                      Captured
                    </span>
                  </div>

                  <div className="patient-score-content">
                    <div>
                      <span className="neon-eyebrow">Patient</span>
                      <strong>History captured</strong>
                      <p>Clinical intake completeness</p>
                    </div>

                    <div className="neon-progress-ring">
                      <div className="progress-ring-inner">
                        <strong>94</strong>
                        <span>%</span>
                      </div>
                    </div>
                  </div>

                  <div className="score-progress">
                    <span />
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bento-card neon-card summary-mini-card neon-purple">
                  <div className="card-shine" />

                  <div className="mini-card-header">
                    <div className="neon-icon-box purple">
                      <Brain size={18} />
                    </div>

                    <div>
                      <span className="neon-eyebrow">AI Engine</span>
                      <strong>Clinical summary</strong>
                    </div>
                  </div>

                  <div className="summary-lines">
                    <span className="summary-line line-90" />
                    <span className="summary-line line-75" />
                    <span className="summary-line line-55" />
                  </div>

                  <div className="summary-ready">
                    <CheckCircle2 size={14} />
                    Ready for physician review
                  </div>
                </div>

                {/* Languages */}
                <div className="bento-card neon-card languages-card neon-cyan">
                  <div className="card-shine" />

                  <div className="neon-icon-box cyan">
                    <Languages size={19} />
                  </div>

                  <div className="languages-content">
                    <span className="neon-eyebrow">Accessibility</span>
                    <strong>
                      <span className="metric-number">7</span> languages
                    </strong>
                    <small>Inclusive by design</small>
                  </div>

                  <div className="language-orbit">
                    <span>हि</span>
                    <span>EN</span>
                    <span>ব</span>
                  </div>
                </div>

                {/* Time */}
                <div className="bento-card neon-card time-card neon-deep">
                  <div className="time-card-glow" />

                  <div className="time-card-top">
                    <div className="neon-icon-box blue">
                      <Clock3 size={19} />
                    </div>

                    <span className="speed-badge">FAST</span>
                  </div>

                  <div className="time-value">
                    <strong>Seconds</strong>
                  </div>

                  <p>
                    to a physician-ready
                    <br />
                    clinical summary.
                  </p>

                  <div className="time-wave">
                    {[20, 45, 30, 60, 38, 75, 45, 85, 50, 67, 35, 55].map(
                      (height, index) => (
                        <span
                          key={index}
                          style={{
                            height: `${height}%`,
                            animationDelay: `${index * 0.08}s`,
                          }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="workflow-section-new">
          <div className="landing-container">
            <div className="section-header workflow-heading">
              <div>
                <span className="section-label dark-label">
                  One connected journey
                </span>

                <h2>Five steps to a clearer consult.</h2>
              </div>

              <p>Clinical context, ready before you walk in.</p>
            </div>

            <div
              className={`workflow-timeline${
                workflowInView ? " is-revealed" : ""
              }`}
              ref={workflowRef}
            >
              <div className="workflow-line" />

              {workflowSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article
                    className="workflow-step-card glass-card"
                    key={step.number}
                  >
                    <div className="workflow-number">{step.number}</div>

                    <div className="workflow-step-icon">
                      <Icon size={23} />
                    </div>

                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <span>{step.detail}</span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-container">
            <div className="section-header centered-heading">
              <span className="section-label">
                <Sparkles size={14} />
                Built around the consultation
              </span>

              <div className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
                One connected journey from
                <br />
                <span className="text-blue-600">Patient to Physician</span>
              </div>
            </div>

            <div className="feature-bento-grid">
              <article className="feature-bento feature-large glass-card">
                <div className="feature-bento-heading">
                  <span className="feature-icon">
                    <ClipboardList size={21} />
                  </span>

                  <span className="feature-tag">
                    Structured Clinical History
                  </span>
                </div>

                <div className="clinical-preview">
                  <ClinicalHistoryItem
                    icon={Stethoscope}
                    heading="Chief complaint"
                    exp="Intermittent chest discomfort for 3 days"
                  />

                  {/* <ClinicalHistoryItem
                    icon={AlertCircle}
                    heading="History of present illness"
                    exp="Pain increases with exertion and improves with rest"
                  /> */}

                  {/* <ClinicalHistoryItem
                    icon={History}
                    heading="Past medical history"
                    exp="Hypertension diagnosed 4 years ago"
                  /> */}

                  <ClinicalHistoryItem
                    icon={Pill}
                    heading="Current medications"
                    exp="Amlodipine 5 mg once daily"
                  />

                  <ClinicalHistoryItem
                    icon={ShieldAlert}
                    heading="Known allergies"
                    exp="No known drug allergies"
                  />

                  <ClinicalHistoryItem
                    icon={Users}
                    heading="Family history"
                    exp="Father had coronary artery disease"
                  />
                </div>
              </article>

              <article className="feature-bento feature-summary glass-card">
                <div className="feature-bento-heading">
                  <span className="feature-icon">
                    <AudioLines size={21} />
                  </span>

                  <span className="feature-tag">Speak naturally</span>
                </div>

                <div className="voice-visual">
                  {[32, 58, 42, 70, 36, 66, 86, 48, 74, 42, 64, 30].map(
                    (height, index) => (
                      <span key={index} style={{ height: `${height}%` }} />
                    ),
                  )}
                </div>

                <div className="speech-bubble glass-subcard">
                  <span className="speech-avatar">
                    <Mic2 size={15} />
                  </span>
                  “Tell me when the chest discomfort first started.”
                </div>
              </article>

              <article className="feature-bento feature-safety glass-card">
                <span className="feature-icon green">
                  <ShieldCheck size={21} />
                </span>

                <h3>Consent stays visible.</h3>

                <p>
                  Patients review their history before it reaches the physician.
                </p>

                <div className="consent-row glass-pill">
                  <Check size={15} />
                  Patient reviewed
                </div>
              </article>

              <article className="feature-bento feature-doctor glass-card">
                <div className="doctor-header">
                  <div>
                    <span className="feature-tag">Physician view</span>
                    <h3>Everything important, one screen.</h3>
                  </div>

                  <div className="doctor-avatar">
                    <Stethoscope size={20} />
                  </div>
                </div>

                <div className="doctor-dashboard-preview glass-subcard">
                  <div className="dashboard-sidebar">
                    <span className="sidebar-logo">
                      <HeartPulse size={17} />
                    </span>

                    <span className="sidebar-item active" />
                    <span className="sidebar-item" />
                    <span className="sidebar-item" />
                    <span className="sidebar-item" />
                  </div>

                  <div className="dashboard-content">
                    <div className="dashboard-top">
                      <span>Patient overview</span>
                      <span className="dashboard-status">Reviewed</span>
                    </div>

                    <div className="dashboard-patient">
                      <div className="dashboard-patient-avatar">
                        <UserRound size={17} />
                      </div>

                      <div>
                        <strong>Patient #MK-1024</strong>
                        <span>Prepared history</span>
                      </div>
                    </div>

                    <div className="dashboard-grid">
                      <div>
                        <span>Symptoms</span>
                        <strong>4 captured</strong>
                      </div>

                      <div>
                        <span>Documents</span>
                        <strong>3 analysed</strong>
                      </div>
                    </div>

                    <div className="dashboard-summary-block">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="privacy-section">
          <div className="landing-container">
            <div className="privacy-banner glass-card privacy-glass">
              <div className="privacy-banner-icon">
                <ShieldCheck size={23} />
              </div>

              <div>
                <strong>Your information stays yours.</strong>
                <p>
                  Fictional demo — no real health or identity data is collected.
                </p>
              </div>

              <ArrowRight className="privacy-arrow" size={19} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
