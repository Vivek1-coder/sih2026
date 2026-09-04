from threading import RLock

from fastapi import HTTPException, status

from app.models.interview import (
    InterviewAnswer,
    InterviewSession,
    RedFlagAlert,
    utc_now,
)
from app.services.interview_engine import interview_engine
from app.services.red_flag_detector import detect_red_flags

PRIORITY_ORDER = {"routine": 0, "priority": 1, "urgent": 2}


class InterviewService:
    def __init__(self) -> None:
        self._sessions: dict[str, InterviewSession] = {}
        self._latest_by_patient: dict[str, str] = {}
        self._lock = RLock()

    def start_or_resume(
        self,
        patient_id: str,
        preferred_language: str,
        department: str | None = None,
    ) -> InterviewSession:
        with self._lock:
            existing = self.current(patient_id)
            if existing and existing.status == "active":
                existing.preferred_language = preferred_language
                existing.updated_at = utc_now()
                return existing

            session = InterviewSession(
                patient_id=patient_id,
                preferred_language=preferred_language,
                department=department,
                current_question_id=interview_engine.initial_question_id(department),
            )
            self._sessions[session.id] = session
            self._latest_by_patient[patient_id] = session.id
            return session

    def current(self, patient_id: str) -> InterviewSession | None:
        session_id = self._latest_by_patient.get(patient_id)
        return self._sessions.get(session_id) if session_id else None

    def get_owned(self, session_id: str, patient_id: str) -> InterviewSession:
        session = self._sessions.get(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found",
            )
        if session.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another patient's interview",
            )
        return session

    def submit_answer(
        self,
        session_id: str,
        patient_id: str,
        question_id: str,
        value: str,
    ) -> InterviewSession:
        with self._lock:
            session = self.get_owned(session_id, patient_id)
            if session.status != "active" or not session.current_question_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Interview is already complete",
                )
            if question_id != session.current_question_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Answer does not match the current question",
                )

            question = interview_engine.question(session, question_id)
            answer = InterviewAnswer(
                session_id=session.id,
                question_id=question_id,
                question_text=question["text"],
                section=question["section"],
                value=value.strip(),
            )
            session.answers.append(answer)
            self._add_new_alerts(session)

            next_question = interview_engine.next_question_id(
                session,
                question_id,
                value,
            )
            session.current_question_id = next_question
            session.updated_at = utc_now()
            if next_question is None:
                session.status = "completed"
                session.completed_at = session.updated_at
            return session

    def complete(self, session_id: str, patient_id: str) -> InterviewSession:
        with self._lock:
            session = self.get_owned(session_id, patient_id)
            if session.current_question_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Required interview questions remain unanswered",
                )
            session.status = "completed"
            session.completed_at = session.completed_at or utc_now()
            session.updated_at = session.completed_at
            return session

    @staticmethod
    def _add_new_alerts(session: InterviewSession) -> None:
        existing_rule_ids = {alert.rule_id for alert in session.alerts}
        for detection in detect_red_flags(session):
            if detection.rule_id in existing_rule_ids:
                continue
            alert = RedFlagAlert(
                session_id=session.id,
                rule_id=detection.rule_id,
                reason=detection.reason,
                priority=detection.priority,
                evidence=detection.evidence,
            )
            session.alerts.append(alert)
            existing_rule_ids.add(alert.rule_id)
            if PRIORITY_ORDER[alert.priority] > PRIORITY_ORDER[session.priority]:
                session.priority = alert.priority


interview_service = InterviewService()
