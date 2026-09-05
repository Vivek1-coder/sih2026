"""LLM integration — Groq-backed generation with deterministic fallbacks.

The service keeps the same public API used by the interview and summary engines.

When GROQ_API_KEY is missing, the Groq package is unavailable, the API call fails,
or the model returns invalid output, the service falls back to deterministic local
logic so the application can continue working.
"""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Groq helpers
# ---------------------------------------------------------------------------

_FOLLOW_UP_SYSTEM_PROMPT = """You are a medical history-taking assistant embedded in a patient kiosk.

Your only job is to phrase ONE clear, simple follow-up question based on what the
patient just said.

STRICT RULES:
- NEVER offer a diagnosis, prognosis, or medical advice.
- NEVER reassure or alarm the patient.
- NEVER ask more than one question.
- Output ONLY valid JSON — no markdown fences and no prose outside the JSON.
- Keep the wording simple and easy to understand.
- Use the requested patient language when possible.

Required output schema (no other keys):
{"question_text": "<one follow-up question>", "input_type": "free_text", "options": null}
"""


def _groq_client():
    """Return a cached Groq client, or None when Groq is not configured."""
    from app.core.config import settings

    api_key = (getattr(settings, "GROQ_API_KEY", "") or "").strip()
    if not api_key:
        return None

    try:
        from groq import Groq
    except ImportError:
        logger.warning("groq package is not installed; using deterministic fallback")
        return None

    try:
        instance = getattr(_groq_client, "_instance", None)
        if instance is None:
            instance = Groq(api_key=api_key, timeout=8)
            setattr(_groq_client, "_instance", instance)
        return instance
    except Exception as exc:  # noqa: BLE001
        logger.warning("Groq client initialization failed: %s", exc)
        return None


def _model() -> str:
    """Return the configured Groq model with a safe default."""
    from app.core.config import settings

    return (
        (getattr(settings, "GROQ_MODEL", "") or "").strip()
        or "llama-3.3-70b-versatile"
    )


def _chat(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.3,
) -> str | None:
    """Call Groq and return response text, or None on any failure."""
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
            temperature=temperature,
        )

        if not response.choices:
            return None

        content = response.choices[0].message.content
        return content.strip() if content else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Groq API call failed: %s", exc)
        return None


def _parse_json_object(raw: str) -> dict[str, object] | None:
    """Parse a JSON object, tolerating accidental Markdown code fences."""
    text = raw.strip()

    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(
            line for line in lines if not line.strip().startswith("```")
        ).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Last-resort extraction if the model puts prose around the JSON object.
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end < start:
            return None

        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    return data if isinstance(data, dict) else None


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class LLMService:
    # ------------------------------------------------------------------
    # 1. Adaptive interview follow-up
    # ------------------------------------------------------------------

    def generate_free_text_follow_up(
        self,
        latest_answer: str,
        preferred_language: str,
    ) -> str:
        """Return one safe follow-up question.

        Groq is attempted first. Any configuration, network, parsing, or schema
        failure falls back to the deterministic local implementation.
        """
        scripted = self._scripted_follow_up(latest_answer)

        cleaned = latest_answer.replace("_", " ").strip()
        user_message = (
            f'Patient response: "{cleaned}".\n'
            f"Preferred language code: {preferred_language}.\n"
            "Return exactly one appropriate clinical-history follow-up question "
            "using the required JSON schema."
        )

        raw = _chat(
            _FOLLOW_UP_SYSTEM_PROMPT,
            user_message,
            max_tokens=120,
            temperature=0.3,
        )
        if not raw:
            return scripted

        parsed = _parse_json_object(raw)
        if not parsed:
            logger.warning("Groq follow-up response was not valid JSON; using fallback")
            return scripted

        question_text = parsed.get("question_text")
        input_type = parsed.get("input_type")
        options = parsed.get("options")

        if (
            not isinstance(question_text, str)
            or not question_text.strip()
            or input_type != "free_text"
            or options is not None
        ):
            logger.warning("Groq follow-up response failed schema validation; using fallback")
            return scripted

        return question_text.strip()

    @staticmethod
    def _scripted_follow_up(latest_answer: str) -> str:
        cleaned = latest_answer.replace("_", " ").strip()

        if cleaned and cleaned.lower() not in {"other", "something else"}:
            return (
                f'You mentioned "{cleaned}". Please describe when it started, '
                "what it feels like, and what makes it better or worse."
            )

        return (
            "Please describe your main health concern, when it started, and "
            "anything that makes it better or worse."
        )

    # ------------------------------------------------------------------
    # 2. Clinical summary generation
    # ------------------------------------------------------------------

    def generate_clinical_summary(
        self,
        prompt: str,
        interview_answers: list[dict[str, str]],
        document_extractions: list[dict[str, object]],
    ) -> dict[str, str]:
        """Generate a structured physician-facing history summary.

        The supplied prompt is still validated to preserve the existing service
        contract. Groq is used when available; deterministic logic is the fallback.
        """
        if "SAFETY RULES" not in prompt or "Chief Complaint" not in prompt:
            raise ValueError("Clinical summary prompt is missing safety structure")

        system = """You are a senior clinical documentation assistant at an Indian hospital.
Your task is to produce a structured, physician-ready clinical history summary.

SAFETY RULES:
- Never diagnose or suggest a diagnosis.
- Never recommend medications or treatments.
- Do not invent or infer facts that the patient did not provide.
- Every section must be clearly labelled.
- If information is absent, write "Not reported".
- Output ONLY valid JSON with exactly these keys:
  "Chief Complaint",
  "History of Present Illness",
  "Past Medical / Surgical History",
  "Drug & Allergy History",
  "Family History",
  "Personal History",
  "Review of Systems",
  "Prior Investigations"
- If AYUSH / Ayurveda data is present, one additional key is allowed:
  "AYUSH · Dashavidha Pariksha"
- Every value must be a plain string; do not return nested objects or arrays.
"""

        answers_text = json.dumps(
            interview_answers,
            ensure_ascii=False,
            indent=2,
        )
        documents_text = json.dumps(
            document_extractions,
            ensure_ascii=False,
            indent=2,
            default=str,
        )

        user_message = (
            f"INTERVIEW ANSWERS:\n{answers_text}\n\n"
            f"DOCUMENT EXTRACTIONS:\n{documents_text}\n\n"
            "Produce the JSON clinical summary now."
        )

        raw = _chat(system, user_message, max_tokens=1200, temperature=0.2)
        if raw:
            sections = self._parse_summary_json(raw)
            if sections:
                return sections

            logger.warning("Groq returned an invalid clinical summary; using fallback")

        return self._fallback_summary(interview_answers, document_extractions)

    @staticmethod
    def _parse_summary_json(raw: str) -> dict[str, str] | None:
        """Extract and validate a structured summary from the model response."""
        required_keys = {
            "Chief Complaint",
            "History of Present Illness",
            "Past Medical / Surgical History",
            "Drug & Allergy History",
            "Family History",
            "Personal History",
            "Review of Systems",
            "Prior Investigations",
        }
        allowed_keys = required_keys | {"AYUSH · Dashavidha Pariksha"}

        data = _parse_json_object(raw)
        if data is None:
            return None

        # Reject unexpected keys instead of silently trusting model output.
        if any(key not in allowed_keys for key in data):
            return None

        result: dict[str, str] = {}
        for key, value in data.items():
            if not isinstance(value, str):
                return None
            cleaned_value = value.strip()
            result[key] = cleaned_value or "Not reported"

        # Require the complete standard schema.
        if not required_keys.issubset(result):
            return None

        return result

    def _fallback_summary(
        self,
        interview_answers: list[dict[str, str]],
        document_extractions: list[dict[str, object]],
    ) -> dict[str, str]:
        """Original deterministic summary used when Groq is unavailable."""

        def values_for(*section_fragments: str) -> list[str]:
            values: list[str] = []

            for answer in interview_answers:
                section = str(answer.get("section", ""))
                value = str(answer.get("value", ""))

                if any(
                    fragment.lower() in section.lower()
                    for fragment in section_fragments
                ):
                    humanized = self._humanize(value)
                    if humanized:
                        values.append(humanized)

            return values

        chief = next(
            (
                self._humanize(str(answer.get("value", "")))
                for answer in interview_answers
                if answer.get("question_id") == "chief_complaint"
                and str(answer.get("value", "")).strip()
            ),
            "Not recorded",
        )

        hpi = values_for(
            "Present illness",
            "SOCRATES",
            "Associated",
            "Neurological",
        )

        prior_investigations: list[str] = []
        for extraction in document_extractions:
            date_value = extraction.get("document_date", "date unknown")
            raw_summary = extraction.get("raw_summary", "Extracted document")
            prior_investigations.append(f"{date_value}: {raw_summary}")

        sections = {
            "Chief Complaint": chief,
            "History of Present Illness": self._join(hpi),
            "Past Medical / Surgical History": self._join(
                values_for("Past history")
            ),
            "Drug & Allergy History": self._join(
                values_for("Medications", "Allergies")
            ),
            "Family History": self._join(values_for("Family history")),
            "Personal History": self._join(values_for("Lifestyle")),
            "Review of Systems": self._join(values_for("Review of systems")),
            "Prior Investigations": self._join(prior_investigations),
        }

        ayush = values_for("Dashavidha")
        if ayush:
            sections["AYUSH · Dashavidha Pariksha"] = self._join(ayush)

        return sections

    # ------------------------------------------------------------------
    # 3. Patient-facing readback strings
    # ------------------------------------------------------------------

    def generate_readbacks(
        self,
        sections: dict[str, str],
        preferred_language: str,
    ) -> dict[str, str]:
        """Build English and localized readback text for TTS."""
        english = ". ".join(
            f"{title}: {text}" for title, text in sections.items()
        )

        if preferred_language == "en-IN":
            return {"en-IN": english}

        language_names = {
            "hi-IN": "Hindi",
            "as-IN": "Assamese",
            "bn-IN": "Bengali",
            "mr-IN": "Marathi",
            "ta-IN": "Tamil",
            "te-IN": "Telugu",
        }

        fallback_intros = {
            "hi-IN": "यह आपकी स्वास्थ्य जानकारी का मसौदा है।",
            "as-IN": "এইটো আপোনাৰ স্বাস্থ্য তথ্যৰ খচৰা।",
            "bn-IN": "এটি আপনার স্বাস্থ্য তথ্যের খসড়া।",
            "mr-IN": "हा तुमच्या आरोग्य माहितीचा मसुदा आहे.",
            "ta-IN": "இது உங்கள் சுகாதாரத் தகவலின் வரைவு.",
            "te-IN": "ఇది మీ ఆరోగ్య సమాచార ముసాయిదా.",
        }

        localized_intro: str | None = None
        language_name = language_names.get(preferred_language)

        if language_name:
            translation_system = (
                f"Translate the following single sentence into {language_name}. "
                "Return only the translated sentence, with no quotation marks or "
                "additional commentary."
            )
            intro_english = (
                "This is a draft of your health history prepared before your "
                "doctor visit."
            )
            result = _chat(
                translation_system,
                intro_english,
                max_tokens=60,
                temperature=0.1,
            )
            if result:
                localized_intro = result.strip()

        if not localized_intro:
            localized_intro = fallback_intros.get(
                preferred_language,
                "This is your draft health history.",
            )

        return {
            "en-IN": english,
            preferred_language: f"{localized_intro} {english}",
        }

    # ------------------------------------------------------------------
    # Internal deterministic helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _humanize(value: str) -> str:
        return value.replace("_", " ").strip()

    @staticmethod
    def _join(values: list[str]) -> str:
        return "; ".join(values) if values else "Not reported"


llm_service = LLMService()
