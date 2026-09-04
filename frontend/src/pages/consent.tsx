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


const languages = [
  { label: "English", code: "en-IN" },
  { label: "हिंदी", code: "hi-IN" },
  { label: "অসমীয়া", code: "as-IN" },
  { label: "বাংলা", code: "bn-IN" },
  { label: "मराठी", code: "mr-IN" },
  { label: "தமிழ்", code: "ta-IN" },
  { label: "తెలుగు", code: "te-IN" },
] as const;

const explanations: Record<string, string> = {
  "en-IN":
    "We will collect the health information you choose to share and prepare an AI-assisted draft for your assigned physician. You may skip optional document processing and ABHA linking, and you may revoke consent at any time.",
  "hi-IN":
    "हम आपकी दी हुई स्वास्थ्य जानकारी से आपके डॉक्टर के लिए एआई की सहायता से एक मसौदा बनाएंगे। दस्तावेज़ और आभा लिंक करना वैकल्पिक है, और आप कभी भी सहमति वापस ले सकते हैं।",
  "as-IN":
    "আপুনি দিয়া স্বাস্থ্য তথ্যৰ পৰা চিকিৎসকৰ বাবে এটা সহায়ক খচৰা তৈয়াৰ কৰা হ’ব। নথি প্ৰক্ৰিয়াকৰণ ঐচ্ছিক আৰু আপুনি যিকোনো সময়তে সন্মতি বাতিল কৰিব পাৰে।",
  "bn-IN":
    "আপনার দেওয়া স্বাস্থ্য তথ্য থেকে চিকিৎসকের জন্য একটি সহায়ক খসড়া তৈরি হবে। নথি প্রক্রিয়াকরণ ঐচ্ছিক এবং আপনি যেকোনো সময় সম্মতি প্রত্যাহার করতে পারেন।",
  "mr-IN":
    "तुम्ही दिलेल्या आरोग्य माहितीतून डॉक्टरांसाठी एआय-सहाय्यित मसुदा तयार केला जाईल. कागदपत्र प्रक्रिया ऐच्छिक आहे आणि तुम्ही कधीही संमती मागे घेऊ शकता.",
  "ta-IN":
    "நீங்கள் பகிரும் சுகாதாரத் தகவலிலிருந்து மருத்துவருக்கான உதவி வரைவு உருவாக்கப்படும். ஆவண செயலாக்கம் விருப்பமானது; ஒப்புதலை எப்போது வேண்டுமானாலும் திரும்பப் பெறலாம்.",
  "te-IN":
    "మీరు పంచుకునే ఆరోగ్య సమాచారంతో వైద్యునికి సహాయక ముసాయిదా తయారవుతుంది. పత్రాల ప్రాసెసింగ్ ఐచ్ఛికం; సమ్మతిని ఎప్పుడైనా ఉపసంహరించుకోవచ్చు.",
};

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
  const { preferredLanguage, setPreferredLanguage } = useAuth();
  const { t } = useAccessibility();
  const [choices, setChoices] = useState<ConsentChoices>(emptyChoices);
  const [hasActiveRecord, setHasActiveRecord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const speech = useSpeech(preferredLanguage);
  const stopConsentSpeech = speech.stopSpeaking;
  const explanation = explanations[preferredLanguage] ?? explanations["en-IN"];
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    getConsent()
      .then((record) => {
        if (!active || !record) return;
        setChoices(record.choices);
        setPreferredLanguage(record.preferred_language);
        setHasActiveRecord(record.status === "active");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load consent.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      stopConsentSpeech();
    };
  }, [setPreferredLanguage, stopConsentSpeech]);

  const requiredGranted = useMemo(
    () => categories.filter((category) => category.required).every((category) => choices[category.key]),
    [choices],
  );

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const record = await saveConsent(preferredLanguage, choices);
      setHasActiveRecord(true);
      if (!record.required_granted) {
        setError("Please grant every required permission before continuing.");
        return;
      }
      navigate("/patient/interview");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save consent.");
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
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke consent.");
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

      <div className="consent-layout">
        <div className="card language-card">
          <h2>{t("consent.language")}</h2>
          <div className="language-grid">
            {languages.map((language) => (
              <button
                type="button"
                key={language.code}
                className={language.code === preferredLanguage ? "selected" : ""}
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
                onClick={() => speech.speaking ? speech.stopSpeaking() : speech.speak(explanation)}
                aria-label={speech.speaking ? "Stop consent audio" : "Play consent audio"}
                disabled={!speech.speechSynthesisSupported}
              >
                {speech.speaking ? "Ⅱ" : <Play size={22} fill="currentColor" />}
              </button>
              <div>
                <strong>{t("consent.listen")}</strong>
                <p><span className="read-dot" /> Web Speech · {preferredLanguage}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => speech.speak(explanation)}>
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="audio-progress">
              <span style={{ width: speech.speaking ? "70%" : "0%" }} />
            </div>
            <div className="audio-controls">
              <span>{speech.speaking ? "Reading aloud…" : "Ready"}</span>
              <button type="button"><Volume2 size={16} /> 0.95x</button>
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
                onChange={() => setChoices((current) => ({
                  ...current,
                  [category.key]: !current[category.key],
                }))}
              />
              <span className="custom-check"><Check size={13} /></span>
              <span>
                {t(category.title)} {category.required && <b className="required-tag">{t("consent.required")}</b>}
                <small>{t(category.description)}</small>
              </span>
            </label>
          ))}

          {error && <div className="form-error" role="alert">{error}</div>}
          {!requiredGranted && !loading && (
            <div className="consent-warning"><AlertTriangle size={16} /> {t("consent.warning")}</div>
          )}

          <button
            type="button"
            className="button primary full"
            disabled={!requiredGranted || loading || saving}
            onClick={submit}
          >
            {saving ? "Saving…" : t("consent.save")} <ArrowRight size={17} />
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
