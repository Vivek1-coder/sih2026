import type { ReactNode } from "react";
import Footer from "../layout/footer";
import Header from "../layout/header";
import Emergency from "./emergency";
import Stepper from "./stepper";
import type { Step } from "../../types/step.type";
import useAccessibility from "../../hooks/useAccessibility";

export default function PatientShell({
  active,
  children,
  go,
}: {
  active: Step;
  children: ReactNode;
  go: (p: string) => void;
}) {
  const { t } = useAccessibility();
  return (
    <>
      <a className="skip-link" href="#patient-content">{t("skip.content")}</a>
      <Header go={go} />
      <div className="patient-shell">
        <Stepper active={active} go={go} />
        <div id="patient-content" tabIndex={-1}>{children}</div>
      </div>
      <Emergency />
      <Footer />
    </>
  );
}
