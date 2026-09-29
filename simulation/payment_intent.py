"""Prepare verified action receipts for P2; never submits blockchain payments."""

import json
import re
from typing import Any

from simulation.receipts import verify_action_receipt


_ADDRESS_PATTERN = re.compile(r"0x[0-9a-fA-F]{40}\Z")
_AMOUNT_PATTERN = re.compile(r"[0-9]+\Z")


def build_payment_request(receipt: dict[str, Any]) -> dict[str, str]:
    """Build a P2-compatible request without approving or submitting payment.

    The receipt must contain an EVM recipient address and a positive integer
    amount expressed in the smallest MST unit. Local verification is not
    blockchain authorization.
    """
    if not verify_action_receipt(receipt):
        raise ValueError("Receipt verification failed.")

    payment = receipt.get("payment_details")
    if not isinstance(payment, dict):
        raise ValueError("Receipt payment_details must be an object.")

    recipient = payment.get("recipient")
    amount = payment.get("amount")

    if not isinstance(recipient, str) or not _ADDRESS_PATTERN.fullmatch(recipient):
        raise ValueError("Payment recipient must be a valid EVM address.")

    if not isinstance(amount, str) or not _AMOUNT_PATTERN.fullmatch(amount):
        raise ValueError("Amount must be a decimal integer string in base units.")

    if int(amount) <= 0:
        raise ValueError("Amount must be greater than zero.")

    # Preserve this exact string: P2 hashes receiptData using Keccak-256.
    receipt_data = json.dumps(
        receipt,
        separators=(",", ":"),
        ensure_ascii=False,
    )

    return {
        "recipient": recipient,
        "amount": amount,
        "receiptData": receipt_data,
    }
