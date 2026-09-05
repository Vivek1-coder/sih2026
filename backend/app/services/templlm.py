"""LLM integration seam used by the interview and summary engines.

The Groq SDK is used for free-text follow-up question generation.
All other methods retain the deterministic local implementation so the
demo works without an API key — set GROQ_API_KEY in .env for live calls.
"""

import json
import logging
import re

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a medical history-taking assistant embedded in a patient kiosk.
Your only job is to phrase ONE clear, simple follow-up question based on what the patient just said.

STRICT RULES:
- NEVER offer a diagnosis, prognosis, or medical advice.
- NEVER reassure or alarm the patient.
- NEVER ask more than one question.
- Output ONLY valid JSON — no markdown fences, no prose.
- The patient may be semi-literate; use simple everyday language.

Required output schema (no other keys):
{"question_text": "<one follow-up question>", "input_type": "free_text", "options": null}
"""


class LLMService:
    # ------------------------------------------------------------------
    # Interview: adaptive free-text follow-up (Groq-backed with fallback)
    # ------------------------------------------------------------------

    def generate_free_text_follow_up(
        self,
        latest_answer: str,
        preferred_language: str,
    ) -> str:
        """Return one follow-up question text.

        Tries the Groq API first; falls back to the scripted template on
        any error (missing key, network failure, bad JSON, schema mismatch).
        The interview must never block because Groq is unavailable.
        """
        scripted = self._scripted_follow_up(latest_answer)
        try:
            return self._groq_follow_up(latest_answer, preferred_language, scripted)
        except Exception:  # noqa: BLE001
            logger.exception("Groq follow-up generation failed; using scripted fallback")
            return scripted

    def _groq_follow_up(
        self,
        latest_answer: str,
        preferred_language: str,
        fallback: str,
    ) -> str:
        try:
            from groq import Groq  # noqa: PLC0415
        except ImportError:
            logger.warning("groq package not installed; using scripted fallback")
            return fallback

        from app.core.config import settings  # noqa: PLC0415

        api_key = settings.GROQ_API_KEY.strip()
        if not api_key:
            return fallback

        client = Groq(api_key=api_key, timeout=8)
        user_msg = (
            f"The patient said: \"{latest_answer.strip()}\". "
            f"Preferred language: {preferred_language}. "
            "Ask one appropriate clinical history follow-up question in simple English."
        )
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,
            max_tokens=120,
        )
        raw = completion.choices[0].message.content or ""
        # Strip markdown code fences if present
        raw = re.sub(r"^```[a-z]*\n?", "", raw.strip())
        raw = re.sub(r"\n?```$", "", raw.strip())
        parsed = json.loads(raw)
        question_text = parsed.get("question_text", "").strip()
        if not question_text:
            return fallback
        return question_text

    @staticmethod
    def _scripted_follow_up(latest_answer: str) -> str:
        cleaned = latest_answer.replace("_", " ").strip()
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
    # Summary: deterministic structured draft (unchanged)
    # ------------------------------------------------------------------

    def generate_clinical_summary(
        self,
        prompt: str,
        interview_answers: list[dict[str, str]],
        document_extractions: list[dict[str, object]],
    ) -> dict[str, str]:
        """Return a deterministic structured draft through the LLM seam.

        ``prompt`` is intentionally accepted and validated here so replacing
        this mock with an external model does not change the summary service.
        No patient data leaves the process in the demo implementation.
        """

        if "SAFETY RULES" not in prompt or "Chief Complaint" not in prompt:
            raise ValueError("Clinical summary prompt is missing safety structure")

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
            summary = extraction.get("raw_summary", "Extracted document")
            prior_investigations.append(f"{date_value}: {summary}")

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

    def generate_readbacks(
        self,
        sections: dict[str, str],
        preferred_language: str,
    ) -> dict[str, str]:
        english = ". ".join(f"{title}: {text}" for title, text in sections.items())
        if preferred_language == "en-IN":
            return {"en-IN": english}

        localized_intro = {
            "hi-IN": "यह आपकी स्वास्थ्य जानकारी का मसौदा है।",
            "as-IN": "এইটো আপোনাৰ স্বাস্থ্য তথ্যৰ খচৰা।",
            "bn-IN": "এটি আপনার স্বাস্থ্য তথ্যের খসড়া।",
            "mr-IN": "हा तुमच्या आरोग्य माहितीचा मसुदा आहे.",
            "ta-IN": "இது உங்கள் சுகாதாரத் தகவலின் வரைவு.",
            "te-IN": "ఇది మీ ఆరోగ్య సమాచార ముసాయిదా.",
        }.get(preferred_language, "This is your draft health history.")
        localized = f"{localized_intro} {english}"
        return {"en-IN": english, preferred_language: localized}

    @staticmethod
    def _humanize(value: str) -> str:
        return value.replace("_", " ").strip()

    @staticmethod
    def _join(values: list[str]) -> str:
        return "; ".join(values) if values else "Not reported"


llm_service = LLMService()
