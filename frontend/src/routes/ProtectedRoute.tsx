import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getConsentStatus } from "../services/consent";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireConsent?: boolean;
}

export default function ProtectedRoute({
  children,
  redirectTo = "/patient/identify",
  requireConsent = false,
}: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  const [consentState, setConsentState] =
    useState<
      "checking" | "granted" | "missing"
    >(
      requireConsent
        ? "checking"
        : "granted",
    );

  useEffect(() => {
    if (!requireConsent) {
      setConsentState("granted");
      return;
    }

    if (status !== "authenticated") {
      setConsentState("checking");
      return;
    }

    let active = true;

    const checkConsent = async () => {
      try {
        const consent = await getConsentStatus();

        if (!active) {
          return;
        }
        setConsentState(
          consent.required_granted
            ? "granted"
            : "missing",
        );
      } catch {
        if (active) {
          setConsentState("missing");
        }
      }
    };

    void checkConsent();

    return () => {
      active = false;
    };
  }, [requireConsent, status]);

  if (status === "loading") {
    return (
      <main
        className="route-loading"
        role="status"
        aria-live="polite"
      >
        Checking your secure session…
      </main>
    );
  }


  if (status === "unauthenticated") {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  /* =====================================================
     Checking consent
  ===================================================== */

  if (
    requireConsent &&
    consentState === "checking"
  ) {
    return (
      <main
        className="route-loading"
        role="status"
        aria-live="polite"
      >
        Checking your consent permissions…
      </main>
    );
  }

  /* =====================================================
     Consent required but missing
  ===================================================== */

  if (
    requireConsent &&
    consentState === "missing"
  ) {
    return (
      <Navigate
        to="/patient/consent"
        replace
      />
    );
  }


  return children;
}
