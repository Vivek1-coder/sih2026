import { CircleHelp, HeartPulse, Languages, Stethoscope, UserRound } from "lucide-react";
import useAccessibility from "../../hooks/useAccessibility";
import { supportedLanguages } from "../../i18n/locales";
import {useNavigate } from "react-router-dom";

export default function Header({
  physician = false,
}: {
  physician?: boolean;
}) {
  const navigate = useNavigate();
  const { language, setLanguage, largeText, toggleLargeText, t } = useAccessibility();
  return (
    <header className="topbar">
      <button
        className="brand"
        onClick={() => navigate("/")}
        aria-label="MediKiosk home"
      >
        <span className="brand-mark">
          <HeartPulse size={21} />
        </span>
        <span>
          MediKiosk
        </span>
      </button>
      <div className="header-actions">
        <label className="icon-button language-picker">
          <Languages size={18} />
          <span className="sr-only">{t("header.language")}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t("header.language")}>
            {supportedLanguages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        <button
          className="icon-button"
          onClick={toggleLargeText}
          aria-label={t("header.accessibility")}
          aria-pressed={largeText}
        >
          <span className="text-size">A</span>
          <span className="desktop-only">{t("header.accessibility")}</span>
        </button>
        <button className="icon-button" aria-label={t("header.help")} onClick={() => document.getElementById("help")?.focus()}>
          <CircleHelp size={18} />
          <span className="desktop-only">{t("header.help")}</span>
        </button>
        {physician ? (
          <div className="profile">
            <span className="avatar doctor-avatar">
              <Stethoscope size={17} />
            </span>
            <span className="desktop-only">Dr. Priya Nair</span>
          </div>
        ) : (
          <div className="profile" onClick={()=>navigate("/patient/profile")}>
            <span className="avatar">
              <UserRound size={17} />
            </span>
            <span className="desktop-only">{t("header.user")}</span>
          </div>
        )}
      </div>
    </header>
  );
}
