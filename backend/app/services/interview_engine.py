import json
from pathlib import Path
from typing import Any

from app.models.interview import InterviewSession
from app.services.llm_service import llm_service

ONTOLOGY_PATH = Path(__file__).resolve().parent.parent / "data" / "clinical_ontology.json"


class InterviewEngine:
    def __init__(self) -> None:
        with ONTOLOGY_PATH.open("r", encoding="utf-8") as ontology_file:
            self._ontology: dict[str, Any] = json.load(ontology_file)

    @property
    def start_question_id(self) -> str:
        return str(self._ontology["start_question"])

    def initial_question_id(self, department: str | None = None) -> str:
        if department == "ayurveda":
            return "ayush_prakriti"
        if department == "general_medicine":
            return "chief_complaint"
        return self.start_question_id

    def question(self, session: InterviewSession, question_id: str) -> dict[str, Any]:
        node = self._node(question_id)
        source = "ontology"
        text = node.get("text")
        options = node.get("options", [])
        if session.preferred_language.startswith("hi"):
            translations = json.loads((ONTOLOGY_PATH.parent / "questions_hi.json").read_text(encoding="utf-8"))
            text = translations.get(f"{question_id}.text", text)
            options = [{**option, "label": translations.get(f"{question_id}.{option['value']}", option["label"])} for option in options]
        if node.get("generator") == "free_text_follow_up":
            source = "llm_fallback"
            latest_answer = session.answers[-1].value if session.answers else ""
            text = llm_service.generate_free_text_follow_up(
                latest_answer,
                session.preferred_language,
            )
        if not text:
            raise ValueError(f"Question {question_id} has no text")
        return {
            "id": question_id,
            "text": text,
            "section": node["section"],
            "input_type": node["input_type"],
            "options": options,
            "required": node.get("required", True),
            "source": source,
        }

    def next_question_id(
        self,
        session: InterviewSession,
        question_id: str,
        answer: str,
    ) -> str | None:
        node = self._node(question_id)
        normalized = self._normalize(answer)

        if question_id == "department":
            if "ayurveda" in normalized or "ayush" in normalized:
                session.department = "ayurveda"
            else:
                session.department = "general_medicine"

        branches: dict[str, str] = node.get("branches", {})
        if branches:
            if normalized in branches:
                return branches[normalized]
            for branch_value, target in branches.items():
                if branch_value == "*":
                    continue
                phrase = branch_value.replace("_", " ")
                if phrase in normalized.replace("_", " "):
                    return target
            return branches.get("*")
        return node.get("next")

    def progress(self, session: InterviewSession) -> int:
        if session.status == "completed":
            return 100
        expected_answers = 22 if session.department == "ayurveda" else 12
        return min(95, round(len(session.answers) / expected_answers * 100))

    def _node(self, question_id: str) -> dict[str, Any]:
        try:
            return self._ontology["questions"][question_id]
        except KeyError as exc:
            raise ValueError(f"Unknown clinical question: {question_id}") from exc

    @staticmethod
    def _normalize(value: str) -> str:
        return "_".join(value.strip().lower().split())


interview_engine = InterviewEngine()
