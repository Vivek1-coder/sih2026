import { Activity, ArrowRight, AudioLines, Check, ClipboardList, FileText, HeartPulse, Languages, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import Header from "../components/layout/header";
import Footer from "../components/layout/footer";

export default function Landing({ go }: { go: (path: string) => void }) {
  return (
    <>
      <Header go={go} />
      <main className="landing">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" /> Frontend demonstration · Your
              privacy comes first
            </div>
            <h1>
              A better way to
              <br />
              <span>share your story</span>
              <br />
              with your doctor.
            </h1>
            <p className="hero-lede">
              MediKiosk helps you share your complete medical history before
              you meet your doctor — so your visit can focus on what matters
              most.
            </p>
            <div className="hero-actions">
              <button
                className="button primary"
                onClick={() => go("/patient/identify")}
              >
                Start patient check-in <ArrowRight size={18} />
              </button>
              <button
                className="button secondary"
                onClick={() => go("/physician")}
              >
                <Stethoscope size={18} /> Open physician dashboard
              </button>
            </div>
            <div className="trust-row">
              <span>
                <ShieldCheck size={16} /> Private by design
              </span>
              <span>
                <Languages size={16} /> 7 languages
              </span>
              <span>
                <HeartPulse size={16} /> Made for everyone
              </span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-orbit">
              <div className="orbit-ring ring-one" />
              <div className="orbit-ring ring-two" />
              <div className="hero-icon">
                <HeartPulse size={54} />
              </div>
              <span className="float-card float-one">
                <Check size={15} /> History saved
              </span>
              <span className="float-card float-two">
                <Activity size={15} /> Doctor-ready
              </span>
            </div>
          </div>
        </section>
        <section className="workflow-section">
          <div className="section-heading">
            <span className="eyebrow">A simple five-step journey</span>
            <h2>From hello to a clearer consultation</h2>
          </div>
          <div className="workflow-grid">
            {[
              ["01", "Identify", "Tell us who you are", "UserRound"],
              ["02", "Converse", "Answer at your own pace", "AudioLines"],
              ["03", "Scan", "Add past reports", "FileText"],
              ["04", "Summarize", "Review your story", "ClipboardList"],
              ["05", "Consult", "Meet your doctor prepared", "Stethoscope"],
            ].map(([n, t, d, icon]) => (
              <div className="workflow-card" key={t}>
                <div className="workflow-icon">
                  {icon === "UserRound" ? (
                    <UserRound />
                  ) : icon === "AudioLines" ? (
                    <AudioLines />
                  ) : icon === "FileText" ? (
                    <FileText />
                  ) : icon === "ClipboardList" ? (
                    <ClipboardList />
                  ) : (
                    <Stethoscope />
                  )}
                </div>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="benefit-section">
          <div>
            <span className="eyebrow">Designed around you</span>
            <h2>
              Less repeating.
              <br />
              More understanding.
            </h2>
          </div>
          <div className="benefits">
            <div>
              <span className="benefit-number">01</span>
              <h3>For patients</h3>
              <p>
                Use your own words, your own language, and your own pace. We
                help organise the details so nothing important gets missed.
              </p>
            </div>
            <div>
              <span className="benefit-number">02</span>
              <h3>For physicians</h3>
              <p>
                Walk into every consultation with a structured, patient-reviewed
                history and the context you need to care well.
              </p>
            </div>
          </div>
        </section>
        <section className="privacy-strip">
          <ShieldCheck size={23} />
          <div>
            <strong>Your information stays yours.</strong>
            <p>
              This is a fictional frontend demonstration. No real health or
              identity data is collected, stored, or sent anywhere.
            </p>
          </div>
          <ArrowRight size={19} />
        </section>
      </main>
      <Footer />
    </>
  );
}