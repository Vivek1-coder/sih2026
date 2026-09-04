import { useContext } from "react";
import { AccessibilityContext } from "../context/accessibilityContextValue";

export default function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return context;
}
