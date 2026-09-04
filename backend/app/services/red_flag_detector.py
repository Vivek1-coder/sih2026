from dataclasses import dataclass

from app.models.interview import InterviewSession, PriorityLevel


@dataclass(frozen=True, slots=True)
class RedFlagDetection:
    rule_id: str
    reason: str
    priority: PriorityLevel
    evidence: list[str]


STROKE_KEYWORDS = (
    "stroke symptoms",
    "one sided weakness",
    "face droop",
    "facial drooping",
    "slurred speech",
    "trouble speaking",
    "arm weakness",
)


def detect_red_flags(session: InterviewSession) -> list[RedFlagDetection]:
    values = [answer.value.replace("_", " ").lower() for answer in session.answers]
    combined = " | ".join(values)
    detections: list[RedFlagDetection] = []

    has_chest_pain = any(
        phrase in combined
        for phrase in ("chest pain", "chest discomfort", "chest pressure")
    )
    has_dyspnoea = any(
        phrase in combined
        for phrase in (
            "shortness of breath",
            "breathless",
            "breathlessness",
            "difficulty breathing",
            "dyspnoea",
            "dyspnea",
        )
    )
    if has_chest_pain and has_dyspnoea:
        detections.append(
            RedFlagDetection(
                rule_id="chest_pain_with_dyspnoea",
                reason=(
                    "Chest discomfort with breathing difficulty needs immediate "
                    "clinical triage."
                ),
                priority="urgent",
                evidence=["chest pain", "shortness of breath"],
            )
        )

    stroke_matches = [keyword for keyword in STROKE_KEYWORDS if keyword in combined]
    if stroke_matches:
        detections.append(
            RedFlagDetection(
                rule_id="possible_stroke_symptoms",
                reason=(
                    "Sudden weakness, facial change, or speech difficulty needs "
                    "immediate stroke assessment."
                ),
                priority="urgent",
                evidence=stroke_matches,
            )
        )

    severe_answers = [
        answer.value
        for answer in session.answers
        if "Severity" in answer.section and answer.value.strip().isdigit()
        and int(answer.value.strip()) >= 7
    ]
    if severe_answers:
        detections.append(
            RedFlagDetection(
                rule_id="severe_pain",
                reason="Severe reported pain should be prioritised for clinical review.",
                priority="priority",
                evidence=[f"pain score {severe_answers[-1]}/10"],
            )
        )

    return detections
