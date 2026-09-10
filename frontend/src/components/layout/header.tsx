import { useState } from "react";
import Loader from "../common/Loader";
import { useTranslation } from 'react-i18next';
import { ui } from "../../i18n";
import {
  Accessibility,
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



interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export default function Header(props: {
  physician?: boolean;
  section?: string;
}) {
  void props;
  useTranslation();
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

  const [signingOut, setSigningOut] = useState(false);
  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
    await logout();

    sessionStorage.removeItem("medikiosk-visit");

    } finally { setSigningOut(false); navigate("/patient/identify"); }
  };

  return (
    <header className="medikiosk-navbar">
      {/* -------------------------------------------------
          BRAND
      -------------------------------------------------- */}
      <NavLink
        className="navbar-brand"
        to="/"
        aria-label={ui("header:medikiosk_home")}
      >
        <span className="navbar-logo">
          <HeartPulse size={21} strokeWidth={2.4} />
        </span>

        <span className="navbar-brand-text">{ui("header:medi")}<span>{ui("header:kiosk")}</span>
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
        {status === 'loading' && <Loader />}
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

          <span className="navbar-action-label">{ui("header:accessibility")}</span>
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
              <span className="navbar-profile-label">{ui("header:workspace")}</span>

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
                <span className="navbar-profile-label">{ui("header:patient")}</span>

                <strong>
                  {user?.display_name || ui("header:profile")}
                </strong>
              </div>
            </NavLink>

            <button
              type="button"
              className="navbar-action navbar-logout"
              aria-label={t("nav.signOut")}
              title={t("nav.signOut")}
              onClick={handleLogout} disabled={signingOut} aria-busy={signingOut}
            >
              {signingOut ? <Loader /> : <LogOut size={18} />}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
