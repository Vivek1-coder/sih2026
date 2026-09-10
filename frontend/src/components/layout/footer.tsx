import { useTranslation } from 'react-i18next';
import { ui } from "../../i18n";
import {
  ArrowUpRight,
  HeartPulse,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

import useAccessibility from "../../hooks/useAccessibility";
import './styles/footer.css'

export default function Footer() {
  useTranslation();
  const { t } = useAccessibility();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" id="footer">
      <div className="footer-glow footer-glow-one" />
      <div className="footer-glow footer-glow-two" />

      <div className="footer-container">
        <div className="footer-main">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <HeartPulse size={24} strokeWidth={2} />
              </div>

              <div>
                <strong>{ui("footer:medikiosk")}</strong>
                <span>{ui("footer:smarter_patient_intake")}</span>
              </div>
            </div>

            <p className="footer-tagline">
              {t("footer.tagline")}
            </p>

            <div className="footer-trust-badge">
              <ShieldCheck size={15} />
              <span>{ui("footer:privacyfirst_healthcare_experience")}</span>
            </div>
          </div>

          {/* Product */}
          <div className="footer-column">
            <span className="footer-column-title">{ui("footer:platform")}</span>

            <nav aria-label={ui("footer:platform_links")}>
              <a href="/patient/identify">{ui("footer:patient_checkin")}<ArrowUpRight size={13} />
              </a>

              <a href="/physician">{ui("footer:physician_dashboard")}<ArrowUpRight size={13} />
              </a>

              <a href="#workflow">{ui("footer:how_it_works")}</a>
            </nav>
          </div>

          {/* Support */}
          <div className="footer-column">
            <span className="footer-column-title">{ui("footer:support")}</span>

            <nav aria-label={ui("footer:support_links")}>
              <a href="#help" id="help">
                <HelpCircle size={14} />
                {t("footer.help")}
              </a>

              <a href="#privacy">
                {t("footer.privacy")}
              </a>

              <a href="#terms">
                {t("footer.terms")}
              </a>
            </nav>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-copyright">
            <span>© {currentYear}{ui("footer:medikiosk_2")}</span>
            <span>{ui("footer:built_for_better_consultations")}</span>
          </div>

          <p className="footer-disclaimer">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}