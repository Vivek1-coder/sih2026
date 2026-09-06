import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import "./App.css";

import Landing from "./pages/landing";
import Identify from "./pages/identify";
import Summary from "./pages/summary";
import Complete from "./pages/complete";
import Physician from "./pages/physician";
import Consultation from "./pages/consultationPage";
import NotFound from "./pages/notFound";
import TriageAlert from "./pages/triageAlert";
import Profile from "./pages/patientProfile";
import PatientHome from "./pages/patientHome";
import PatientLocation from "./pages/patientLocation";
import Consent from "./pages/consent";
import LabWorkflow from "./pages/lab";

import Interview from "./components/common/interview";
import Documents from "./components/common/documents";

import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          "#patient-content, #lab-content, #physician-content, .consult-main",
        )
        ?.focus();
    });
  }, [location.pathname]);

  return (
    <Routes>
      <Route
        path="/lab"
        element={
          <LabWorkflow />
        }
      />
      <Route
        path="/patient/home"
        element={
          <ProtectedRoute>
            <PatientHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/location"
        element={
          <ProtectedRoute>
            <PatientLocation />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Landing />} />

      <Route path="/patient/identify" element={<Identify />} />

      <Route
        path="/patient/consent"
        element={
          <ProtectedRoute requireVisit>
            <Consent />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/interview"
        element={
          <ProtectedRoute requireConsent requireVisit>
            <Interview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/triage-alert"
        element={
          <ProtectedRoute requireConsent requireVisit>
            <TriageAlert />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/documents"
        element={
          <ProtectedRoute requireConsent requireVisit>
            <Documents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/summary"
        element={
          <ProtectedRoute requireConsent requireVisit>
            <Summary />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/complete"
        element={
          <ProtectedRoute requireConsent>
            <Complete />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/physician"
        element={
          <Physician />
        }
      />

      <Route
        path="/physician/patient/:patientId"
        element={
          <Consultation />
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
