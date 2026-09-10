import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
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
    title: "landing:identify",
    description: "landing:verify_who_you_are",
    detail: "landing:abha_aadhaar_or_new_patient",
    icon: UserRound,
  },
  {
    number: "02",
    title: "landing:converse",
    description: "landing:speak_naturally_1",
    detail: "landing:voice_adaptive_questions",
    icon: AudioLines,
  },
  {
    number: "03",
    title: "landing:scan",
    description: "landing:add_your_records",
    detail: "landing:reports_prescriptions_files",
    icon: ScanLine,
  },
  {
    number: "04",
    title: "landing:summarize",
    description: "landing:ai_drafts_your_history",
    detail: "landing:patientreviewed_summary",
    icon: ClipboardList,
  },
  {
    number: "05",
    title: "landing:consult",
    description: "landing:walk_in_prepared",
    detail: "landing:more_time_for_care",
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
  useTranslation();
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
                <span className="badge-pulse" />{ui("landing:aipowered_clinical_intake")}</div>

              <h1 className="hero-title flex items-center">{ui("landing:medi")}<span className="hero-title-gradient">{ui("landing:kiosk")}</span>
              </h1>

              <p className="hero-description">{ui("landing:your_story_structured_before_you_meet_your_doctor")}</p>

              <div className="hero-buttons">
                <button
                  className="hero-button hero-button-primary"
                  onClick={() => navigate("/patient/identify")}
                >{ui("landing:start_checkin")}<span className="button-icon-circle">
                    <ArrowRight size={17} />
                  </span>
                </button>

                <button
                  className="hero-button hero-button-secondary"
                  onClick={() => navigate("/physician")}
                >
                  <Stethoscope size={18} />{ui("landing:physician_dashboard")}</button>
              </div>

              <div className="hero-trust">
                <div className="trust-item glass-card glass-trust-card">
                  <div className="trust-icon">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <strong>{ui("landing:consentfirst")}</strong>
                    <span>{ui("landing:privacy_protected")}</span>
                  </div>
                </div>

                <div className="trust-item glass-card glass-trust-card">
                  <div className="trust-icon">
                    <Languages size={17} />
                  </div>
                  <div>
                    <strong>{ui("landing:multilingual")}</strong>
                    <span>{ui("landing:7_indian_languages")}</span>
                  </div>
                </div>

                <div className="trust-item glass-card glass-trust-card">
                  <div className="trust-icon">
                    <Mic2 size={17} />
                  </div>
                  <div>
                    <strong>{ui("landing:voicefirst")}</strong>
                    <span>{ui("landing:speak_naturally")}</span>
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
                      </span>{ui("landing:patient_journey")}</span>

                    <span className="live-indicator">
                      <i />{ui("landing:active")}</span>
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
                      <i />{ui("landing:captured")}</span>
                  </div>

                  <div className="patient-score-content">
                    <div>
                      <span className="neon-eyebrow">{ui("landing:patient")}</span>
                      <strong>{ui("landing:history_captured")}</strong>
                      <p>{ui("landing:clinical_intake_completeness")}</p>
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
                      <span className="neon-eyebrow">{ui("landing:ai_engine")}</span>
                      <strong>{ui("landing:clinical_summary")}</strong>
                    </div>
                  </div>

                  <div className="summary-lines">
                    <span className="summary-line line-90" />
                    <span className="summary-line line-75" />
                    <span className="summary-line line-55" />
                  </div>

                  <div className="summary-ready">
                    <CheckCircle2 size={14} />{ui("landing:ready_for_physician_review")}</div>
                </div>

                {/* Languages */}
                <div className="bento-card neon-card languages-card neon-cyan">
                  <div className="card-shine" />

                  <div className="neon-icon-box cyan">
                    <Languages size={19} />
                  </div>

                  <div className="languages-content">
                    <span className="neon-eyebrow">{ui("landing:accessibility")}</span>
                    <strong>
                      <span className="metric-number">2</span>{ui("landing:languages")}</strong>
                    <small>{ui("landing:inclusive_by_design")}</small>
                  </div>

                  <div className="language-orbit">
                    <span>{ui("common:hindi")}</span>
                    <span>{ui("landing:en")}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="bento-card neon-card time-card neon-deep">
                  <div className="time-card-glow" />

                  <div className="time-card-top">
                    <div className="neon-icon-box blue">
                      <Clock3 size={19} />
                    </div>

                    <span className="speed-badge">{ui("landing:fast")}</span>
                  </div>

                  <div className="time-value">
                    <strong>{ui("landing:seconds")}</strong>
                  </div>

                  <p>{ui("landing:to_a_physicianready")}<br />{ui("landing:clinical_summary_2")}</p>

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
                <span className="section-label dark-label">{ui("landing:one_connected_journey")}</span>

                <h2>{ui("landing:five_steps_to_a_clearer_consult")}</h2>
              </div>

              <p>{ui("landing:clinical_context_ready_before_you_walk_in")}</p>
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

                    <h3>{ui(step.title)}</h3>
                    <p>{ui(step.description)}</p>
                    <span>{ui(step.detail)}</span>
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
                <Sparkles size={14} />{ui("landing:built_around_the_consultation")}</span>

              <div className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">{ui("landing:one_connected_journey_from")}<br />
                <span className="text-blue-600">{ui("landing:patient_to_physician")}</span>
              </div>
            </div>

            <div className="feature-bento-grid">
              <article className="feature-bento feature-large glass-card">
                <div className="feature-bento-heading">
                  <span className="feature-icon">
                    <ClipboardList size={21} />
                  </span>

                  <span className="feature-tag">{ui("landing:structured_clinical_history")}</span>
                </div>

                <div className="clinical-preview">
                  <ClinicalHistoryItem
                    icon={Stethoscope}
                    heading={ui("landing:chief_complaint")}
                    exp={ui("landing:intermittent_chest_discomfort_for_3_days")}
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
                    heading={ui("landing:current_medications")}
                    exp={ui("landing:amlodipine_5_mg_once_daily")}
                  />

                  <ClinicalHistoryItem
                    icon={ShieldAlert}
                    heading={ui("landing:known_allergies")}
                    exp={ui("landing:no_known_drug_allergies")}
                  />

                  <ClinicalHistoryItem
                    icon={Users}
                    heading={ui("landing:family_history")}
                    exp={ui("landing:father_had_coronary_artery_disease")}
                  />
                </div>
              </article>

              <article className="feature-bento feature-summary glass-card">
                <div className="feature-bento-heading">
                  <span className="feature-icon">
                    <AudioLines size={21} />
                  </span>

                  <span className="feature-tag">{ui("landing:speak_naturally")}</span>
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
                  </span>{ui("landing:tell_me_when_the_chest_discomfort_first_started")}</div>
              </article>

              <article className="feature-bento feature-safety glass-card">
                <span className="feature-icon green">
                  <ShieldCheck size={21} />
                </span>

                <h3>{ui("landing:consent_stays_visible")}</h3>

                <p>{ui("landing:patients_review_their_history_before_it_reaches_the")}</p>

                <div className="consent-row glass-pill">
                  <Check size={15} />{ui("landing:patient_reviewed")}</div>
              </article>

              <article className="feature-bento feature-doctor glass-card">
                <div className="doctor-header">
                  <div>
                    <span className="feature-tag">{ui("landing:physician_view")}</span>
                    <h3>{ui("landing:everything_important_one_screen")}</h3>
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
                      <span>{ui("landing:patient_overview")}</span>
                      <span className="dashboard-status">{ui("landing:reviewed")}</span>
                    </div>

                    <div className="dashboard-patient">
                      <div className="dashboard-patient-avatar">
                        <UserRound size={17} />
                      </div>

                      <div>
                        <strong>{ui("landing:patient_mk1024")}</strong>
                        <span>{ui("landing:prepared_history")}</span>
                      </div>
                    </div>

                    <div className="dashboard-grid">
                      <div>
                        <span>{ui("landing:symptoms")}</span>
                        <strong>{ui("landing:4_captured")}</strong>
                      </div>

                      <div>
                        <span>{ui("landing:documents")}</span>
                        <strong>{ui("landing:3_analysed")}</strong>
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
                <strong>{ui("landing:your_information_stays_yours")}</strong>
                <p>{ui("landing:fictional_demo_no_real_health_or_identity_data")}</p>
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
