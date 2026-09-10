"""Translate known structured labels; preserve verbatim patient narrative."""
import json
from pathlib import Path

def localize_fallback(value: str) -> str:
    data = Path(__file__).resolve().parents[1] / 'data'
    en = json.loads((data / 'clinical_ontology.json').read_text(encoding='utf-8'))['questions']
    hi = json.loads((data / 'questions_hi.json').read_text(encoding='utf-8'))
    labels = {'Not reported': 'नहीं बताया गया', 'Not recorded': 'दर्ज नहीं है'}
    labels.update(json.loads((data / 'clinical_labels_hi.json').read_text(encoding='utf-8')))
    for question_id, question in en.items():
        for option in question.get('options', []):
            labels[option['value'].replace('_', ' ')] = hi.get(f"{question_id}.{option['value']}", option['label'])
    return '; '.join(labels.get(part.strip(), part.strip()) for part in value.split(';'))
