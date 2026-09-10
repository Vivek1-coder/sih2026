import { errorText } from "../i18n";
import ProgressIndicator from "../components/common/ProgressIndicator";
import Loader from "../components/common/Loader";
import { ui, formatDate } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  FileCheck2,
  FlaskConical,
  Search,
  ShieldCheck,
} from "lucide-react";
import Header from "../components/layout/header";
import Footer from "../components/layout/footer";
import DocumentFilePicker from "../components/common/DocumentFilePicker";
import useAccessibility from "../hooks/useAccessibility";
import {
  getLabReport,
  lookupLabPatient,
  registerLabPatient,
  uploadLabReport,
  verifyLabPatient,
  type Demographics,
  type IdentifierType,
  type LabPatient,
  type LabReport,
} from "../services/lab";

type Stage = "add" | "verify" | "report" | "processing" | "complete";
const emptyDetails: Demographics = {
  full_name: "",
  date_of_birth: "",
  gender: "Prefer not to say",
  address: "",
  mobile: "",
  email: "",
};

export default function LabWorkflow() {
  const { t } = useAccessibility();
  const [params, setParams] = useSearchParams();
  const reportId = params.get("report");
  const [retryCount, setRetryCount] = useState(0);
  const [stage, setStage] = useState<Stage>(reportId ? "processing" : "add");
  const [identifierType, setIdentifierType] = useState<IdentifierType>("phone");
  const [identifier, setIdentifier] = useState("");
  const [patient, setPatient] = useState<LabPatient | null>(null);
  const [details, setDetails] = useState<Demographics>(emptyDetails);
  const [registration, setRegistration] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [report, setReport] = useState<LabReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const requestVersion = useRef(0);
  useEffect(() => {
    heading.current?.focus();
  }, [stage, registration]);
  useEffect(() => {
    if (!reportId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 120000;
    const poll = async () => {
      try {
        const record = await getLabReport(reportId);
        if (!active) return;
        setReport(record);
        setError("");
        if (record.status === "done") setStage("complete");
        else if (record.status === "failed")
          setError("errors:processingFailed");
        else if (Date.now() >= deadline) setError("errors:timeout");
        else timer = setTimeout(poll, 1500);
      } catch {
        if (active) setError("lab.statusError");
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reportId, retryCount]);
  const reset = () => {
    requestVersion.current += 1;
    setParams({});
    setPatient(null);
    setReport(null);
    setIdentifier("");
    setDetails(emptyDetails);
    setRegistration(false);
    setConfirmed(false);
    setConsented(false);
    setVerificationId("");
    setError("");
    setStage("add");
  };
  const select = (record: LabPatient) => {
    setPatient(record);
    setDetails({
      full_name: record.full_name,
      date_of_birth: record.date_of_birth,
      gender: record.gender,
      address: record.address || "",
      mobile: record.mobile || "",
      email: record.email || "",
    });
    setConfirmed(false);
    setConsented(false);
    setVerificationId("");
    setStage("verify");
  };
  const demographicFields = (
    <>
      {(
        ["full_name", "date_of_birth", "mobile", "email", "address"] as const
      ).map((field) => (
        <label key={field}>
          {t(`lab.${field}`)}
          <input
            type={
              field === "date_of_birth"
                ? "date"
                : field === "email"
                  ? "email"
                  : field === "mobile"
                    ? "tel"
                    : "text"
            }
            required={field === "full_name" || field === "date_of_birth"}
            value={details[field] || ""}
            disabled={busy}
            max={
              field === "date_of_birth"
                ? new Date().toLocaleDateString("en-CA")
                : undefined
            }
            maxLength={
              field === "address" ? 500 : field === "full_name" ? 100 : 254
            }
            onChange={(e) => {
              setDetails((d) => ({ ...d, [field]: e.target.value }));
              setConfirmed(false);
            }}
          />
        </label>
      ))}
      <label>
        {t("profile.gender")}
        <select
          value={details.gender}
          disabled={busy}
          onChange={(e) => {
            setDetails((d) => ({ ...d, gender: e.target.value }));
            setConfirmed(false);
          }}
        >
          {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
            <option key={g} value={g}>
              {ui(g)}
            </option>
          ))}
        </select>
      </label>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#lab-content">
        {t("skip.content")}
      </a>
      <Header section={t(`lab.stage.${stage}`)} />
      <main className="patient-shell lab-main" id="lab-content" tabIndex={-1}>
        <section className="page-intro">
          <div>
            <span className="eyebrow">
              <FlaskConical size={15} aria-hidden="true" /> {t("lab.title")}
            </span>
            <h1 ref={heading} tabIndex={-1}>
              {t(`lab.stage.${stage}`)}
            </h1>
            <p>{t(`lab.help.${stage}`)}</p>
          </div>
        </section>
        <div className="consent-layout lab-layout">
          <section
            className="card continuity-form lab-form"
            aria-busy={busy || (stage === "processing" && !error)}
          >
            {error && (
              <p role="alert" className="form-error">
                {errorText(error)}
              </p>
            )}
            {stage === "add" && !registration && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  const version = ++requestVersion.current;
                  try {
                    const match = await lookupLabPatient(
                      identifierType,
                      identifier,
                    );
                    if (version !== requestVersion.current) return;
                    if (match.patient) select(match.patient);
                    else {
                      setDetails({
                        ...emptyDetails,
                        ...(identifierType === "phone"
                          ? { mobile: identifier }
                          : identifierType === "email"
                            ? { email: identifier }
                            : {}),
                      });
                      setRegistration(true);
                    }
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : t("patient.error"),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  {t("lab.identifierType")}
                  <select
                    disabled={busy}
                    value={identifierType}
                    onChange={(e) =>
                      setIdentifierType(e.target.value as IdentifierType)
                    }
                  >
                    {(["phone", "email", "aadhaar", "abha"] as const).map(
                      (type) => (
                        <option value={type} key={type}>
                          {t(`lab.id.${type}`)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  {t("lab.identifier")}
                  <input
                    autoComplete="off"
                    required
                    maxLength={254}
                    value={identifier}
                    disabled={busy}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={busy || !identifier.trim()}
                >
                  <Search size={17} />
                  {busy ? <Loader /> : t("lab.search")}
                </button>
              </form>
            )}
            {stage === "add" && registration && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    const match = await registerLabPatient(
                      identifierType,
                      identifier,
                      details,
                    );
                    if (match.patient) select(match.patient);
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : t("patient.error"),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>{t("lab.newPatient")}</h2>
                <p>{t("lab.noMatch")}</p>
                {demographicFields}
                <button className="button primary" disabled={busy}>
                  {busy ? <Loader /> : t("lab.register")}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setRegistration(false)}
                >
                  {t("lab.backSearch")}
                </button>
              </form>
            )}
            {stage === "verify" && patient && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!confirmed || !consented || busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    const result = await verifyLabPatient(
                      patient.id,
                      details,
                      consented,
                      confirmed,
                    );
                    setPatient(result.patient);
                    setVerificationId(result.verification_id);
                    setStage("report");
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : t("patient.error"),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p className="lab-match">
                  <BadgeCheck size={18} />
                  {t("lab.match")}
                </p>
                {patient.aadhaar_masked && <p>{patient.aadhaar_masked}</p>}
                {patient.abha_id && (
                  <p>
                    {t("lab.id.abha")}: {patient.abha_id}
                  </p>
                )}
                {demographicFields}
                <label className="lab-check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  {t("lab.confirmDetails")}
                </label>
                <label className="lab-check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                  />
                  {t("lab.consent")}
                </label>
                <button
                  className="button primary"
                  disabled={busy || !confirmed || !consented}
                >
                  {busy ? <Loader /> : t("lab.verify")}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={reset}
                >
                  {t("lab.wrongPatient")}
                </button>
              </form>
            )}
            {stage === "report" && patient && (
              <>
                <h2>{patient.full_name}</h2>
                <p>
                  {formatDate(patient.date_of_birth)} ·{" "}
                  {patient.mobile ||
                    patient.email ||
                    patient.aadhaar_masked ||
                    patient.abha_id}
                </p>
                {busy && <ProgressIndicator stage="uploading" />}
                <DocumentFilePicker
                  label={t("lab.upload")}
                  disabled={busy}
                  onFiles={async (files) => {
                    if (busy) return;
                    setBusy(true);
                    setError("");
                    try {
                      const result = await uploadLabReport(
                        patient.id,
                        verificationId,
                        files[0],
                      );
                      setReport(result);
                      setParams({ report: result.id });
                      setStage("processing");
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : t("patient.error"),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <p>{t("lab.fileHelp")}</p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setVerificationId("");
                    setConfirmed(false);
                    setStage("verify");
                  }}
                >
                  {t("lab.reviewDetails")}
                </button>
              </>
            )}
            {stage === "processing" && (
              <>
                <ProgressIndicator
                  stage={
                    report?.processing_stage === "extracting"
                      ? "extracting"
                      : "processing"
                  }
                  failed={Boolean(error)}
                />
                <p>{report?.original_filename}</p>
                {error && (
                  <>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setError("");
                        setRetryCount((n) => n + 1);
                      }}
                    >
                      {t("lab.refresh")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setError("");
                        setReport(null);
                        setParams({});
                        if (patient && verificationId) setStage("report");
                        else reset();
                      }}
                    >
                      {t("lab.chooseAnotherReport")}
                    </button>
                  </>
                )}
              </>
            )}
            {stage === "complete" && (
              <>
                <ProgressIndicator stage="done" />
                <FileCheck2 size={38} />
                <h2>{t("lab.saved")}</h2>
                <p>{report?.original_filename}</p>
                <p>{t("lab.savedHelp")}</p>
                <button className="button primary" onClick={reset}>
                  {t("lab.nextPatient")}
                </button>
              </>
            )}
          </section>
          <aside className="card continuity-panel">
            <ShieldCheck size={24} />
            <h2>{t("lab.privacy")}</h2>
            <p>{t("lab.privacyHelp")}</p>
            {patient && (
              <div className="history-row">
                <strong>{patient.full_name}</strong>
                <p>{formatDate(patient.date_of_birth)}</p>
                <p>
                  {t("lab.id.phone")}: {patient.mobile || "—"}
                </p>
              </div>
            )}
            <p className="muted">{t("lab.pipelineHelp")}</p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
