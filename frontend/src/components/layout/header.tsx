import {
  Accessibility,
  Activity,
  FlaskConical,
  HeartPulse,
  Home,
  Languages,
  LogOut,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../../styles/navbar.css";
import useAccessibility from "../../hooks/useAccessibility";
import useAuth from "../../hooks/useAuth";
import { supportedLanguages } from "../../i18n/locales";

const sections: Record<string, string> = {
  "/patient/identify": "nav.identify",
  "/patient/home": "patient.home",
  "/patient/location": "patient.location",
  "/patient/consent": "nav.consent",
  "/patient/interview": "nav.interview",
  "/patient/triage-alert": "nav.triage",
  "/patient/documents": "patient.documents",
  "/patient/summary": "nav.summary",
  "/patient/complete": "nav.complete",
  "/patient/profile": "patient.profile",
  "/physician": "nav.queue",
  "/lab": "lab.title",
};

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export default function Header({
  section,
}: {
  physician?: boolean;
  section?: string;
}) {
  const {
    language,
    setLanguage,
    largeText,
    toggleLargeText,
    t,
  } = useAccessibility();

  const { user, status, logout } = useAuth();

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const signedIn = status === "authenticated";

  const staffDesk = pathname.startsWith("/lab")
    ? "lab"
    : pathname.startsWith("/physician")
      ? "physician"
      : null;

  const links: NavItem[] = [
    {
      path: signedIn ? "/patient/home" : "/patient/identify",
      label: "nav.patient",
      icon: signedIn ? Home : UserRound,
    },
    {
      path: "/lab",
      label: "nav.lab",
      icon: FlaskConical,
    },
    {
      path: "/physician",
      label: "nav.physician",
      icon: Stethoscope,
    },
    ...(signedIn && !staffDesk
      ? [
          {
            path: "/patient/profile",
            label: "patient.profile",
            icon: UserRound,
          },
        ]
      : []),
  ];

  const current =
    section ??
    t(
      sections[pathname] ??
        (pathname.startsWith("/physician/patient/")
          ? "nav.consultation"
          : "nav.welcome"),
    );

  const handleLogout = async () => {
    await logout();

    sessionStorage.removeItem("medikiosk-visit");

    navigate("/patient/identify");
  };

  return (
    <header className="medikiosk-navbar">
      {/* -------------------------------------------------
          BRAND
      -------------------------------------------------- */}
      <NavLink
        className="navbar-brand"
        to="/"
        aria-label="MediKiosk home"
      >
        <span className="navbar-logo">
          <HeartPulse size={21} strokeWidth={2.4} />
        </span>

        <span className="navbar-brand-text">
          Medi<span>Kiosk</span>
        </span>
      </NavLink>

      {/* -------------------------------------------------
          MAIN NAVIGATION
      -------------------------------------------------- */}
      <nav
        className="navbar-navigation"
        aria-label={t("nav.label")}
      >
        <div className="navbar-links">
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="navbar-link-icon">
                <Icon size={17} strokeWidth={2} />
              </span>

              <span className="navbar-link-label">
                {t(label)}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Current flow / page */}
        {/* {pathname !== "/" && (
          <div
            className="navbar-current"
            aria-current="page"
          >
            <span className="navbar-current-icon">
              <Activity size={14} />
            </span>

            <span className="navbar-current-text">
              {current}
            </span>
          </div>
        )} */}
      </nav>

      {/* -------------------------------------------------
          ACTIONS
      -------------------------------------------------- */}
      <div className="navbar-actions">
        {/* Language */}
        <label
          className="navbar-action navbar-language"
          title={t("header.language")}
        >
          <Languages size={18} />

          <span className="sr-only">
            {t("header.language")}
          </span>

          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value)
            }
            aria-label={t("header.language")}
          >
            {supportedLanguages.map((item) => (
              <option
                key={item.code}
                value={item.code}
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {/* Accessibility */}
        <button
          type="button"
          className={`navbar-action ${
            largeText ? "active" : ""
          }`}
          onClick={toggleLargeText}
          aria-label={t("header.accessibility")}
          aria-pressed={largeText}
          title={t("header.accessibility")}
        >
          <Accessibility size={18} />

          <span className="navbar-action-label">
            Accessibility
          </span>
        </button>

        <span className="navbar-divider" />

        {/* Staff profile */}
        {staffDesk && (
          <div className="navbar-profile">
            <span className="navbar-avatar">
              {staffDesk === "lab" ? (
                <FlaskConical size={17} />
              ) : (
                <Stethoscope size={17} />
              )}
            </span>

            <div className="navbar-profile-info">
              <span className="navbar-profile-label">
                Workspace
              </span>

              <strong>
                {t(
                  staffDesk === "lab"
                    ? "nav.lab"
                    : "nav.physician",
                )}
              </strong>
            </div>
          </div>
        )}

        {/* Patient profile */}
        {signedIn && !staffDesk && (
          <>
            <NavLink
              to="/patient/profile"
              className="navbar-profile"
              aria-label={t("patient.profile")}
            >
              <span className="navbar-avatar">
                <UserRound size={17} />
              </span>

              <div className="navbar-profile-info">
                <span className="navbar-profile-label">
                  Patient
                </span>

                <strong>
                  {user?.display_name || "Profile"}
                </strong>
              </div>
            </NavLink>

            <button
              type="button"
              className="navbar-action navbar-logout"
              aria-label={t("nav.signOut")}
              title={t("nav.signOut")}
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}