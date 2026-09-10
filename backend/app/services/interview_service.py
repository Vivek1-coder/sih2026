"""Interview session service — MongoDB-backed via MongoEngine.

All session state is persisted to the ``interview_sessions`` collection.
The in-memory dicts and RLock have been removed; MongoDB provides the
single source of truth and handles concurrent access.

Public method signatures are identical to the previous in-memory
implementation so routes, engine, detector, and tests need no changes.
"""

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
    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    def start_or_resume(
        self,
        patient_id: str,
        preferred_language: str,
        department: str | None = None,
    ) -> InterviewSession:
        """Return the existing active session or create a new one."""
        existing = self._active_session(patient_id)
        if existing:
            return InterviewSession.objects(pk=existing.id).modify(
                new=True, set__preferred_language=preferred_language, set__updated_at=utc_now()
            )

        session = InterviewSession(
            patient_id=patient_id,
            preferred_language=preferred_language,
            department=department,
            current_question_id=interview_engine.initial_question_id(department),
        )
        session.save()
        return session

    def current(self, patient_id: str) -> InterviewSession | None:
        """Return the most-recent session for a patient (any status), or None.

        Used by summary_service and the GET /session/current route to fetch
        the latest session even after it has been completed.
        """
        return (
            InterviewSession.objects(patient_id=patient_id)
            .order_by("-created_at")
            .first()
        )

    def _active_session(self, patient_id: str) -> InterviewSession | None:
        """Return the active (in-progress) session for a patient, or None."""
        return (
            InterviewSession.objects(patient_id=patient_id, status="active", visit_status="in_progress")
            .order_by("-created_at")
            .first()
        )

    def get_owned(self, session_id: str, patient_id: str) -> InterviewSession:
        """Return session by id, enforcing patient ownership."""
        session = InterviewSession.objects(pk=session_id).first()
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

    # ------------------------------------------------------------------
    # Answer submission
    # ------------------------------------------------------------------

    def submit_answer(
        self,
        session_id: str,
        patient_id: str,
        question_id: str,
        value: str,
        input_mode: str = "touch",
        preferred_language: str | None = None,
    ) -> InterviewSession:
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

        if preferred_language:
            session.preferred_language = preferred_language
        question = interview_engine.question(session, question_id)
        answer = InterviewAnswer(
            session_id=session.id,
            question_id=question_id,
            question_text=question["text"],
            section=question["section"],
            value=value.strip(),
            input_mode=input_mode,
        )
        session.answers.append(answer)
        self._add_new_alerts(session)

        next_q = interview_engine.next_question_id(session, question_id, value)
        session.current_question_id = next_q
        session.updated_at = utc_now()
        if next_q is None:
            session.status = "completed"
            session.completed_at = session.updated_at

        session.step = "triage-alert" if any(a.priority == "urgent" for a in session.alerts) else ("documents" if next_q is None else "interview")
        saved = InterviewSession.objects(pk=session.id, current_question_id=question_id, status="active", visit_status="in_progress").modify(
            new=True, set__answers=session.answers, set__alerts=session.alerts,
            set__department=session.department,
            set__preferred_language=session.preferred_language,
            set__priority=session.priority, set__current_question_id=session.current_question_id,
            set__status=session.status, set__step=session.step,
            set__updated_at=session.updated_at, set__completed_at=session.completed_at)
        if saved is None:
            raise HTTPException(409, "This answer was already submitted or the visit changed")
        session = saved
        from app.services.continuity_service import audit
        audit(patient_id, "answer_submitted", session_id=session.id, event_key=f"answer:{answer.id}", metadata={"question_id": question_id, "answer_id": answer.id})
        return session

    # ------------------------------------------------------------------
    # Manual completion
    # ------------------------------------------------------------------

    def complete(self, session_id: str, patient_id: str) -> InterviewSession:
        session = self.get_owned(session_id, patient_id)
        if session.current_question_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Required interview questions remain unanswered",
            )
        session.status = "completed"
        session.completed_at = session.completed_at or utc_now()
        session.updated_at = session.completed_at
        session.save()
        return session

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

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
