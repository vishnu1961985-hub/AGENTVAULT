"""Local action receipts for AgentVault simulation; no blockchain interaction."""

import copy
import hashlib
import json
from typing import Any

from simulation.vault import SIMULATION_LABEL


def _canonical_json(data: dict[str, Any]) -> str:
    """Serialize receipt data consistently for hashing."""
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def create_action_receipt(
    *,
    action: str,
    status: str,
    reason: str,
    model_id: str,
    timestamp: str,
    agent_output: str,
    agent_explanation: str,
    payment_details: dict[str, Any],
) -> dict[str, Any]:
    """Create a locally verifiable receipt for a simulated action."""

    receipt = {
        "label": SIMULATION_LABEL,
        "action": action,
        "status": status,
        "reason": reason,
        "model_id": model_id,
        "timestamp": timestamp,
        "agent_output": agent_output,
        "agent_explanation": agent_explanation,
        "payment_details": copy.deepcopy(payment_details),
    }

    receipt["receipt_hash"] = hashlib.sha256(
        _canonical_json(receipt).encode("utf-8")
    ).hexdigest()

    return receipt


def verify_action_receipt(receipt: dict[str, Any]) -> bool:
    """Return whether receipt data matches its recorded SHA-256 digest."""

    if not isinstance(receipt, dict):
        return False

    recorded_hash = receipt.get("receipt_hash")

    if not isinstance(recorded_hash, str):
        return False

    original_data = {
        key: value for key, value in receipt.items() if key != "receipt_hash"
    }

    try:
        calculated_hash = hashlib.sha256(
            _canonical_json(original_data).encode("utf-8")
        ).hexdigest()
    except (TypeError, ValueError):
        return False

    return calculated_hash == recorded_hash
