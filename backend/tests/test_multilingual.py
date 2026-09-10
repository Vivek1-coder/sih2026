import json
from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel
from app.api.message_errors import install_message_handlers
from app.models.interview import InterviewSession
from app.services.interview_engine import interview_engine
from app.services.interview_service import interview_service
from app.services.llm_service import llm_service
from app.services.summary_localization import localize_response

def test_hindi_ontology_covers_questions_and_preserves_answer_values():
    session = InterviewSession(patient_id=uuid4().hex, preferred_language='hi-IN')
    for qid, node in interview_engine._ontology['questions'].items():
        if node.get('generator'):
            continue
        question = interview_engine.question(session, qid)
        assert any('\u0900' <= char <= '\u097f' for char in question['text'])
        assert [option['value'] for option in question['options']] == [option['value'] for option in node.get('options', [])]

def test_switching_language_preserves_answers_and_uses_hindi_followup(monkeypatch):
    monkeypatch.setattr('app.services.llm_service._chat', lambda *args, **kwargs: None)
    patient = uuid4().hex
    session = interview_service.start_or_resume(patient, 'en-IN', 'general_medicine')
    session = interview_service.submit_answer(session.id, patient, 'chief_complaint', 'other', preferred_language='hi-IN')
    assert session.preferred_language == 'hi-IN'
    assert len(session.answers) == 1
    assert 'कृपया' in interview_engine.question(session, session.current_question_id)['text']
    resumed = interview_service.start_or_resume(patient, 'en-IN')
    assert resumed.id == session.id
    assert len(resumed.answers) == 1

def test_groq_summary_prompt_requires_selected_language(monkeypatch):
    calls = []
    monkeypatch.setattr('app.services.llm_service._chat', lambda system, user, **kwargs: calls.append(system) or None)
    sections = llm_service.generate_clinical_summary('SAFETY RULES Chief Complaint\nPatient language: hi-IN', [], [])
    assert 'Hindi' in calls[0]
    assert sections['Chief Complaint'] == 'दर्ज नहीं है'
    readback = llm_service.generate_readbacks(sections, 'hi-IN')['hi-IN']
    assert 'मुख्य तकलीफ़' in readback
    assert 'Not reported' not in readback

def test_public_errors_and_validation_return_stable_codes():
    app = FastAPI()
    install_message_handlers(app)
    class Input(BaseModel):
        count: int
    @app.get('/missing')
    def missing():
        raise HTTPException(404, 'Patient not found')
    @app.post('/input')
    def validate(body: Input):
        return body
    client = TestClient(app)
    assert client.get('/missing').json() == {'code': 'patient_not_found', 'detail': 'patient_not_found'}
    result = client.post('/input', json={'count': 'invalid'}).json()
    assert result['code'] == 'validation'
    assert result['detail'][0]['field'] == 'count'
    assert 'msg' not in result['detail'][0]

def test_frontend_and_backend_question_translations_match():
    root = Path(__file__).resolve().parents[2]
    backend = json.loads((root / 'backend/app/data/questions_hi.json').read_text(encoding='utf-8'))
    frontend = json.loads((root / 'frontend/src/i18n/hi/questions.json').read_text(encoding='utf-8'))
    assert backend == frontend

def test_translating_a_summary_view_never_changes_reviewed_data(monkeypatch):
    monkeypatch.setattr('app.services.summary_localization._chat', lambda *args, **kwargs: None)
    class Snapshot(BaseModel):
        sections: dict[str, str]
        preferred_language: str
        readbacks: dict[str, str]
    original = Snapshot(sections={'Chief Complaint': 'Not reported'}, preferred_language='en-IN', readbacks={'en-IN': 'Not reported'})
    result = localize_response(original, 'hi-IN')
    assert result.sections['Chief Complaint'] == 'नहीं बताया गया'
    assert result.preferred_language == 'hi-IN'
    assert original.sections['Chief Complaint'] == 'Not reported'
    assert original.preferred_language == 'en-IN'
