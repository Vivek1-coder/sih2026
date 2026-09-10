"""Language-specific presentation of a saved summary; never edits reviewed data."""
import json
from app.services.llm_service import _chat, llm_service
from app.services.localized_clinical import localize_fallback

def localized_sections(sections: dict[str, str], language: str) -> dict[str, str]:
    target = "Hindi" if language.startswith("hi") else "English"
    raw = _chat(
        f"Translate only the string values of this clinical-history JSON into {target}. "
        "Keep every key unchanged. Preserve all facts, numbers, medications, uncertainty and negations. "
        "Do not add diagnoses, recommendations or any new information. Return only JSON.",
        json.dumps(sections, ensure_ascii=False), max_tokens=1600, temperature=0,
    )
    if raw:
        try:
            translated = json.loads(raw)
            if isinstance(translated, dict) and translated.keys() == sections.keys() and all(isinstance(value, str) and value.strip() for value in translated.values()):
                return translated
        except (ValueError, TypeError):
            pass
    if target == "Hindi":
        return {key: localize_fallback(value) for key, value in sections.items()}
    # Untranslated patient narrative remains verbatim if translation is unavailable.
    return sections.copy()

def localize_response(response, language: str):
    if response.preferred_language == language:
        return response
    sections = localized_sections(response.sections, language)
    return response.model_copy(update={
        "sections": sections,
        "preferred_language": language,
        "readbacks": llm_service.generate_readbacks(sections, language),
    })
