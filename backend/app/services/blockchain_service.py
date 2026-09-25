import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from web3 import Web3

from app.models.blockchain_record import BlockchainRecord
from app.models.document import Document
from app.models.document_version import DocumentVersion


ARTIFACT_PATH = Path(__file__).resolve().parents[2] / "blockchain" / "artifact.json"
logger = logging.getLogger(__name__)


def blockchain_network() -> str:
    return os.getenv("BLOCKCHAIN_NETWORK", "local-ganache").strip() or "local-ganache"


def blockchain_provider() -> str:
    provider = os.getenv("BLOCKCHAIN_PROVIDER", "ganache").strip().lower()
    if provider not in {"ganache", "external"}:
        raise HTTPException(status_code=503, detail="Blockchain provider configuration is invalid.")
    return provider


def configured_chain_id() -> int:
    value = os.getenv("BLOCKCHAIN_CHAIN_ID", "").strip()
    if not value:
        raise HTTPException(status_code=503, detail="Blockchain chain ID is not configured.")
    try:
        chain_id = int(value)
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Blockchain chain ID configuration is invalid.") from error
    if chain_id <= 0:
        raise HTTPException(status_code=503, detail="Blockchain chain ID configuration is invalid.")
    return chain_id


def _web3() -> tuple[Web3, object, str]:
    provider = blockchain_provider()
    rpc_url = os.getenv("BLOCKCHAIN_RPC_URL", "").strip()
    private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")
    address = os.getenv("BLOCKCHAIN_CONTRACT_ADDRESS", "")
    if not rpc_url or not private_key or not address:
        raise HTTPException(status_code=503, detail="Blockchain configuration is incomplete.")
    if not ARTIFACT_PATH.exists():
        raise HTTPException(status_code=503, detail="Blockchain contract artifact is missing.")
    artifact = json.loads(ARTIFACT_PATH.read_text(encoding="utf-8"))
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    if not web3.is_connected():
        raise HTTPException(status_code=503, detail="Configured blockchain RPC is unavailable.")
    expected_chain_id = configured_chain_id()
    if web3.eth.chain_id != expected_chain_id:
        raise HTTPException(status_code=503, detail="Configured blockchain chain ID does not match the active network.")
    try:
        configured_address = Web3.to_checksum_address(address)
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Configured blockchain contract address is invalid.") from error
    artifact_address = artifact.get("address")
    if provider == "ganache" and artifact_address and Web3.to_checksum_address(artifact_address) != configured_address:
        raise HTTPException(status_code=503, detail="Configured contract address does not match the deployed artifact.")
    if not any(item.get("name") == "getProof" for item in artifact["abi"]):
        raise HTTPException(status_code=503, detail="Blockchain contract ABI does not contain the proof retrieval function.")
    if not web3.eth.get_code(configured_address):
        raise HTTPException(status_code=503, detail="Configured blockchain contract is not deployed on the active RPC network.")
    try:
        account = web3.eth.account.from_key(private_key)
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=503, detail="Configured blockchain private key is invalid.") from error
    contract = web3.eth.contract(address=configured_address, abi=artifact["abi"])
    logger.info("Connected to blockchain provider=%s network=%s contract=%s chain_id=%s", provider, blockchain_network(), configured_address, web3.eth.chain_id)
    return web3, account, contract


def proof_payload(document_id: str, version_id: str, sha256: str) -> str:
    return json.dumps({"document_id": document_id, "version_id": version_id, "sha256": sha256}, sort_keys=True, separators=(",", ":"))


def _latest_version(document: Document) -> DocumentVersion:
    if not document.versions:
        raise HTTPException(status_code=409, detail="This document has no version record to anchor.")
    return max(document.versions, key=lambda version: version.version_number)


def create_proof(db, document: Document, version: DocumentVersion | None = None) -> BlockchainRecord:
    version = version or _latest_version(document)
    if not version.sha256_hash:
        raise HTTPException(status_code=409, detail="The selected version has no SHA-256 hash.")
    web3, account, contract = _web3()
    payload = proof_payload(str(document.id), str(version.id), version.sha256_hash)
    key = web3.keccak(text=payload)
    proof_hash = web3.keccak(text=payload)
    try:
        nonce = web3.eth.get_transaction_count(account.address)
        transaction = contract.functions.registerProof(key, proof_hash).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "chainId": web3.eth.chain_id,
            "gas": 200000,
            "gasPrice": web3.eth.gas_price,
        })
        signed = account.sign_transaction(transaction)
        tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    except Exception as error:
        raise HTTPException(status_code=502, detail="Blockchain proof registration failed.") from error
    record = BlockchainRecord(
        document_id=document.id,
        version_id=version.id,
        version_number=version.version_number,
        sha256_hash=version.sha256_hash,
        proof_hash=Web3.to_hex(proof_hash),
        transaction_id=tx_hash.hex(),
        network=blockchain_network(),
        verification_status="ANCHORED",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def verify_proof(db, document: Document, version: DocumentVersion | None = None, sha256_override: str | None = None) -> dict:
    version = version or _latest_version(document)
    current_sha256 = sha256_override or version.sha256_hash
    record = db.query(BlockchainRecord).filter(
        BlockchainRecord.document_id == document.id,
        BlockchainRecord.version_id == version.id,
    ).order_by(BlockchainRecord.timestamp.desc()).first()
    if not record:
        logger.info("No blockchain record for document=%s version=%s", document.id, version.id)
        return {
            "integrity_status": "NOT_ANCHORED",
            "current_sha256": current_sha256,
            "blockchain_proof": None,
            "transaction_hash": None,
            "network": None,
        }
    logger.info(
        "Blockchain record found document=%s version=%s record_id=%s",
        document.id,
        version.id,
        record.id,
    )
    web3, _, contract = _web3()
    payload = proof_payload(str(document.id), str(version.id), record.sha256_hash)
    expected = web3.keccak(text=payload)
    logger.info("Retrieving blockchain proof document=%s version=%s proof_key=%s", document.id, version.id, Web3.to_hex(expected))
    try:
        stored = contract.functions.getProof(expected).call()
    except Exception as error:
        raise HTTPException(status_code=502, detail="Blockchain proof retrieval failed.") from error
    blockchain_proof = Web3.to_hex(stored)
    logger.info(
        "Blockchain proof retrieved document=%s version=%s has_value=%s",
        document.id,
        version.id,
        stored != bytes(32),
    )
    status = "VERIFIED" if (
        current_sha256 == record.sha256_hash
        and blockchain_proof.lower() == record.proof_hash.lower()
        and stored != bytes(32)
    ) else "MISMATCH"
    return {
        "integrity_status": status,
        "current_sha256": current_sha256,
        "blockchain_proof": blockchain_proof,
        "transaction_hash": record.transaction_id,
        "network": record.network or blockchain_network(),
    }
