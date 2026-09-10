import Loader from "../components/common/Loader";
import { errorText } from "../i18n";
import { useTranslation } from "react-i18next";
import { supportedLanguages } from "../i18n/locales";
import { ui } from "../i18n";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Play,
  RotateCcw,
  ShieldX,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConsentChoices } from "../types/consent.type";
import useAccessibility from "../hooks/useAccessibility";
import useAuth from "../hooks/useAuth";
import useSpeech from "../hooks/useSpeech";
import { getConsent, revokeConsent, saveConsent } from "../services/consent";
import PatientShell from "../components/common/patientShell";
import { useNavigate } from "react-router-dom";

const languages = supportedLanguages;

const categories: Array<{
  key: keyof ConsentChoices;
  title: string;
  description: string;
  required: boolean;
}> = [
  {
    key: "medical_history",
    title: "consent.medical",
    description: "consent.medicalHelp",
    required: true,
  },
  {
    key: "ai_assistance",
    title: "consent.ai",
    description: "consent.aiHelp",
    required: true,
  },
  {
    key: "physician_sharing",
    title: "consent.share",
    description: "consent.shareHelp",
    required: true,
  },
  {
    key: "document_processing",
    title: "consent.documents",
    description: "consent.documentsHelp",
    required: false,
  },
  {
    key: "abha_linking",
    title: "consent.abha",
    description: "consent.abhaHelp",
    required: false,
  },
  {
    key: "privacy_notice",
    title: "consent.privacy",
    description: "consent.privacyHelp",
    required: true,
  },
];

function emptyChoices(): ConsentChoices {
  return {
    medical_history: false,
    ai_assistance: false,
    document_processing: false,
    physician_sharing: false,
    abha_linking: false,
    privacy_notice: false,
  };
}

export default function Consent() {
  useTranslation();
  const { preferredLanguage, setPreferredLanguage } = useAuth();
  const { t } = useAccessibility();
  const [retryCount, setRetryCount] = useState(0);
  const [choices, setChoices] = useState<ConsentChoices>(emptyChoices);
  const [hasActiveRecord, setHasActiveRecord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const speech = useSpeech(preferredLanguage);
  const stopConsentSpeech = speech.stopSpeaking;
  const explanation = ui("consent:explanation");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state for this request lifecycle.
    setLoading(true);
    setError("");
    getConsent()
      .then((record) => {
        if (!active || !record) return;
        setChoices(record.choices);

        setHasActiveRecord(record.status === "active");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "errors:unable_to_load_consent",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      stopConsentSpeech();
    };
  }, [stopConsentSpeech, retryCount]);

  const requiredGranted = useMemo(
    () =>
      categories
        .filter((category) => category.required)
        .every((category) => choices[category.key]),
    [choices],
  );

  const submit = async () => {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const record = await saveConsent(preferredLanguage, choices);
      setHasActiveRecord(true);
      if (!record.required_granted) {
        setError(
          "errors:please_grant_every_required_permission_before_continuing",
        );
        return;
      }
      navigate("/patient/interview");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "errors:unable_to_save_consent",
      );
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    setError("");
    try {
      await revokeConsent();
      speech.stopSpeaking();
      setChoices(emptyChoices());
      setHasActiveRecord(false);
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "errors:unable_to_revoke_consent",
      );
    }
  };

  return (
    <PatientShell active="Converse">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("consent.eyebrow")}</span>
          <h1>{t("consent.title")}</h1>
          <p>{t("consent.lede")}</p>
        </div>
      </section>

      {loading && <Loader />}
      <div className="consent-layout" aria-busy={loading || saving}>
        <div className="card language-card">
          <h2>{t("consent.language")}</h2>
          <div className="language-grid">
            {languages.map((language) => (
              <button
                type="button"
                key={language.code}
                className={
                  language.code === preferredLanguage ? "selected" : ""
                }
                onClick={() => {
                  speech.stopSpeaking();
                  setPreferredLanguage(language.code);
                }}
              >
                {language.label}
                {language.code === preferredLanguage && <Check size={15} />}
              </button>
            ))}
          </div>

          <div className="audio-card">
            <div className="audio-top">
              <button
                type="button"
                className="play-button"
                onClick={() =>
                  speech.speaking
                    ? speech.stopSpeaking()
                    : speech.speak(explanation)
                }
                aria-label={
                  speech.speaking
                    ? ui("consent:stop_consent_audio")
                    : ui("consent:play_consent_audio")
                }
                disabled={!speech.speechSynthesisSupported}
              >
                {speech.speaking ? "Ⅱ" : <Play size={22} fill="currentColor" />}
              </button>
              <div>
                <strong>{t("consent.listen")}</strong>
                <p>
                  <span className="read-dot" />
                  {ui("consent:web_speech")}
                  {preferredLanguage}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => speech.speak(explanation)}
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="audio-progress">
              <span style={{ width: speech.speaking ? "70%" : "0%" }} />
            </div>
            <div className="audio-controls">
              <span>
                {speech.speaking
                  ? ui("consent:reading_aloud")
                  : ui("consent:ready")}
              </span>
              <button type="button">
                <Volume2 size={16} />
                {ui("consent:095x")}
              </button>
            </div>
            <p className="transcript">“{explanation}”</p>
          </div>
        </div>

        <div className="card consent-card">
          <h2>{t("consent.uses")}</h2>
          <p className="muted">{t("consent.usesHelp")}</p>
          {categories.map((category) => (
            <label className="check-row" key={category.key}>
              <input
                type="checkbox"
                checked={choices[category.key]}
                disabled={loading}
                onChange={() =>
                  setChoices((current) => ({
                    ...current,
                    [category.key]: !current[category.key],
                  }))
                }
              />
              <span className="custom-check">
                <Check size={13} />
              </span>
              <span>
                {t(category.title)}{" "}
                {category.required && (
                  <b className="required-tag">{t("consent.required")}</b>
                )}
                <small>{t(category.description)}</small>
              </span>
            </label>
          ))}

          {error && (
            <div className="form-error" role="alert">
              {errorText(error)}
              <button
                className="button secondary"
                disabled={loading || saving}
                onClick={() => setRetryCount((n) => n + 1)}
              >
                {ui("common:retry")}
              </button>
            </div>
          )}
          {!requiredGranted && !loading && (
            <div className="consent-warning">
              <AlertTriangle size={16} /> {t("consent.warning")}
            </div>
          )}

          <button
            type="button"
            className="button primary full"
            disabled={!requiredGranted || loading || saving}
            onClick={submit}
          >
            {saving ? <Loader /> : t("consent.save")} <ArrowRight size={17} />
          </button>
          {hasActiveRecord && (
            <button type="button" className="revoke-button" onClick={revoke}>
              <ShieldX size={16} /> {t("consent.revoke")}
            </button>
          )}
        </div>
      </div>
    </PatientShell>
  );
}
