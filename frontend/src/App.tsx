import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import "./App.css";
import { withTimeout } from "./utils/withTimeout";
import Header from "./components/layout/header";
import Loader from './components/common/Loader';
import RouteBoundary from './components/common/RouteBoundary';

const Landing = lazy(() => withTimeout(import("./pages/landing"), 20000));
const Identify = lazy(() => withTimeout(import("./pages/identify"), 20000));
const Summary = lazy(() => withTimeout(import("./pages/summary"), 20000));
const Complete = lazy(() => withTimeout(import("./pages/complete"), 20000));
const Physician = lazy(() => withTimeout(import("./pages/physician"), 20000));
const Consultation = lazy(() => withTimeout(import("./pages/consultationPage"), 20000));
const NotFound = lazy(() => withTimeout(import("./pages/notFound"), 20000));
const TriageAlert = lazy(() => withTimeout(import("./pages/triageAlert"), 20000));
const Profile = lazy(() => withTimeout(import("./pages/patientProfile"), 20000));
const PatientHome = lazy(() => withTimeout(import("./pages/patientHome"), 20000));
const PatientLocation = lazy(() => withTimeout(import("./pages/patientLocation"), 20000));
const Consent = lazy(() => withTimeout(import("./pages/consent"), 20000));
const LabWorkflow = lazy(() => withTimeout(import("./pages/lab"), 20000));

const Interview = lazy(() => withTimeout(import("./components/common/interview"), 20000));
const Documents = lazy(() => withTimeout(import("./components/common/documents"), 20000));

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
    <RouteBoundary><Suspense fallback={<><Header /><Loader fullPage /></>}><Routes>
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
    </Routes></Suspense></RouteBoundary>
  );
}
