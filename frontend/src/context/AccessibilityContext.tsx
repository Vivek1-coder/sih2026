import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useAuth from "../hooks/useAuth";
import { translate } from "../i18n/locales";
import { AccessibilityContext } from "./accessibilityContextValue";

export default function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { preferredLanguage, setPreferredLanguage } = useAuth();
  const [largeText, setLargeText] = useState(false);
  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", largeText ? "1.18" : "1");
    document.documentElement.lang = preferredLanguage.split("-")[0];
  }, [largeText, preferredLanguage]);
  const toggleLargeText = useCallback(() => setLargeText((current) => !current), []);
  const t = useCallback((key: string) => translate(preferredLanguage, key), [preferredLanguage]);
  const value = useMemo(() => ({ language: preferredLanguage, setLanguage: setPreferredLanguage, largeText, toggleLargeText, t }), [preferredLanguage, setPreferredLanguage, largeText, toggleLargeText, t]);
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}
