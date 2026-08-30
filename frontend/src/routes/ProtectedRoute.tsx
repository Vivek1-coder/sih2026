import { useEffect, useState, type ReactNode } from "react";

import useAuth from "../hooks/useAuth";
import { getConsentStatus } from "../services/consent";

export default function ProtectedRoute({
  children,
  go,
  redirectTo = "/patient/identify",
  requireConsent = false,
}: {
  children: ReactNode;
  go: (path: string) => void;
  redirectTo?: string;
  requireConsent?: boolean;
}) {
  const { status } = useAuth();
  const [consentState, setConsentState] = useState<
    "checking" | "granted" | "missing"
  >(requireConsent ? "checking" : "granted");

  useEffect(() => {
    if (!requireConsent || status !== "authenticated") return;
    let active = true;
    getConsentStatus()
      .then((consent) => {
        if (active) {
          setConsentState(consent.required_granted ? "granted" : "missing");
        }
      })
      .catch(() => {
        if (active) setConsentState("missing");
      });
    return () => {
      active = false;
    };
  }, [requireConsent, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      go(redirectTo);
    }
    if (status === "authenticated" && consentState === "missing") {
      go("/patient/consent");
    }
  }, [consentState, go, redirectTo, status]);

  if (status === "loading" || (requireConsent && consentState === "checking")) {
    return (
      <main className="route-loading" role="status" aria-live="polite">
        Checking your secure session…
      </main>
    );
  }

  if (status === "unauthenticated" || consentState === "missing") return null;
  return children;
}
