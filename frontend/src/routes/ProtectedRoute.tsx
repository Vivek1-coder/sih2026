import Loader from "../components/common/Loader";
import Header from "../components/layout/header";
import useAccessibility from '../hooks/useAccessibility';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getConsentStatus } from '../services/consent';
import { getSessionStatus } from '../services/patient';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireConsent?: boolean;
  requireVisit?: boolean;
  role?: "patient" | "doctor" | "lab_assistant";
}

export default function ProtectedRoute({ children, redirectTo = '/patient/identify', requireConsent = false, requireVisit = false, role = "patient" }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const { t } = useAccessibility();
  const [retryCount, setRetryCount] = useState(0);
  const location = useLocation();
  const key = `${user?.id}:${location.pathname}:${requireConsent}:${requireVisit}:${retryCount}`;
  const [check, setCheck] = useState<{ key: string; consent: boolean; visit: boolean; failed?: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    if (status === 'authenticated' && (requireConsent || requireVisit)) {
      Promise.all([
        requireConsent ? getConsentStatus().then(c => c.required_granted) : Promise.resolve(true),
        requireVisit ? getSessionStatus().then(s => {
          const visit = s.session ?? (location.pathname === '/patient/summary' ? s.latest_session : null);
          return Boolean(visit?.location && sessionStorage.getItem('medikiosk-visit') === visit.id);
        }) : Promise.resolve(true),
      ]).then(([consent, visit]) => { if (active) setCheck({ key, consent, visit }); })
        .catch(() => { if (active) setCheck({ key, consent: false, visit: false, failed: true }); });
    }
    return () => { active = false; };
  }, [key, requireConsent, requireVisit, status, location.pathname]);
  if (status === 'unauthenticated') return <Navigate to={redirectTo} replace state={{ from: location.pathname }}/>;
  if (check?.key === key && check.failed) return <><Header /><main className="route-loading" role="alert"><p>{t('errors:requestFailed')}</p><button className="button primary" onClick={() => setRetryCount(n => n + 1)}>{t('common:retry')}</button></main></>;
  if (status === 'loading' || ((requireConsent || requireVisit) && check?.key !== key)) {
    return <><Header /><Loader fullPage /></>;
  }
  const actualRole = user?.role ?? "patient";
  if (status === 'authenticated' && actualRole !== role) return <Navigate to={actualRole === 'lab_assistant' ? '/lab' : actualRole === 'doctor' ? '/physician' : '/patient/home'} replace/>;
  if (requireVisit && !check?.visit) return <Navigate to="/patient/home" replace/>;
  if (requireConsent && !check?.consent) return <Navigate to="/patient/consent" replace/>;
  return children;
}
