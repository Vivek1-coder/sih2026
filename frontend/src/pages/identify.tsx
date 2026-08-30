import { useState, type SubmitEvent } from "react";

import {
  ArrowRight,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import PatientShell from "../components/common/patientShell";
import Field from "../components/common/field";

import useAccessibility from "../hooks/useAccessibility";
import useAuth from "../hooks/useAuth";

import type { IdentifierType } from "../services/auth";

import {
  loginWithPassword as loginWithPasswordApi,
  loginWithOtp as loginWithOtpApi,
  requestLoginOtp,
  registerPatient,
} from "../services/auth";

/* =========================================================
   Types
========================================================= */

type LoginMethod = "ABHA ID" | "Aadhaar" | "Email / Phone";

type AuthMode = "password" | "otp";

type PageMode = "login" | "register";

export interface LoginForm {
  identifier: string;
  password: string;
  otp: string;
}

export interface RegisterForm {
  fullName: string;
  dateOfBirth: string;
  gender: string;

  aadhaar: string;
  abhaId: string;

  mobile: string;
  email: string;

  address: string;
  state: string;
  district: string;

  emergencyContact: string;
  relationship: string;

  password: string;
  confirmPassword: string;
}

/* =========================================================
   Component
========================================================= */

export default function Identify() {
  const { t } = useAccessibility();

  const { setAuthenticatedUser } = useAuth();

  const navigate = useNavigate();

  /* =======================================================
     Page State
  ======================================================= */

  const [pageMode, setPageMode] = useState<PageMode>("login");

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("ABHA ID");

  const [authMode, setAuthMode] = useState<AuthMode>("password");

  /* =======================================================
     Login State
  ======================================================= */

  const [loginForm, setLoginForm] = useState<LoginForm>({
    identifier: "",
    password: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);

  const [otpLoading, setOtpLoading] = useState(false);

  /* =======================================================
     Registration State
  ======================================================= */

  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    fullName: "",
    dateOfBirth: "",
    gender: "",

    aadhaar: "",
    abhaId: "",

    mobile: "",
    email: "",

    address: "",
    state: "",
    district: "",

    emergencyContact: "",
    relationship: "",

    password: "",
    confirmPassword: "",
  });

  /* =======================================================
     Common State
  ======================================================= */

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  /* =======================================================
     Helpers
  ======================================================= */

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const resetLoginForm = () => {
    setLoginForm({
      identifier: "",
      password: "",
      otp: "",
    });

    setOtpSent(false);

    clearMessages();
  };

  const getIdentifierType = (): IdentifierType => {
    switch (loginMethod) {
      case "ABHA ID":
        return "abha";

      case "Aadhaar":
        return "aadhaar";

      case "Email / Phone":
        return "email_or_phone";
    }
  };

  /* =======================================================
     Login Method Change
  ======================================================= */

  const handleLoginMethodChange = (method: LoginMethod) => {
    setLoginMethod(method);

    setLoginForm({
      identifier: "",
      password: "",
      otp: "",
    });

    setOtpSent(false);

    clearMessages();
  };

  /* =======================================================
     Password / OTP Change
  ======================================================= */

  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);

    setLoginForm((previous) => ({
      ...previous,
      password: "",
      otp: "",
    }));

    setOtpSent(false);

    clearMessages();
  };

  /* =======================================================
     Login Identifier Validation
  ======================================================= */

  const validateLoginIdentifier = () => {
    const identifier = loginForm.identifier.trim();

    if (!identifier) {
      if (loginMethod === "ABHA ID") {
        setError("Please enter your ABHA number or ABHA address.");
      } else if (loginMethod === "Aadhaar") {
        setError("Please enter your Aadhaar number.");
      } else {
        setError("Please enter your email address or mobile number.");
      }

      return false;
    }

    /* Aadhaar */

    if (loginMethod === "Aadhaar") {
      const aadhaar = identifier.replace(/\D/g, "");

      if (aadhaar.length !== 12) {
        setError("Please enter a valid 12-digit Aadhaar number.");

        return false;
      }
    }

    /* ABHA */

    if (loginMethod === "ABHA ID") {
      const digits = identifier.replace(/\D/g, "");

      const validAbhaNumber = digits.length === 14;

      const validAbhaAddress = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(
        identifier,
      );

      if (!validAbhaNumber && !validAbhaAddress) {
        setError("Please enter a valid 14-digit ABHA number or ABHA address.");

        return false;
      }
    }

    /* Email / Phone */

    if (loginMethod === "Email / Phone") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const phone = identifier.replace(/\D/g, "");

      const validEmail = emailPattern.test(identifier);

      const validPhone =
        phone.length === 10 || (phone.length === 12 && phone.startsWith("91"));

      if (!validEmail && !validPhone) {
        setError(
          "Please enter a valid email address or 10-digit mobile number.",
        );

        return false;
      }
    }

    return true;
  };

  /* =======================================================
     Request OTP

     POST /api/auth/otp/request
  ======================================================= */

  const requestOtp = async () => {
    clearMessages();

    if (!validateLoginIdentifier()) {
      return;
    }

    setOtpLoading(true);

    try {
      const responseMessage = await requestLoginOtp({
        identifier_type: getIdentifierType(),

        identifier: loginForm.identifier.trim(),

        purpose: "login",
      });

      setOtpSent(true);

      setMessage(responseMessage);
    } catch (requestError) {
      setOtpSent(false);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send OTP. Please try again.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  /* =======================================================
     Password Login

     POST /api/auth/login/password
  ======================================================= */

  const loginWithPassword = async () => {
    if (!loginForm.password.trim()) {
      throw new Error("Please enter your password.");
    }

    return loginWithPasswordApi({
      identifier_type: getIdentifierType(),

      identifier: loginForm.identifier.trim(),

      password: loginForm.password,
    });
  };

  /* =======================================================
     OTP Login

     POST /api/auth/login/otp
  ======================================================= */

  const loginWithOtp = async () => {
    if (!otpSent) {
      throw new Error("Please request an OTP first.");
    }

    const otp = loginForm.otp.replace(/\D/g, "");

    if (otp.length !== 6) {
      throw new Error("Please enter a valid 6-digit OTP.");
    }

    return loginWithOtpApi({
      identifier_type: getIdentifierType(),

      identifier: loginForm.identifier.trim(),

      otp,
    });
  };

  /* =======================================================
     Login Submit
  ======================================================= */

  const submitLogin = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    clearMessages();

    if (!validateLoginIdentifier()) {
      return;
    }

    setLoading(true);

    try {
      /*
       * Both functions return AuthUser.
       */
      const authenticatedUser =
        authMode === "password"
          ? await loginWithPassword()
          : await loginWithOtp();

      /*
       * Store ONLY user details in AuthContext.
       *
       * Access and refresh JWTs remain inside
       * HttpOnly browser cookies.
       */
      setAuthenticatedUser(authenticatedUser);

      /*
       * Successful login.
       */
      navigate("/patient/consent", {
        replace: true,
      });
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

  /* =======================================================
     Registration Validation
  ======================================================= */

  const validateRegistration = () => {
    clearMessages();

    /* Full Name */

    if (!registerForm.fullName.trim()) {
      setError("Please enter your full name.");

      return false;
    }

    /* DOB */

    if (!registerForm.dateOfBirth) {
      setError("Please enter your date of birth.");

      return false;
    }

    const dateOfBirth = new Date(registerForm.dateOfBirth);

    if (Number.isNaN(dateOfBirth.getTime())) {
      setError("Please enter a valid date of birth.");

      return false;
    }

    if (dateOfBirth > new Date()) {
      setError("Date of birth cannot be in the future.");

      return false;
    }

    /* Gender */

    if (!registerForm.gender) {
      setError("Please select your gender.");

      return false;
    }

    /* Aadhaar */

    const aadhaar = registerForm.aadhaar.replace(/\D/g, "");

    if (aadhaar.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number.");

      return false;
    }

    /* ABHA Optional */

    if (registerForm.abhaId.trim()) {
      const abha = registerForm.abhaId.trim();

      const digits = abha.replace(/\D/g, "");

      const validNumber = digits.length === 14;

      const validAddress = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(abha);

      if (!validNumber && !validAddress) {
        setError("Please enter a valid ABHA number/address or leave it empty.");

        return false;
      }
    }

    /* Mobile */

    const mobile = registerForm.mobile.replace(/\D/g, "");

    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");

      return false;
    }

    /* Email */

    if (registerForm.email.trim()) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        registerForm.email.trim(),
      );

      if (!validEmail) {
        setError("Please enter a valid email address.");

        return false;
      }
    }

    /* Address */

    if (!registerForm.address.trim()) {
      setError("Please enter your address.");

      return false;
    }

    /* State */

    if (!registerForm.state) {
      setError("Please select your state.");

      return false;
    }

    /* District */

    if (!registerForm.district.trim()) {
      setError("Please enter your district.");

      return false;
    }

    /* Password */

    if (registerForm.password.length < 8) {
      setError("Password must contain at least 8 characters.");

      return false;
    }

    if (!/[A-Z]/.test(registerForm.password)) {
      setError("Password must contain at least one uppercase letter.");

      return false;
    }

    if (!/[a-z]/.test(registerForm.password)) {
      setError("Password must contain at least one lowercase letter.");

      return false;
    }

    if (!/\d/.test(registerForm.password)) {
      setError("Password must contain at least one number.");

      return false;
    }

    /* Confirm Password */

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match.");

      return false;
    }

    return true;
  };

  /* =======================================================
     Registration

     POST /api/auth/register
  ======================================================= */

  const submitRegistration = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    clearMessages();

    if (!validateRegistration()) {
      return;
    }

    setLoading(true);

    try {
      const authenticatedUser = await registerPatient(registerForm);

      /*
       * /register also issues authentication
       * cookies on the backend, so registration
       * immediately creates an authenticated session.
       */
      setAuthenticatedUser(authenticatedUser);

      navigate("/patient/consent", {
        replace: true,
      });
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     YOUR EXISTING JSX CONTINUES HERE
  ======================================================= */

  return (
    <PatientShell active="Identify">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("identify.eyebrow")}</span>

          <h1>
            {pageMode === "login" ? "Patient Login" : "Create Patient Account"}
          </h1>

          <p>
            {pageMode === "login"
              ? "Securely access your health profile using ABHA, Aadhaar, email, or mobile number."
              : "Create your patient profile before continuing with your consultation."}
          </p>
        </div>

        <div className="demo-badge">
          <ShieldCheck size={16} />

          {t("identify.demo")}
        </div>
      </section>

      {/* =================================================
          LOGIN
      ================================================= */}

      {pageMode === "login" && (
        <form className="identify-card card" onSubmit={submitLogin}>
          <div className="login-section-heading">
            <h2>Sign in to your account</h2>

            <p>Select how you want to identify yourself.</p>
          </div>

          {/* =============================================
              Login Method
          ============================================= */}

          <div className="tabs" role="tablist" aria-label="Login method">
            {(["ABHA ID", "Aadhaar", "Email / Phone"] as LoginMethod[]).map(
              (method) => (
                <button
                  key={method}
                  type="button"
                  role="tab"
                  aria-selected={loginMethod === method}
                  className={loginMethod === method ? "active" : ""}
                  onClick={() => handleLoginMethodChange(method)}
                >
                  {method}
                </button>
              ),
            )}
          </div>

          <div className="single-form">
            {/* ===========================================
                Identifier
            =========================================== */}

            <Field
              label={
                loginMethod === "ABHA ID"
                  ? "ABHA number or address"
                  : loginMethod === "Aadhaar"
                    ? "Aadhaar number"
                    : "Email or mobile number"
              }
              placeholder={
                loginMethod === "ABHA ID"
                  ? "14-digit ABHA or name@abdm"
                  : loginMethod === "Aadhaar"
                    ? "Enter 12-digit Aadhaar number"
                    : "you@example.com or 9876543210"
              }
              type={loginMethod === "Aadhaar" ? "password" : "text"}
              value={loginForm.identifier}
              onChange={(event) => {
                setLoginForm((previous) => ({
                  ...previous,

                  identifier: event.target.value,
                }));

                setOtpSent(false);

                clearMessages();
              }}
            />

            {/* ===========================================
                Password / OTP
            =========================================== */}

            <div
              className="tabs auth-mode-tabs"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "password"}
                className={authMode === "password" ? "active" : ""}
                onClick={() => handleAuthModeChange("password")}
              >
                <KeyRound size={16} />
                Password
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={authMode === "otp"}
                className={authMode === "otp" ? "active" : ""}
                onClick={() => handleAuthModeChange("otp")}
              >
                <MessageSquareText size={16} />
                OTP
              </button>
            </div>

            {/* ===========================================
                Password
            =========================================== */}

            {authMode === "password" && (
              <Field
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={(event) => {
                  setLoginForm((previous) => ({
                    ...previous,

                    password: event.target.value,
                  }));

                  setError("");
                }}
              />
            )}

            {/* ===========================================
                OTP
            =========================================== */}

            {authMode === "otp" && (
              <div className="otp-section">
                {otpSent && (
                  <Field
                    label="Enter OTP"
                    placeholder="Enter 6-digit OTP"
                    value={loginForm.otp}
                    onChange={(event) => {
                      const value = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                      setLoginForm((previous) => ({
                        ...previous,
                        otp: value,
                      }));

                      setError("");
                    }}
                  />
                )}

                <button
                  type="button"
                  className="button secondary"
                  disabled={otpLoading}
                  onClick={requestOtp}
                >
                  <MessageSquareText size={17} />

                  {otpLoading
                    ? "Sending OTP..."
                    : otpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                </button>
              </div>
            )}

            {/* ===========================================
                ABHA QR
            =========================================== */}

            {loginMethod === "ABHA ID" && (
              <button className="scan-link" type="button">
                <Zap size={17} />
                Scan ABHA QR instead
              </button>
            )}

            {/* ===========================================
                Security Notice
            =========================================== */}

            <div className="notice">
              <ShieldCheck size={17} />

              <span>
                Your credentials are sent securely to the authentication server
                and are not stored in browser storage.
              </span>
            </div>
          </div>

          {/* =============================================
              Messages
          ============================================= */}

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="form-success" role="status">
              {message}
            </div>
          )}

          {/* =============================================
              Footer
          ============================================= */}

          <div className="form-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setPageMode("register");

                clearMessages();
              }}
            >
              <UserPlus size={17} />
              New patient? Register
            </button>

            <button type="submit" className="button primary" disabled={loading}>
              {loading
                ? "Signing in..."
                : authMode === "otp"
                  ? "Verify OTP & Continue"
                  : "Login & Continue"}

              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        </form>
      )}

      {/* =================================================
          REGISTRATION
      ================================================= */}

      {pageMode === "register" && (
        <form className="identify-card card" onSubmit={submitRegistration}>
          <div className="login-section-heading">
            <h2>Create patient profile</h2>

            <p>
              Enter your details to register. Aadhaar is required while ABHA ID
              is optional.
            </p>
          </div>

          <div className="form-grid">
            {/* ===========================================
                Personal Information
            =========================================== */}

            <Field
              label="Full name"
              placeholder="e.g. Ananya Iyer"
              value={registerForm.fullName}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  fullName: event.target.value,
                }));

                setError("");
              }}
            />

            <Field
              label="Date of birth"
              type="date"
              value={registerForm.dateOfBirth}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  dateOfBirth: event.target.value,
                }));

                setError("");
              }}
            />

            <Field
              label="Gender"
              select
              options={["Female", "Male", "Other", "Prefer not to say"]}
              value={registerForm.gender}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  gender: event.target.value,
                }));

                setError("");
              }}
            />

            {/* ===========================================
                Identity
            =========================================== */}

            <Field
              label="Aadhaar number"
              type="password"
              placeholder="Enter 12-digit Aadhaar number"
              value={registerForm.aadhaar}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 12);

                setRegisterForm((previous) => ({
                  ...previous,
                  aadhaar: value,
                }));

                setError("");
              }}
            />

            <Field
              label="ABHA ID (optional)"
              placeholder="14-digit ABHA or name@abdm"
              value={registerForm.abhaId}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  abhaId: event.target.value,
                }));

                setError("");
              }}
            />

            {/* ===========================================
                Contact
            =========================================== */}

            <Field
              label="Mobile number"
              placeholder="9876543210"
              value={registerForm.mobile}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                setRegisterForm((previous) => ({
                  ...previous,
                  mobile: value,
                }));

                setError("");
              }}
            />

            <Field
              label="Email (optional)"
              type="email"
              placeholder="you@example.com"
              value={registerForm.email}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  email: event.target.value,
                }));

                setError("");
              }}
            />

            {/* ===========================================
                Address
            =========================================== */}

            <Field
              label="Address"
              placeholder="House number, street, locality"
              wide
              value={registerForm.address}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  address: event.target.value,
                }));

                setError("");
              }}
            />

            <Field
              label="State"
              select
              options={[
                "Delhi",
                "Maharashtra",
                "Assam",
                "Karnataka",
                "Tamil Nadu",
                "Uttar Pradesh",
                "Rajasthan",
                "West Bengal",
              ]}
              value={registerForm.state}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  state: event.target.value,
                }));

                setError("");
              }}
            />

            <Field
              label="District"
              placeholder="e.g. New Delhi"
              value={registerForm.district}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  district: event.target.value,
                }));

                setError("");
              }}
            />

            {/* ===========================================
                Emergency Contact
            =========================================== */}

            <Field
              label="Emergency contact (optional)"
              placeholder="9876543210"
              value={registerForm.emergencyContact}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                setRegisterForm((previous) => ({
                  ...previous,

                  emergencyContact: value,
                }));

                setError("");
              }}
            />

            <Field
              label="Relationship"
              select
              options={[
                "Parent",
                "Spouse",
                "Sibling",
                "Child",
                "Friend",
                "Guardian",
              ]}
              value={registerForm.relationship}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  relationship: event.target.value,
                }));

                setError("");
              }}
            />

            {/* ===========================================
                Password
            =========================================== */}

            <Field
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={registerForm.password}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  password: event.target.value,
                }));

                setError("");
              }}
            />

            <Field
              label="Confirm password"
              type="password"
              placeholder="Re-enter your password"
              value={registerForm.confirmPassword}
              onChange={(event) => {
                setRegisterForm((previous) => ({
                  ...previous,

                  confirmPassword: event.target.value,
                }));

                setError("");
              }}
            />
          </div>

          {/* =============================================
              Registration Security Notice
          ============================================= */}

          <div className="notice">
            <ShieldCheck size={17} />

            <span>
              Aadhaar and health identity data are sensitive information and
              should be securely handled by the backend. Passwords must never be
              stored in plaintext.
            </span>
          </div>

          {/* =============================================
              Error
          ============================================= */}

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          {/* =============================================
              Footer
          ============================================= */}

          <div className="form-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setPageMode("login");

                resetLoginForm();
              }}
            >
              Already registered? Login
            </button>

            <button type="submit" className="button primary" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}

              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        </form>
      )}
    </PatientShell>
  );
}
