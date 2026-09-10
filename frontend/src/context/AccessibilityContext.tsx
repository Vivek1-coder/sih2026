import { useTranslation } from 'react-i18next';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import useAuth from "../hooks/useAuth";
import { ui } from "../i18n";
import { AccessibilityContext } from "./accessibilityContextValue";

export default function AccessibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  useTranslation();
  const { preferredLanguage, setPreferredLanguage } = useAuth();
  const [largeText, setLargeText] = useState(false);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      largeText ? "1.18" : "1",
    );
    document.documentElement.lang = preferredLanguage.split("-")[0];
  }, [largeText, preferredLanguage]);
  const toggleLargeText = useCallback(
    () => setLargeText((current) => !current),
    [],
  );
  const t = useCallback(
    (key: string) => { void preferredLanguage; return ui(key); },
    [preferredLanguage],
  );
  const value = useMemo(
    () => ({
      language: preferredLanguage,
      setLanguage: setPreferredLanguage,
      largeText,
      toggleLargeText,
      t,
    }),
    [preferredLanguage, setPreferredLanguage, largeText, toggleLargeText, t],
  );
  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}
