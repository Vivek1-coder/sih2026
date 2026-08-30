import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import Landing from "./pages/landing";
import Consent from "./components/common/consent";
import Identify from "./pages/identify";
import Interview from "./components/common/interview";
import Documents from "./components/common/documents";
import Summary from "./pages/summary";
import Complete from "./pages/complete";
import Physician from "./pages/physician";
import Consultation from "./pages/consultationPage";
import NotFound from "./pages/notFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import TriageAlert from "./pages/triageAlert";

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);
  return { path, go };
}

export default function App() {
  const { path, go } = usePath();
  useEffect(() => {
    window.requestAnimationFrame(() => document.getElementById("patient-content")?.focus());
  }, [path]);
  const page = useMemo(() => {
    if (path === "/") return <Landing go={go} />;
    if (path === "/patient/identify") return <Identify go={go} />;
    if (path === "/patient/consent") {
      return <ProtectedRoute go={go}><Consent go={go} /></ProtectedRoute>;
    }
    if (path === "/patient/interview") {
      return <ProtectedRoute go={go} requireConsent><Interview go={go} /></ProtectedRoute>;
    }
    if (path === "/patient/triage-alert") {
      return <ProtectedRoute go={go} requireConsent><TriageAlert go={go} /></ProtectedRoute>;
    }
    if (path === "/patient/documents") {
      return <ProtectedRoute go={go} requireConsent><Documents go={go} /></ProtectedRoute>;
    }
    if (path === "/patient/summary") {
      return <ProtectedRoute go={go} requireConsent><Summary go={go} /></ProtectedRoute>;
    }
    if (path === "/patient/complete") {
      return <ProtectedRoute go={go} requireConsent><Complete go={go} /></ProtectedRoute>;
    }
    if (path === "/physician") return <Physician go={go} />;
    if (path.startsWith("/physician/patient/")) return <Consultation go={go} />;
    return <NotFound go={go} />;
  }, [path, go]);
  return page;
}
