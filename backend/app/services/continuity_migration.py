"""Idempotent backfill for sessions created before visit continuity existed."""
from app.models.interview import InterviewSession
from app.models.summary import ClinicalHistorySummary


def backfill_legacy_visits():
    for session in InterviewSession.objects(__raw__={"visit_status": {"$exists": False}}):
        latest = InterviewSession.objects(patient_id=session.patient_id).order_by("-created_at").first()
        summary = ClinicalHistorySummary.objects(interview_session_id=session.id).first()
        if summary and summary.patient_acknowledged_at:
            visit_status, step = "completed", "complete"
        elif latest.id != session.id:
            visit_status = "completed" if session.status == "completed" else "abandoned"
            step = "complete" if visit_status == "completed" else "interview"
        else:
            visit_status = "in_progress"
            step = "summary" if summary else ("documents" if session.status == "completed" else "interview")
            if any(alert.priority == "urgent" for alert in session.alerts):
                step = "triage-alert"
        # Compare-and-set protects a visit concurrently resumed during deployment.
        InterviewSession.objects(pk=session.id, __raw__={"visit_status": {"$exists": False}}).update_one(
            set__visit_status=visit_status, set__step=step)
