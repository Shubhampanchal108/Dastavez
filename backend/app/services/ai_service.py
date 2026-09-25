import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import HTTPException
from app.schemas.classification import ClassificationResult


load_dotenv()
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")


def get_ai_timeout_seconds(default: int = 60) -> int:
    try:
        timeout = int(os.getenv("AI_TIMEOUT_SECONDS", str(default)))
    except ValueError as error:
        raise HTTPException(status_code=503, detail="AI timeout configuration is invalid.") from error
    if timeout <= 0:
        raise HTTPException(status_code=503, detail="AI timeout configuration is invalid.")
    return timeout


def get_ai_provider() -> str:
    provider = os.getenv("AI_PROVIDER", "groq").strip().lower()
    if provider != "groq":
        raise HTTPException(status_code=503, detail="Only the configured Groq AI provider is supported.")
    return provider


def get_ai_model() -> str:
    model = os.getenv("AI_MODEL", "openai/gpt-oss-120b").strip()
    if not model:
        raise HTTPException(
            status_code=503,
            detail="No AI model is configured.",
        )
    return model


def get_groq_api_key() -> str:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Groq is configured as the AI provider, but GROQ_API_KEY is not set in backend/.env.",
        )
    return key


def _generate_groq(prompt: str, json_mode: bool | dict = False) -> str:
    api_key = get_groq_api_key()
    model = get_ai_model()
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a professional document classifier that extracts structured metadata in valid JSON format.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    request = Request(
        f"{AI_BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "DMS-Backend/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=get_ai_timeout_seconds()) as response:
            result = json.loads(response.read().decode("utf-8"))
        choices = result.get("choices") or []
        if not choices:
            raise ValueError("Groq returned no choices in completion response.")
        text = (choices[0].get("message", {}).get("content") or "").strip()
        if not text:
            raise ValueError("Groq returned an empty response.")
        return text
    except HTTPError as error:
        status_code = 503 if error.code == 429 or error.code >= 500 else 502
        detail = "Groq AI rate limit reached." if error.code == 429 else "Groq AI request failed."
        raise HTTPException(status_code=status_code, detail=detail) from error
    except (URLError, TimeoutError, OSError) as error:
        raise HTTPException(
            status_code=503,
            detail="Groq AI service is unavailable.",
        ) from error
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Groq AI returned an invalid response.",
        ) from error


def generate(prompt: str, json_mode: bool | dict = False) -> str:
    return _generate_groq(prompt, json_mode=json_mode)


def get_health() -> dict:
    model = get_ai_model()
    get_groq_api_key()
    return {"status": "configured", "provider": "groq", "model": model}


def simple_connection_test() -> str:
    provider = get_ai_provider()
    return generate(f"Reply with exactly: {provider.capitalize()} connection successful")


def simple_json_test() -> dict:
    provider = get_ai_provider()
    response = generate(
        'Return only JSON with keys "name" and "type". Set name to "Test" and type to "Document".',
        json_mode=True,
    )
    try:
        result = json.loads(response)
        if not isinstance(result, dict) or result.get("name") != "Test" or result.get("type") != "Document":
            raise ValueError("Unexpected JSON values")
        return result
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"{provider.capitalize()} did not return the expected JSON test object.",
        ) from error


MAX_CLASSIFICATION_TEXT_LENGTH = 12000


def prepare_classification_text(text: str) -> tuple[str, bool]:
    if len(text) <= MAX_CLASSIFICATION_TEXT_LENGTH:
        return text, False
    beginning = MAX_CLASSIFICATION_TEXT_LENGTH * 2 // 3
    ending = MAX_CLASSIFICATION_TEXT_LENGTH - beginning
    return text[:beginning] + "\n\n[TEXT TRUNCATED FOR AI INPUT]\n\n" + text[-ending:], True


def build_classification_prompt(document_text: str, truncated: bool) -> str:
    truncation_note = "The text was truncated. Treat omitted information as unknown." if truncated else "The text is complete."
    return f"""You are an AI-assisted document classification and information extraction assistant.
Classify the text into exactly one of: FIR, Investigation Report, Forensic Report, Charge Sheet, Court Order, Statement, Evidence Record, Other.
Return only JSON with exactly these keys: document_type, confidence, fields, missing_fields, warnings.
Confidence must be a number from 0.0 to 1.0 and means AI classification confidence only, not authenticity.
Fields must contain only these keys: case_id, document_date, person_names, department, officer_name, location, reference_number.
Use null or [] when a value is not explicitly present. Never invent values.
Put the names of fields that are not explicitly present in missing_fields.
Use Other with low confidence when uncertain. Do not make legal decisions and never claim the document is authentic, genuine, forged, or legally valid.
AI output is decision-support only and must be reviewed by a qualified human.
Report uncertainty or possible inconsistencies as warnings only.
{truncation_note}

Document text:
---
{document_text}
---"""


def parse_json_response(response: str) -> dict:
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    try:
        parsed, _ = json.JSONDecoder().raw_decode(cleaned)
    except (json.JSONDecodeError, TypeError) as error:
        raise HTTPException(status_code=502, detail="AI provider returned invalid JSON for classification.") from error
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="AI classification response must be a JSON object.")
    return parsed


def classify_text(document_text: str) -> tuple[ClassificationResult, bool, str]:
    if not document_text.strip():
        raise HTTPException(status_code=422, detail="No readable text is available. Run text extraction first.")
    prepared_text, truncated = prepare_classification_text(document_text)
    response = generate(
        build_classification_prompt(prepared_text, truncated),
        json_mode=ClassificationResult.model_json_schema(),
    )
    try:
        result = ClassificationResult.model_validate(parse_json_response(response))
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail=f"AI provider returned an invalid classification response: {error}") from error
    if truncated:
        result.warnings.append("AI input was truncated to a safe maximum length.")
    return result, truncated, get_ai_model()