
import useAccessibility from "../../hooks/useAccessibility";

export default function Footer() {
  const { t } = useAccessibility();
  return (
    <footer>
      <div>
        <strong>MediKiosk</strong>
        <p>{t("footer.tagline")}</p>
      </div>
      <div className="footer-links">
        <a href="#privacy">{t("footer.privacy")}</a>
        <a href="#help" id="help" tabIndex={-1}>{t("footer.help")}</a>
        <a href="#terms">{t("footer.terms")}</a>
      </div>
      <p className="disclaimer">
        {t("footer.disclaimer")}
      </p>
    </footer>
  );
}
