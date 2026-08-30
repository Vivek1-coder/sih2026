import { useState, type SubmitEvent } from "react";
import {
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";

import PatientShell from "../components/common/patientShell";
import Field from "../components/common/field";
import useAuth from "../hooks/useAuth";
import type { AuthMethod } from "../types/auth.type";
import useAccessibility from "../hooks/useAccessibility";

type LoginMethod = "ABHA ID" | "Aadhaar" | "New patient";

export default function Identify({
  go,
}: {
  go: (path: string) => void;
}) {
  const { login } = useAuth();
  const { t } = useAccessibility();
  const [tab, setTab] = useState<LoginMethod>("ABHA ID");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTabChange = (newTab: LoginMethod) => {
    setTab(newTab);
    setValue("");
    setError("");
  };

  const validate = () => {
    if (tab === "New patient") {
      return true;
    }

    const cleanValue = value.replace(/\D/g, "");

    if (!value.trim()){
      setError(
        tab === "Aadhaar"
          ? "Please enter your Aadhaar number."
          : "Please enter your ABHA number or address.",
      );
      return false;
    }

    if (tab === "Aadhaar" && cleanValue.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return false;
    }

    if (
      tab === "ABHA ID" &&
      !value.includes("@") &&
      cleanValue.length !== 14
    ) {
      setError(
        "Please enter a valid 14-digit ABHA number or ABHA address.",
      );
      return false;
    }

    return true;
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const authMethod: AuthMethod =
        tab === "ABHA ID"
          ? "abha_mock"
          : tab === "Aadhaar"
            ? "aadhaar_mock"
            : "guest";
      await login({
        auth_method: authMethod,
        ...(tab !== "New patient" ? { identifier: value.trim() } : {}),
      });
      go("/patient/consent");
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PatientShell active="Identify" go={go}>
      {/* Page heading */}
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("identify.eyebrow")}</span>

          <h1>{t("identify.title")}</h1>

          <p>
            {t("identify.lede")}
          </p>
        </div>

        <div className="demo-badge">
          <ShieldCheck size={16} />
          {t("identify.demo")}
        </div>
      </section>

      <form className="identify-card card" onSubmit={submit}>
        {/* Authentication method */}
        <div className="tabs" role="tablist">
          {(
            ["ABHA ID", "Aadhaar", "New patient"] as LoginMethod[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "active" : ""}
              onClick={() => handleTabChange(item)}
            >
              {item === "New patient" && <UserPlus size={16} />}

              {item}
            </button>
          ))}
        </div>

        {/* Existing patient login */}
        {tab !== "New patient" && (
          <div className="single-form">
            <div className="login-section-heading">
              <h2>
                {tab === "Aadhaar"
                  ? "Login with Aadhaar"
                  : "Login with ABHA"}
              </h2>

              <p>
                {tab === "Aadhaar"
                  ? "Enter your Aadhaar details to verify your identity."
                  : "Enter your ABHA number or ABHA address to continue."}
              </p>
            </div>

            <Field
              label={
                tab === "Aadhaar"
                  ? "Aadhaar number"
                  : "ABHA number or address"
              }
              placeholder={
                tab === "Aadhaar"
                  ? "Enter 12-digit Aadhaar number"
                  : "14-digit ABHA number or name@abdm"
              }
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              type={tab === "Aadhaar" ? "password" : "text"}
            />

            <Field
              label="Mobile number"
              placeholder="+91 98765 43210"
            />

            <div className="notice">
              <ShieldCheck size={17} />

              <span>
                {tab === "Aadhaar"
                  ? "Your Aadhaar number is masked and is never stored in this demonstration."
                  : "Your ABHA details are used only to identify your health profile."}
              </span>
            </div>

            {tab === "ABHA ID" && (
              <button
                className="scan-link"
                type="button"
              >
                <Zap size={17} />
                Scan ABHA QR instead
              </button>
            )}
          </div>
        )}

        {/* New patient registration */}
        {tab === "New patient" && (
          <div>
            <div className="login-section-heading">
              <h2>Create patient profile</h2>

              <p>
                Don't have an ABHA ID? Enter your basic information
                to continue as a new patient.
              </p>
            </div>

            <div className="form-grid">
              <Field
                label="Full name"
                placeholder="e.g. Ananya Iyer"
              />

              <Field
                label="Date of birth"
                type="date"
              />

              <Field
                label="Gender"
                select
                options={[
                  "Female",
                  "Male",
                  "Prefer not to say",
                ]}
              />

              <Field
                label="Mobile number"
                placeholder="+91 98765 43210"
              />

              <Field
                label="Email (optional)"
                placeholder="you@example.com"
              />

              <Field
                label="Address"
                placeholder="House number, street, locality"
                wide
              />

              <Field
                label="State"
                select
                options={[
                  "Maharashtra",
                  "Assam",
                  "Karnataka",
                  "Tamil Nadu",
                ]}
              />

              <Field
                label="District"
                placeholder="e.g. Pune"
              />

              <Field
                label="Emergency contact"
                placeholder="+91 98765 43210"
              />

              <Field
                label="Relationship"
                select
                options={[
                  "Parent",
                  "Spouse",
                  "Sibling",
                  "Friend",
                ]}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="form-footer">
          <span className="secure-note">
            <ShieldCheck size={16} />
            {t("identify.secure")}
          </span>

          <button
            className="button primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? t("identify.loading")
              : tab === "New patient"
                ? t("identify.create")
                : t("identify.continue")}

            {!loading && <ArrowRight size={17} />}
          </button>
        </div>
      </form>
    </PatientShell>
  );
}
