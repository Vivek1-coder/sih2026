import {
  ArrowUpRight,
  HeartPulse,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

import useAccessibility from "../../hooks/useAccessibility";
import './styles/footer.css'

export default function Footer() {
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
                <strong>MediKiosk</strong>
                <span>Smarter patient intake</span>
              </div>
            </div>

            <p className="footer-tagline">
              {t("footer.tagline")}
            </p>

            <div className="footer-trust-badge">
              <ShieldCheck size={15} />
              <span>Privacy-first healthcare experience</span>
            </div>
          </div>

          {/* Product */}
          <div className="footer-column">
            <span className="footer-column-title">Platform</span>

            <nav aria-label="Platform links">
              <a href="/patient/identify">
                Patient check-in
                <ArrowUpRight size={13} />
              </a>

              <a href="/physician">
                Physician dashboard
                <ArrowUpRight size={13} />
              </a>

              <a href="#workflow">
                How it works
              </a>
            </nav>
          </div>

          {/* Support */}
          <div className="footer-column">
            <span className="footer-column-title">Support</span>

            <nav aria-label="Support links">
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
            <span>© {currentYear} MediKiosk.</span>
            <span>Built for better consultations.</span>
          </div>

          <p className="footer-disclaimer">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}