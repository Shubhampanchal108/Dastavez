import pytest
from fastapi import HTTPException

from app.services import blockchain_service


def test_ganache_provider_configuration(monkeypatch):
    monkeypatch.setenv("BLOCKCHAIN_PROVIDER", "ganache")
    monkeypatch.setenv("BLOCKCHAIN_CHAIN_ID", "1337")
    assert blockchain_service.blockchain_provider() == "ganache"
    assert blockchain_service.configured_chain_id() == 1337


def test_external_provider_configuration(monkeypatch):
    monkeypatch.setenv("BLOCKCHAIN_PROVIDER", "external")
    monkeypatch.setenv("BLOCKCHAIN_CHAIN_ID", "42161")
    assert blockchain_service.blockchain_provider() == "external"
    assert blockchain_service.configured_chain_id() == 42161


@pytest.mark.parametrize("name", ["BLOCKCHAIN_RPC_URL", "BLOCKCHAIN_CONTRACT_ADDRESS", "BLOCKCHAIN_PRIVATE_KEY"])
def test_required_blockchain_settings_are_not_empty(monkeypatch, name):
    monkeypatch.setenv("BLOCKCHAIN_PROVIDER", "external")
    monkeypatch.setenv("BLOCKCHAIN_CHAIN_ID", "1")
    monkeypatch.setenv("BLOCKCHAIN_RPC_URL", "https://rpc.example")
    monkeypatch.setenv("BLOCKCHAIN_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000001")
    monkeypatch.setenv("BLOCKCHAIN_PRIVATE_KEY", "test-only-key")
    monkeypatch.delenv(name, raising=False)
    with pytest.raises(HTTPException, match="incomplete"):
        blockchain_service._web3()


def test_missing_chain_id_fails_safely(monkeypatch):
    monkeypatch.delenv("BLOCKCHAIN_CHAIN_ID", raising=False)
    with pytest.raises(HTTPException, match="chain ID"):
        blockchain_service.configured_chain_id()


def test_invalid_chain_id_fails_safely(monkeypatch):
    monkeypatch.setenv("BLOCKCHAIN_CHAIN_ID", "not-a-chain")
    with pytest.raises(HTTPException, match="chain ID"):
        blockchain_service.configured_chain_id()


def test_proof_payload_contains_only_integrity_reference():
    payload = blockchain_service.proof_payload("document", "version", "sha256-value")
    assert '"sha256":"sha256-value"' in payload
    assert "document contents" not in payload
    assert "private" not in payload.lower()


def test_invalid_provider_fails_safely(monkeypatch):
    monkeypatch.setenv("BLOCKCHAIN_PROVIDER", "unknown")
    with pytest.raises(HTTPException, match="provider"):
        blockchain_service.blockchain_provider()
