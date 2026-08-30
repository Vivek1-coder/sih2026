import { Check } from "lucide-react";
import type { Step } from "../../types/step.type";
import useAccessibility from "../../hooks/useAccessibility";

const steps: Step[] = ["Identify", "Converse", "Scan", "Summarize", "Consult"];

export default function Stepper({ active, go }: { active: Step; go: (path: string) => void }) {
  const { t } = useAccessibility();
  const activeIndex = steps.indexOf(active);
  const labels: Record<Step, string> = { Identify: t("step.identify"), Converse: t("step.converse"), Scan: t("step.scan"), Summarize: t("step.summarize"), Consult: t("step.consult") };
  return (
    <nav className="stepper" aria-label="Patient workflow progress">
      {steps.map((step, i) => (
        <button
          key={step}
          className={`step ${i <= activeIndex ? "done" : ""} ${step === active ? "current" : ""}`}
          onClick={() =>
            i < activeIndex &&
            go(
              [
                "/patient/identify",
                "/patient/consent",
                "/patient/documents",
                "/patient/summary",
                "/patient/complete",
              ][i],
            )
          }
          aria-current={step === active ? "step" : undefined}
          disabled={i >= activeIndex}
          aria-label={`${labels[step]} · ${i + 1} of ${steps.length}`}
        >
          <span>{i < activeIndex ? <Check size={15} /> : i + 1}</span>
          <em>{labels[step]}</em>
        </button>
      ))}
    </nav>
  );
}
