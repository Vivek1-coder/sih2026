import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleUserRound,
  Clock,
  FileCheck2,
  HeartPulse,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldX,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConsentChoices } from "../types/consent.type.ts";

type ConsentStatus = "active" | "revoked" | "expired";

interface ConsentRecord {
  status: ConsentStatus;
  preferred_language: string;
  choices: ConsentChoices;
  granted_at: string | null;
  updated_at: string | null;
}

interface VerificationStatus {
  mobile: boolean;
  email: boolean;
  aadhaar: boolean;
  abha: boolean;
}

interface PatientProfile {
  id: string;

  full_name: string;
  date_of_birth: string;
  gender: string;

  aadhaar: string;
  abha_id: string | null;

  mobile: string;
  email: string | null;

  address: string;
  state: string;
  district: string;

  emergency_contact: string | null;
  relationship: string | null;

  is_active: boolean;
  is_verified: boolean;

  verification: VerificationStatus;

  created_at: string;
  last_login_at: string | null;

  consent: ConsentRecord | null;
}

/* =========================================================
   API Configuration
========================================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:8000/api";

/*
 * Keep this true while developing the UI.
 *
 * Change it to false when your backend profile and
 * consent APIs are ready.
 */
const USE_DUMMY_DATA = false;

/* =========================================================
   Dummy Data
========================================================= */

const dummyPatient: PatientProfile = {
  id: "PAT-2026-00124",

  full_name: "Ananya Iyer",
  date_of_birth: "2002-05-18",
  gender: "Female",

  aadhaar: "123456789012",
  abha_id: "12-3456-7890-1234",

  mobile: "9876543210",
  email: "ananya.iyer@example.com",

  address: "42, MG Road, Shivaji Nagar",
  state: "Maharashtra",
  district: "Pune",

  emergency_contact: "9812345678",
  relationship: "Parent",

  is_active: true,
  is_verified: true,

  verification: {
    mobile: true,
    email: true,
    aadhaar: true,
    abha: false,
  },

  created_at: "2026-08-28T09:30:00Z",
  last_login_at: "2026-08-30T11:52:00Z",

  consent: {
    status: "active",
    preferred_language: "en-IN",

    granted_at: "2026-08-29T10:15:00Z",
    updated_at: "2026-08-29T10:15:00Z",

    choices: {
      medical_history: true,
      ai_assistance: true,
      physician_sharing: true,
      document_processing: true,
      abha_linking: false,
      privacy_notice: true,
    },
  },
};

/* =========================================================
   Consent Display Configuration
========================================================= */

const consentCategories: Array<{
  key: keyof ConsentChoices;
  title: string;
  description: string;
  required: boolean;
}> = [
  {
    key: "medical_history",
    title: "Medical history collection",
    description:
      "Allows the platform to collect the health information shared by the patient.",
    required: true,
  },
  {
    key: "ai_assistance",
    title: "AI-assisted processing",
    description:
      "Allows AI to analyze the supplied information and prepare a clinical history draft.",
    required: true,
  },
  {
    key: "physician_sharing",
    title: "Physician sharing",
    description:
      "Allows the generated patient summary to be shared with the assigned physician.",
    required: true,
  },
  {
    key: "document_processing",
    title: "Document processing",
    description:
      "Allows uploaded prescriptions, reports and discharge summaries to be processed.",
    required: false,
  },
  {
    key: "abha_linking",
    title: "ABHA linking",
    description:
      "Allows the patient's health information to be linked with their ABHA profile.",
    required: false,
  },
  {
    key: "privacy_notice",
    title: "Privacy notice",
    description:
      "Confirms that the patient has read and accepted the privacy notice.",
    required: true,
  },
];

/* =========================================================
   Languages
========================================================= */

const languageNames: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "हिंदी",
  "as-IN": "অসমীয়া",
  "bn-IN": "বাংলা",
  "mr-IN": "मराठी",
  "ta-IN": "தமிழ்",
  "te-IN": "తెలుగు",
};

/* =========================================================
   Backend API - Patient Profile

   GET /api/patients/me

   Expected response:
   {
      id,
      full_name,
      date_of_birth,
      ...
   }
========================================================= */

async function fetchPatientProfile(): Promise<
  Omit<PatientProfile, "consent">
> {
  const response = await fetch(
    `${API_BASE_URL}/profile/`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Your session has expired. Please login again.",
      );
    }

    throw new Error(
      "Unable to load patient profile.",
    );
  }

  return response.json();
}

/* =========================================================
   Backend API - Consent

   GET /api/consent
========================================================= */

async function fetchPatientConsent(): Promise<ConsentRecord | null> {
  const response = await fetch(
    `${API_BASE_URL}/consent`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      "Unable to load consent information.",
    );
  }

  return response.json();
}

/* =========================================================
   Formatting Helpers
========================================================= */

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function maskAadhaar(aadhaar: string) {
  return aadhaar;
  // const digits = aadhaar.replace(/\D/g, "");

  // if (digits.length !== 12) {
  //   return "•••• •••• ••••";
  // }

  // return `•••• •••• ${digits.slice(-4)}`;
}

function formatMobile(mobile: string | null) {
  if (!mobile) {
    return "Not provided";
  }

  const digits = mobile.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91 ${digits.slice(
      0,
      5,
    )} ${digits.slice(5)}`;
  }

  return mobile;
}

/* =========================================================
   Small Components
========================================================= */

function VerificationBadge({
  verified,
}: {
  verified: boolean;
}) {
  return (
    <span
      className={
        verified
          ? "profile-verification verified"
          : "profile-verification pending"
      }
    >
      {verified ? (
        <>
          <BadgeCheck size={14} />
          Verified
        </>
      ) : (
        <>
          <Clock size={14} />
          Not verified
        </>
      )}
    </span>
  );
}

function DetailItem({
  icon,
  label,
  value,
  verification,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  verification?: boolean;
}) {
  return (
    <div className="profile-detail-item">
      <div className="profile-detail-icon">
        {icon}
      </div>

      <div className="profile-detail-content">
        <span className="profile-detail-label">
          {label}
        </span>

        <strong>{value}</strong>

        {verification !== undefined && (
          <VerificationBadge
            verified={verification}
          />
        )}
      </div>
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
  verified,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  verified?: boolean;
}) {
  return (
    <div className="profile-field">
      <div className="profile-field-icon">
        {icon}
      </div>

      <div className="profile-field-content">
        <span>{label}</span>

        <div className="profile-field-value">
          <strong>{value}</strong>

          {verified !== undefined && (
            <VerificationBadge
              verified={verified}
            />
          )}
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   Patient Profile Page
========================================================= */

export default function PatientProfilePage() {
  const [profile, setProfile] =
    useState<PatientProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     Internal navigation

     PatientProfilePage itself requires NO go prop.
  ======================================================= */

  /* =======================================================
     Load Profile

     Dummy data is currently used.

     Set USE_DUMMY_DATA = false when the backend APIs
     are ready.
  ======================================================= */

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const patientData = await fetchPatientProfile();
        console.log(patientData)
        if (USE_DUMMY_DATA) {
          if (active) {
            setProfile(dummyPatient);
          }

          return;
        }

        /*
         * API implementation ready for later:
         */

        const [
          consentData,
        ] = await Promise.all([
          fetchPatientConsent(),
        ]);

        if (!active) {
          return;
        }

        setProfile({
          ...patientData,
          consent: consentData,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load patient profile.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  /* =======================================================
     Profile Completion
  ======================================================= */

  const profileCompletion = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const fields = [
      profile.full_name,
      profile.date_of_birth,
      profile.gender,
      profile.aadhaar,
      profile.mobile,
      profile.address,
      profile.state,
      profile.district,
      profile.email,
      profile.abha_id,
      profile.emergency_contact,
    ];

    const completed = fields.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "",
    ).length;

    return Math.round(
      (completed / fields.length) * 100,
    );
  }, [profile]);

  /* =======================================================
     Loading
  ======================================================= */

  if (loading) {
    return (
      <div>
        <div className="card">
          <div className="profile-loading">
            Loading patient profile...
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     Error
  ======================================================= */

  if (error || !profile) {
    return (
      <div>
        <section className="page-intro">
          <div>
            <span className="eyebrow">
              Patient
            </span>

            <h1>Patient profile</h1>
          </div>
        </section>

        <div
          className="form-error"
          role="alert"
        >
          {error ||
            "Unable to load patient profile."}
        </div>
      </div>
    );
  }

return (
  <div className="patient-profile-page">
    {/* =====================================================
        HERO
    ===================================================== */}

    <section className="profile-hero">
      <div className="profile-hero-bg" />

      <div className="profile-hero-content">
        <div className="profile-avatar-large">
          <span>
            {profile.full_name
              .split(" ")
              .map((name) => name[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>

          {profile.is_verified && (
            <div className="avatar-verified">
              <BadgeCheck size={17} />
            </div>
          )}
        </div>

        <div className="profile-hero-info">
          <div className="profile-title-row">
            <div>
              <div className="profile-name-line">
                <h1>{profile.full_name}</h1>

                <span
                  className={
                    profile.is_active
                      ? "profile-status active"
                      : "profile-status inactive"
                  }
                >
                  <span />
                  {profile.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <p>
                Patient ID{" "}
                <strong>{profile.id}</strong>
              </p>
            </div>
          </div>

          <div className="profile-hero-meta">
            <div>
              <CalendarDays size={16} />
              <span>
                {formatDate(profile.date_of_birth)}
              </span>
            </div>

            <div>
              <UserRound size={16} />
              <span>{profile.gender}</span>
            </div>

            <div>
              <MapPin size={16} />
              <span>
                {profile.district}, {profile.state}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-completion-card">
          <div className="profile-completion-head">
            <span>Profile completion</span>
            <strong>{profileCompletion}%</strong>
          </div>

          <div className="profile-progress">
            <div
              style={{
                width: `${profileCompletion}%`,
              }}
            />
          </div>

          <small>
            Keep your details updated for smoother
            consultations.
          </small>
        </div>
      </div>
    </section>

    {/* =====================================================
        QUICK STATUS
    ===================================================== */}

    <section className="profile-quick-grid">
      <div className="quick-stat">
        <div className="quick-stat-icon green">
          <ShieldCheck size={20} />
        </div>

        <div>
          <span>Profile status</span>
          <strong>
            {profile.is_verified
              ? "Verified"
              : "Verification pending"}
          </strong>
        </div>
      </div>

      <div className="quick-stat">
        <div className="quick-stat-icon blue">
          <HeartPulse size={20} />
        </div>

        <div>
          <span>ABHA</span>
          <strong>
            {/* {profile.abha_id
              ? profile.verification.abha
                ? "Linked & verified"
                : "Linked"
              : "Not linked"} */
              "Not Linked"
              }
          </strong>
        </div>
      </div>

      <div className="quick-stat">
        <div className="quick-stat-icon violet">
          <FileCheck2 size={20} />
        </div>

        <div>
          <span>Consent</span>
          <strong>
            {profile.consent?.status === "active"
              ? "Active"
              : "Not active"}
          </strong>
        </div>
      </div>

      <div className="quick-stat">
        <div className="quick-stat-icon amber">
          <Clock size={20} />
        </div>

        <div>
          <span>Last login</span>
          <strong>
            {formatDateTime(profile.last_login_at)}
          </strong>
        </div>
      </div>
    </section>

    {/* =====================================================
        MAIN PROFILE GRID
    ===================================================== */}

    <div className="profile-main-grid">
      {/* ===================================================
          LEFT COLUMN
      =================================================== */}

      <div className="profile-main-column">
        {/* PERSONAL INFORMATION */}

        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-heading">
              <div className="section-icon">
                <UserRound size={20} />
              </div>

              <div>
                <h2>Personal information</h2>
                <p>
                  Your basic personal and contact
                  details
                </p>
              </div>
            </div>
          </div>

          <div className="profile-info-grid">
            <ProfileField
              icon={<UserRound size={18} />}
              label="Full name"
              value={profile.full_name}
            />

            <ProfileField
              icon={<CalendarDays size={18} />}
              label="Date of birth"
              value={formatDate(
                profile.date_of_birth,
              )}
            />

            <ProfileField
              icon={<CircleUserRound size={18} />}
              label="Gender"
              value={profile.gender}
            />

            <ProfileField
              icon={<Phone size={18} />}
              label="Mobile number"
              value={formatMobile(profile.mobile)}
              verified={
                false
              }
            />

            <ProfileField
              icon={<Mail size={18} />}
              label="Email address"
              value={
                profile.email ?? "Not provided"
              }
              verified={
                false
              }
            />
          </div>
        </section>

        {/* ADDRESS */}

        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-heading">
              <div className="section-icon">
                <MapPin size={20} />
              </div>

              <div>
                <h2>Address</h2>
                <p>
                  Registered residential address
                </p>
              </div>
            </div>
          </div>

          <div className="address-card">
            <div className="address-map-icon">
              <MapPin size={22} />
            </div>

            <div>
              <strong>{profile.address}</strong>

              <p>
                {profile.district}, {profile.state}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="profile-side-column">
        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-heading">
              <div className="section-icon">
                <IdCard size={20} />
              </div>
              <div>
                <h2>Health identity</h2>
                <p>
                  Aadhaar and ABHA information
                </p>
              </div>
            </div>
          </div>
          <div className="identity-list">
            <div className="identity-item">
              <div className="identity-top">
                <span>Aadhaar</span>

                <VerificationBadge
                  verified={
                    // profile.verification.aadhaar
                    false
                  }
                />
              </div>

              <strong>
                {maskAadhaar(profile.aadhaar)}
              </strong>
            </div>

            <div className="identity-item">
              <div className="identity-top">
                <span>ABHA ID</span>

                {profile.abha_id && (
                  <VerificationBadge
                    verified={
                      // profile.verification.abha
                      false
                    }
                  />
                )}
              </div>

              <strong>
                {profile.abha_id ?? "Not linked"}
              </strong>
            </div>
          </div>

          <div className="security-note">
            <ShieldCheck size={18} />

            <p>
              Aadhaar information is masked to
              protect your identity.
            </p>
          </div>
        </section>

        {/* EMERGENCY CONTACT */}

        <section className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-heading">
              <div className="section-icon danger">
                <UsersRound size={20} />
              </div>

              <div>
                <h2>Emergency contact</h2>
                <p>
                  Contact during an emergency
                </p>
              </div>
            </div>
          </div>

          {profile.emergency_contact ? (
            <div className="emergency-card">
              <div className="emergency-avatar">
                <UsersRound size={21} />
              </div>

              <div>
                <strong>
                  {profile.relationship ??
                    "Emergency contact"}
                </strong>

                <span>
                  {formatMobile(
                    profile.emergency_contact,
                  )}
                </span>
              </div>

              <a
                href={`tel:${profile.emergency_contact}`}
                className="phone-action"
                aria-label="Call emergency contact"
              >
                <Phone size={17} />
              </a>
            </div>
          ) : (
            <div className="empty-state">
              <UsersRound size={23} />

              <span>
                No emergency contact added.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>

    {/* =====================================================
        CONSENT
    ===================================================== */}

    <section className="profile-card consent-section">
      <div className="profile-card-header consent-header">
        <div className="profile-card-heading">
          <div className="section-icon">
            <FileCheck2 size={20} />
          </div>

          <div>
            <h2>Consent & permissions</h2>

            <p>
              Review how your health information
              can be processed and shared.
            </p>
          </div>
        </div>

        {profile.consent && (
          <div
            className={`consent-state ${profile.consent.status}`}
          >
            {profile.consent.status === "active" ? (
              <ShieldCheck size={16} />
            ) : (
              <ShieldX size={16} />
            )}

            {profile.consent.status
              .charAt(0)
              .toUpperCase() +
              profile.consent.status.slice(1)}
          </div>
        )}
      </div>

      {!profile.consent ? (
        <div className="consent-empty">
          <div>
            <ShieldX size={25} />
          </div>

          <div>
            <strong>No consent record</strong>

            <p>
              You have not provided consent yet.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* META */}

          <div className="consent-meta-grid">
            <div>
              <span>Preferred language</span>

              <strong>
                {languageNames[
                  profile.consent
                    .preferred_language
                ] ??
                  profile.consent
                    .preferred_language}
              </strong>
            </div>

            <div>
              <span>Consent provided</span>

              <strong>
                {formatDateTime(
                  profile.consent.granted_at,
                )}
              </strong>
            </div>

            <div>
              <span>Last updated</span>

              <strong>
                {formatDateTime(
                  profile.consent.updated_at,
                )}
              </strong>
            </div>
          </div>

          {/* PERMISSIONS */}

          <div className="consent-grid">
            {consentCategories.map(
              (category) => {
                const granted =
                  profile.consent!.choices[
                    category.key
                  ];

                return (
                  <div
                    key={category.key}
                    className={`consent-permission ${
                      granted
                        ? "permission-granted"
                        : "permission-denied"
                    }`}
                  >
                    <div
                      className={`permission-icon ${
                        granted
                          ? "granted"
                          : "denied"
                      }`}
                    >
                      {granted ? (
                        <Check size={17} />
                      ) : (
                        <ShieldX size={17} />
                      )}
                    </div>

                    <div className="permission-content">
                      <div className="permission-heading">
                        <strong>
                          {category.title}
                        </strong>

                        {category.required && (
                          <span>
                            Required
                          </span>
                        )}
                      </div>

                      <p>
                        {category.description}
                      </p>
                    </div>

                    <div
                      className={`permission-badge ${
                        granted
                          ? "granted"
                          : "denied"
                      }`}
                    >
                      {granted
                        ? "Granted"
                        : "Not granted"}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </section>

    {/* =====================================================
        ACCOUNT INFORMATION
    ===================================================== */}

    <section className="profile-card account-section">
      <div className="profile-card-header">
        <div className="profile-card-heading">
          <div className="section-icon">
            <Activity size={20} />
          </div>

          <div>
            <h2>Account activity</h2>
            <p>
              Security and account information
            </p>
          </div>
        </div>
      </div>

      <div className="account-grid">
        <div className="account-item">
          <CalendarDays size={19} />

          <div>
            <span>Profile created</span>

            <strong>
              {formatDateTime(profile.created_at)}
            </strong>
          </div>
        </div>

        <div className="account-item">
          <Clock size={19} />

          <div>
            <span>Last login</span>

            <strong>
              {formatDateTime(
                profile.last_login_at,
              )}
            </strong>
          </div>
        </div>

        <div className="account-item">
          <ShieldCheck size={19} />

          <div>
            <span>Verification</span>

            <strong>
              {profile.is_verified
                ? "Verified account"
                : "Verification pending"}
            </strong>
          </div>
        </div>
      </div>
    </section>
  </div>
);
}