import { createContext } from "react";

export type AccessibilityContextValue = {
  language: string;
  setLanguage: (language: string) => void;
  largeText: boolean;
  toggleLargeText: () => void;
  t: (key: string) => string;
};

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);
