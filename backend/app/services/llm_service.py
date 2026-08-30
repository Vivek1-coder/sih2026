"""LLM integration seam used by the interview and summary engines.

Phase 3 uses a deterministic local fallback so the demo never sends medical
data to an external model. A production adapter can replace this class while
preserving the engine contract.
"""


class LLMService:
    def generate_free_text_follow_up(
        self,
        latest_answer: str,
        preferred_language: str,
    ) -> str:
        del preferred_language  # Reserved for a future localized model adapter.
        cleaned = latest_answer.replace("_", " ").strip()
        if cleaned and cleaned not in {"other", "something else"}:
            return (
                f"You mentioned “{cleaned}”. Please describe when it started, "
                "what it feels like, and what makes it better or worse."
            )
        return (
            "Please describe your main health concern, when it started, and "
            "anything that makes it better or worse."
        )

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
