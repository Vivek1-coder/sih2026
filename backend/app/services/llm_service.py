"""LLM integration — Groq (llama-3.3-70b-versatile) with deterministic fallback.

All three public methods keep the same signature as the original stub so no
caller changes are needed.  When GROQ_API_KEY is blank or the API call fails,
the service transparently falls back to the original rule-based logic so the
demo never hard-crashes.
"""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Groq client — lazy singleton so import never fails if key is missing
# ---------------------------------------------------------------------------

def _groq_client():  # type: ignore[return]
    """Return a cached Groq client, or None if the key is not configured."""
    from app.core.config import settings  # local import avoids circular deps
    if not settings.GROQ_API_KEY:
        return None
    try:
        from groq import Groq  # type: ignore[import]
        if not hasattr(_groq_client, "_instance"):
            _groq_client._instance = Groq(api_key=settings.GROQ_API_KEY)
        return _groq_client._instance
    except Exception as exc:
        logger.warning("Groq client init failed: %s", exc)
        return None


def _model() -> str:
    from app.core.config import settings
    return settings.GROQ_MODEL or "llama-3.3-70b-versatile"


def _chat(system: str, user: str, *, max_tokens: int = 1024) -> str | None:
    """Call Groq and return the text content, or None on any failure."""
    client = _groq_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=_model(),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return response.choices[0].message.content or None
    except Exception as exc:
        logger.warning("Groq API call failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class LLMService:

    # ------------------------------------------------------------------
    # 1. Adaptive follow-up question during the interview
    # ------------------------------------------------------------------

    def generate_free_text_follow_up(
        self,
        latest_answer: str,
        preferred_language: str,
    ) -> str:
        cleaned = latest_answer.replace("_", " ").strip()

        system = (
            "You are a clinical history assistant helping to collect a patient's "
            "medical history before a doctor consultation at an Indian hospital. "
            "Ask ONE concise follow-up question (max 25 words) to clarify the "
            "patient's complaint. Do not diagnose. Do not use bullet points."
        )
        user = f"The patient said: \"{cleaned}\". Ask a relevant follow-up question."

        result = _chat(system, user, max_tokens=80)
        if result:
            return result.strip()

        # Deterministic fallback
        if cleaned and cleaned not in {"other", "something else"}:
            return (
                f"You mentioned \"{cleaned}\". Please describe when it started, "
                "what it feels like, and what makes it better or worse."
            )
        return (
            "Please describe your main health concern, when it started, and "
            "anything that makes it better or worse."
        )

    # ------------------------------------------------------------------
    # 2. Clinical summary generation — the core feature
    # ------------------------------------------------------------------

    def generate_clinical_summary(
        self,
        prompt: str,
        interview_answers: list[dict[str, str]],
        document_extractions: list[dict[str, object]],
    ) -> dict[str, str]:
        if "SAFETY RULES" not in prompt or "Chief Complaint" not in prompt:
            raise ValueError("Clinical summary prompt is missing safety structure")

        system = """You are a senior clinical documentation assistant at an Indian hospital.
Your task is to produce a structured, physician-ready clinical history summary.

SAFETY RULES:
- Never diagnose or suggest a diagnosis.
- Never recommend medications or treatments.
- Every section must be clearly labelled.
- If information is absent, write "Not reported" — never fabricate.
- Output ONLY valid JSON with exactly these keys (no extra keys, no markdown):
  "Chief Complaint", "History of Present Illness",
  "Past Medical / Surgical History", "Drug & Allergy History",
  "Family History", "Personal History", "Review of Systems",
  "Prior Investigations"
- If AYUSH / Ayurveda data is present, add one more key:
  "AYUSH · Dashavidha Pariksha"
- Values must be plain strings (no nested objects).
"""

        answers_text = json.dumps(interview_answers, ensure_ascii=False, indent=2)
        docs_text = json.dumps(document_extractions, ensure_ascii=False, indent=2)
        user = (
            f"INTERVIEW ANSWERS:\n{answers_text}\n\n"
            f"DOCUMENT EXTRACTIONS:\n{docs_text}\n\n"
            "Produce the JSON clinical summary now."
        )

        raw = _chat(system, user, max_tokens=1200)
        if raw:
            sections = self._parse_summary_json(raw)
            if sections:
                return sections
            logger.warning("Groq returned non-JSON summary — falling back")

        # Deterministic fallback (original logic preserved)
        return self._fallback_summary(interview_answers, document_extractions)

    # ------------------------------------------------------------------
    # 3. Patient-facing readback strings (TTS)
    # ------------------------------------------------------------------

    def generate_readbacks(
        self,
        sections: dict[str, str],
        preferred_language: str,
    ) -> dict[str, str]:
        english = ". ".join(f"{title}: {text}" for title, text in sections.items())

        if preferred_language == "en-IN":
            return {"en-IN": english}

        # Ask Groq for a brief localized intro sentence only (keeps tokens low)
        lang_names = {
            "hi-IN": "Hindi",
            "as-IN": "Assamese",
            "bn-IN": "Bengali",
            "mr-IN": "Marathi",
            "ta-IN": "Tamil",
            "te-IN": "Telugu",
        }
        lang_name = lang_names.get(preferred_language)
        localized_intro: str | None = None

        if lang_name:
            system = (
                f"Translate the following single sentence into {lang_name}. "
                "Return only the translated sentence, nothing else."
            )
            intro_en = "This is a draft of your health history prepared before your doctor visit."
            result = _chat(system, intro_en, max_tokens=60)
            if result:
                localized_intro = result.strip()

        # Hardcoded fallback intros
        if not localized_intro:
            localized_intro = {
                "hi-IN": "यह आपकी स्वास्थ्य जानकारी का मसौदा है।",
                "as-IN": "এইটো আপোনাৰ স্বাস্থ্য তথ্যৰ খচৰা।",
                "bn-IN": "এটি আপনার স্বাস্থ্য তথ্যের খসড়া।",
                "mr-IN": "हा तुमच्या आरोग्य माहितीचा मसुदा आहे.",
                "ta-IN": "இது உங்கள் சுகாதாரத் தகவலின் வரைவு.",
                "te-IN": "ఇది మీ ఆరోగ్య సమాచార ముసాయిదా.",
            }.get(preferred_language, "This is your draft health history.")

        return {"en-IN": english, preferred_language: f"{localized_intro} {english}"}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_summary_json(raw: str) -> dict[str, str] | None:
        """Extract and validate the JSON object from a Groq response."""
        ALLOWED = {
            "Chief Complaint",
            "History of Present Illness",
            "Past Medical / Surgical History",
            "Drug & Allergy History",
            "Family History",
            "Personal History",
            "Review of Systems",
            "Prior Investigations",
            "AYUSH · Dashavidha Pariksha",
        }
        # Strip markdown code fences if the model wraps in ```json … ```
        text = raw.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(
                line for line in lines if not line.startswith("```")
            ).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try to find the first {...} block
            start = text.find("{")
            end = text.rfind("}") + 1
            if start == -1 or end == 0:
                return None
            try:
                data = json.loads(text[start:end])
            except json.JSONDecodeError:
                return None

        if not isinstance(data, dict):
            return None

        # Keep only allowed keys with string values
        result = {
            k: str(v).strip()
            for k, v in data.items()
            if k in ALLOWED and isinstance(v, str) and v.strip()
        }
        # Must at least have Chief Complaint to be valid
        return result if "Chief Complaint" in result else None

    @staticmethod
    def _humanize(value: str) -> str:
        return value.replace("_", " ").strip()

    @staticmethod
    def _join(values: list[str]) -> str:
        return "; ".join(values) if values else "Not reported"

    def _fallback_summary(
        self,
        interview_answers: list[dict[str, str]],
        document_extractions: list[dict[str, object]],
    ) -> dict[str, str]:
        """Original rule-based summary — used when Groq is unavailable."""

        def values_for(*section_fragments: str) -> list[str]:
            return [
                self._humanize(answer["value"])
                for answer in interview_answers
                if any(
                    fragment.lower() in answer["section"].lower()
                    for fragment in section_fragments
                )
            ]

        chief = next(
            (
                self._humanize(answer["value"])
                for answer in interview_answers
                if answer["question_id"] == "chief_complaint"
            ),
            "Not recorded",
        )
        hpi = values_for("Present illness", "SOCRATES", "Associated", "Neurological")
        prior_investigations: list[str] = []
        for extraction in document_extractions:
            date_value = extraction.get("document_date", "date unknown")
            raw_summary = extraction.get("raw_summary", "Extracted document")
            prior_investigations.append(f"{date_value}: {raw_summary}")

        sections = {
            "Chief Complaint": chief,
            "History of Present Illness": self._join(hpi),
            "Past Medical / Surgical History": self._join(values_for("Past history")),
            "Drug & Allergy History": self._join(values_for("Medications", "Allergies")),
            "Family History": self._join(values_for("Family history")),
            "Personal History": self._join(values_for("Lifestyle")),
            "Review of Systems": self._join(values_for("Review of systems")),
            "Prior Investigations": self._join(prior_investigations),
        }
        ayush = values_for("Dashavidha")
        if ayush:
            sections["AYUSH · Dashavidha Pariksha"] = self._join(ayush)
        return sections


llm_service = LLMService()
