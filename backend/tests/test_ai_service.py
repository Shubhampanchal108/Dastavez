import io
import json
import logging
from urllib.error import HTTPError, URLError

import pytest
from fastapi import HTTPException

from app.services import ai_service


class FakeResponse:
    status = 200

    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def groq_payload(content="{}"):
    return {"choices": [{"message": {"content": content}}]}


def configure_groq(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setenv("AI_MODEL", "openai/gpt-oss-120b")
    monkeypatch.setenv("AI_BASE_URL", "https://api.groq.com/openai/v1")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setattr(ai_service, "AI_BASE_URL", "https://api.groq.com/openai/v1")


def test_groq_configuration_and_payload(monkeypatch):
    configure_groq(monkeypatch)
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        captured["payload"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse(groq_payload("classification"))

    monkeypatch.setattr(ai_service, "urlopen", fake_urlopen)
    assert ai_service.get_ai_provider() == "groq"
    assert ai_service.get_ai_model() == "openai/gpt-oss-120b"
    assert ai_service.generate("prompt", json_mode=True) == "classification"
    assert captured["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert captured["payload"]["model"] == "openai/gpt-oss-120b"
    assert captured["payload"]["response_format"] == {"type": "json_object"}
    assert captured["timeout"] == 60


def test_missing_groq_key_fails_safely(monkeypatch):
    configure_groq(monkeypatch)
    monkeypatch.delenv("GROQ_API_KEY")
    with pytest.raises(HTTPException) as error:
        ai_service.generate("prompt")
    assert error.value.status_code == 503
    assert "test-groq-key" not in str(error.value.detail)


def test_successful_response_is_parsed(monkeypatch):
    configure_groq(monkeypatch)
    monkeypatch.setattr(ai_service, "urlopen", lambda request, timeout: FakeResponse(groq_payload('{"ok": true}')))
    assert ai_service.generate("prompt") == '{"ok": true}'


@pytest.mark.parametrize(
    "payload",
    [({}, "invalid response"), ({"choices": [{"message": {"content": ""}}]}, "invalid response")],
)
def test_malformed_or_empty_response_fails_safely(monkeypatch, payload):
    configure_groq(monkeypatch)
    monkeypatch.setattr(ai_service, "urlopen", lambda request, timeout: FakeResponse(payload[0]))
    with pytest.raises(HTTPException) as error:
        ai_service.generate("prompt")
    assert error.value.status_code == 502
    assert "invalid response" in str(error.value.detail)


def test_timeout_is_controlled(monkeypatch):
    configure_groq(monkeypatch)
    monkeypatch.setattr(ai_service, "urlopen", lambda request, timeout: (_ for _ in ()).throw(TimeoutError()))
    with pytest.raises(HTTPException) as error:
        ai_service.generate("prompt")
    assert error.value.status_code == 503


@pytest.mark.parametrize("status_code, expected_status", [(429, 503), (500, 503), (400, 502)])
def test_http_failures_are_controlled_without_body_or_key(monkeypatch, status_code, expected_status):
    configure_groq(monkeypatch)
    key = "test-groq-key"
    error = HTTPError("https://api.groq.com/openai/v1/chat/completions", status_code, "failure", {}, io.BytesIO(b"secret provider body"))
    monkeypatch.setattr(ai_service, "urlopen", lambda request, timeout: (_ for _ in ()).throw(error))
    with pytest.raises(HTTPException) as raised:
        ai_service.generate("prompt")
    assert raised.value.status_code == expected_status
    assert key not in str(raised.value.detail)
    assert "secret provider body" not in str(raised.value.detail)


def test_api_key_never_appears_in_logs(monkeypatch, caplog):
    configure_groq(monkeypatch)
    key = "test-groq-key"
    monkeypatch.setattr(ai_service, "urlopen", lambda request, timeout: (_ for _ in ()).throw(URLError("offline")))
    with caplog.at_level(logging.DEBUG):
        with pytest.raises(HTTPException):
            ai_service.generate("prompt")
    assert key not in caplog.text


def test_human_review_wording_is_preserved():
    prompt = ai_service.build_classification_prompt("sample", False)
    assert "AI output is decision-support only" in prompt
    assert "must be reviewed by a qualified human" in prompt
    assert "never claim the document is authentic" in prompt
    assert "Do not make legal decisions" in prompt
