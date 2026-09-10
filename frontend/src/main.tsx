import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/design-system.css";
import App from "./App.tsx";
import AuthProvider from "./context/AuthContext.tsx";
import AccessibilityProvider from "./context/AccessibilityContext.tsx";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}><BrowserRouter>
      <AuthProvider>
        <AccessibilityProvider>
          <App />
        </AccessibilityProvider>
      </AuthProvider>
    </BrowserRouter></I18nextProvider>
  </StrictMode>,
);

import './styles/glass-neon.css';
