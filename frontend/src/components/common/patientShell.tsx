import type { ReactNode } from "react";
import Footer from "../layout/footer";
import Header from "../layout/header";
import Emergency from "./emergency";
import type { Step } from "../../types/step.type";
import useAccessibility from "../../hooks/useAccessibility";

export default function PatientShell({
  children,
}: {
  active: Step;
  children: ReactNode;
}) {
  const { t } = useAccessibility();
  return (
    <>
      <a className="skip-link" href="#patient-content">
        {t("skip.content")}
      </a>
      <Header/>
      <div className="patient-shell">
        <div id="patient-content" tabIndex={-1}>
          {children}
        </div>
      </div>
      <Emergency />
      <Footer />
    </>
  );
}
