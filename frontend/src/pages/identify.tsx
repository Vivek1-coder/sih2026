import Loader from "../components/common/Loader";
import { errorText } from "../i18n";
import { useTranslation } from 'react-i18next';
import { ui } from "../i18n";
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
  useTranslation();
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
        setError("errors:please_enter_your_abha_number_or_abha_address");
      } else if (loginMethod === "Aadhaar") {
        setError("errors:please_enter_your_aadhaar_number");
      } else {
        setError("errors:please_enter_your_email_address_or_mobile_number");
      }

      return false;
    }

    /* Aadhaar */

    if (loginMethod === "Aadhaar") {
      const aadhaar = identifier.replace(/\D/g, "");

      if (aadhaar.length !== 12) {
        setError("errors:please_enter_a_valid_12digit_aadhaar_number");

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
        setError("errors:please_enter_a_valid_14digit_abha_number_or_abha");

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
          "errors:please_enter_a_valid_email_address_or_10digit_mobile",
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
          : "errors:unable_to_send_otp_please_try_again",
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
      throw new Error("errors:please_enter_your_password");
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
      throw new Error("errors:please_request_an_otp_first");
    }

    const otp = loginForm.otp.replace(/\D/g, "");

    if (otp.length !== 6) {
      throw new Error("errors:please_enter_a_valid_6digit_otp");
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
      sessionStorage.removeItem("medikiosk-visit");
      navigate(authenticatedUser.role === "lab_assistant" ? "/lab" : authenticatedUser.role === "doctor" ? "/physician" : "/patient/home", {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "errors:unable_to_sign_in_please_try_again",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     Registration Validation
  ======================================================= */

  const validateRegistration = () => {
    return true;
    clearMessages();

    /* Full Name */

    if (!registerForm.fullName.trim()) {
      setError("errors:please_enter_your_full_name");

      return false;
    }

    /* DOB */

    if (!registerForm.dateOfBirth) {
      setError("errors:please_enter_your_date_of_birth");

      return false;
    }

    const dateOfBirth = new Date(registerForm.dateOfBirth);

    if (Number.isNaN(dateOfBirth.getTime())) {
      setError("errors:please_enter_a_valid_date_of_birth");

      return false;
    }

    if (dateOfBirth > new Date()) {
      setError("errors:date_of_birth_cannot_be_in_the_future_1");

      return false;
    }

    /* Gender */

    if (!registerForm.gender) {
      setError("errors:please_select_your_gender");

      return false;
    }

    /* Aadhaar */

    const aadhaar = registerForm.aadhaar.replace(/\D/g, "");

    if (aadhaar.length !== 12) {
      setError("errors:please_enter_a_valid_12digit_aadhaar_number");

      return false;
    }

    /* ABHA Optional */

    if (registerForm.abhaId.trim()) {
      const abha = registerForm.abhaId.trim();

      const digits = abha.replace(/\D/g, "");

      const validNumber = digits.length === 14;

      const validAddress = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(abha);

      if (!validNumber && !validAddress) {
        setError("errors:please_enter_a_valid_abha_numberaddress_or_leave_it");

        return false;
      }
    }

    /* Mobile */

    // const mobile = registerForm.mobile.replace(/\D/g, "");

    // if (mobile.length !== 10) {
    //   setError("Please enter a valid 10-digit mobile number.");

    //   return false;
    // }

    // /* Email */

    // if (registerForm.email.trim()) {
    //   const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    //     registerForm.email.trim(),
    //   );

    //   if (!validEmail) {
    //     setError("Please enter a valid email address.");

    //     return false;
    //   }
    // }

    // /* Address */

    // if (!registerForm.address.trim()) {
    //   setError("Please enter your address.");

    //   return false;
    // }

    // /* State */

    // if (!registerForm.state) {
    //   setError("Please select your state.");

    //   return false;
    // }

    /* District */

    // if (!registerForm.district.trim()) {
    //   setError("Please enter your district.");

    //   return false;
    // }

    /* Password */

    // if (registerForm.password.length < 8) {
    //   setError("Password must contain at least 8 characters.");

    //   return false;
    // }

    // if (!/[A-Z]/.test(registerForm.password)) {
    //   setError("Password must contain at least one uppercase letter.");

    //   return false;
    // }

    // if (!/[a-z]/.test(registerForm.password)) {
    //   setError("Password must contain at least one lowercase letter.");

    //   return false;
    // }

    // if (!/\d/.test(registerForm.password)) {
    //   setError("Password must contain at least one number.");

    //   return false;
    // }

    /* Confirm Password */

    // if (registerForm.password !== registerForm.confirmPassword) {
    //   setError("Passwords do not match.");

    //   return false;
    // }

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

      sessionStorage.removeItem("medikiosk-visit");
      navigate(authenticatedUser.role === "lab_assistant" ? "/lab" : authenticatedUser.role === "doctor" ? "/physician" : "/patient/home", {
        replace: true,
      });
    } catch (registrationError) {

      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "errors:unable_to_create_your_account_please_try_again",
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
            {pageMode === "login" ? ui("identify:patient_login") : ui("identify:create_patient_account")}
          </h1>

          <p>
            {pageMode === "login"
              ? ui("identify:securely_access_your_health_profile_using_abha_aadhaar")
              : ui("identify:create_your_patient_profile_before_continuing_with_your")}
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
            <h2>{ui("identify:sign_in_to_your_account")}</h2>

            <p>{ui("identify:select_how_you_want_to_identify_yourself")}</p>
          </div>

          {/* =============================================
              Login Method
          ============================================= */}

          <div className="tabs" role="tablist" aria-label={ui("identify:login_method")}>
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
                  {ui(method)}
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
                  ? ui("identify:abha_number_or_address")
                  : loginMethod === "Aadhaar"
                    ? ui("identify:aadhaar_number")
                    : ui("identify:email_or_mobile_number")
              }
              placeholder={
                loginMethod === "ABHA ID"
                  ? ui("identify:14digit_abha_or_nameabdm")
                  : loginMethod === "Aadhaar"
                    ? ui("identify:enter_12digit_aadhaar_number")
                    : ui("identify:youexamplecom_or_9876543210")
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
              aria-label={ui("identify:authentication_mode")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "password"}
                className={authMode === "password" ? "active" : ""}
                onClick={() => handleAuthModeChange("password")}
              >
                <KeyRound size={16} />{ui("identify:password")}</button>

              <button
                type="button"
                role="tab"
                aria-selected={authMode === "otp"}
                className={authMode === "otp" ? "active" : ""}
                onClick={() => handleAuthModeChange("otp")}
              >
                <MessageSquareText size={16} />{ui("identify:otp")}</button>
            </div>

            {/* ===========================================
                Password
            =========================================== */}

            {authMode === "password" && (
              <Field
                label={ui("identify:password")}
                type="password"
                placeholder={ui("identify:enter_your_password")}
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
                    label={ui("identify:enter_otp")}
                    placeholder={ui("identify:enter_6digit_otp")}
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
                    ? <Loader label="identify:sending_otp" />
                    : otpSent
                      ? ui("identify:resend_otp")
                      : ui("identify:send_otp")}
                </button>
              </div>
            )}

            {/* ===========================================
                ABHA QR
            =========================================== */}

            {loginMethod === "ABHA ID" && (
              <button className="scan-link" type="button">
                <Zap size={17} />{ui("identify:scan_abha_qr_instead")}</button>
            )}

            {/* ===========================================
                Security Notice
            =========================================== */}

            <div className="notice">
              <ShieldCheck size={17} />

              <span>{ui("identify:your_credentials_are_sent_securely_to_the_authentication")}</span>
            </div>
          </div>

          {/* =============================================
              Messages
          ============================================= */}

          {error && (
            <div className="form-error" role="alert">
              {errorText(error)}
            </div>
          )}

          {message && (
            <div className="form-success" role="status">
              {errorText(message)}
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
              <UserPlus size={17} />{ui("identify:new_patient_register")}</button>

            <button type="submit" className="button primary" disabled={loading}>
              {loading
                ? <Loader label="identify:signing_in" />
                : authMode === "otp"
                  ? ui("identify:verify_otp_continue")
                  : ui("identify:login_continue")}

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
            <h2>{ui("identify:create_patient_profile")}</h2>

            <p>{ui("identify:enter_your_details_to_register_aadhaar_is_required")}</p>
          </div>

          <div className="form-grid">
            {/* ===========================================
                Personal Information
            =========================================== */}

            <Field
              label={ui("identify:full_name")}
              placeholder={ui("identify:eg_ananya_iyer")}
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
              label={ui("identify:date_of_birth")}
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
              label={ui("identify:gender")}
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
              label={ui("identify:aadhaar_number")}
              type="password"
              placeholder={ui("identify:enter_12digit_aadhaar_number")}
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
              label={ui("identify:abha_id_optional")}
              placeholder={ui("identify:14digit_abha_or_nameabdm")}
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
              label={ui("identify:mobile_number")}
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
              label={ui("identify:email_optional")}
              type="email"
              placeholder={ui("identify:youexamplecom")}
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
              label={ui("identify:address")}
              placeholder={ui("identify:house_number_street_locality")}
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
              label={ui("identify:state")}
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
              label={ui("identify:district")}
              placeholder={ui("identify:eg_new_delhi")}
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
              label={ui("identify:emergency_contact_optional")}
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
              label={ui("identify:relationship")}
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
              label={ui("identify:password")}
              type="password"
              placeholder={ui("identify:minimum_8_characters")}
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
              label={ui("identify:confirm_password")}
              type="password"
              placeholder={ui("identify:reenter_your_password")}
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

            <span>{ui("identify:aadhaar_and_health_identity_data_are_sensitive_information")}</span>
          </div>

          {/* =============================================
              Error
          ============================================= */}

          {error && (
            <div className="form-error" role="alert">
              {errorText(error)}
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
            >{ui("identify:already_registered_login")}</button>

            <button type="submit" className="button primary" disabled={loading}>
              {loading ? <Loader label="identify:creating_account" /> : ui("identify:create_account")}

              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        </form>
      )}
    </PatientShell>
  );
}
