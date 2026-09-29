"""AgentVault end-to-end local simulation demo. No blockchain transactions."""

import json
from datetime import datetime

from simulation.vault import Vault, SIMULATION_LABEL
from simulation.receipts import verify_action_receipt


def make_vault():
    return Vault(
        owner="owner-1",
        authorised_agent="agent-1",
        balance=500,
        daily_limits_by_tier={0: 100, 1: 150, 2: 200},
        owner_max_daily_limit=200,
        max_per_transaction=100,
        recipient_caps={"merchant-1": 50},
        approval_threshold=20,
        allowlist={"merchant-1"},
    )


def show_result(title, result, vault):
    receipt = result.get("receipt", {})
    valid = verify_action_receipt(receipt)

    print(f"\n--- {title} ---")
    print(f"Label:         {result.get('label', SIMULATION_LABEL)}")
    print(f"Status:        {result['status']}")
    print(f"Reason:        {result['reason']}")
    print(f"Balance:       {vault.balance}")
    print(f"Receipt valid: {valid}")
    print(f"Receipt hash:  {receipt.get('receipt_hash', 'N/A')}")

    if not valid:
        raise RuntimeError(f"Receipt verification failed: {title}")


def main():
    now = datetime(2026, 9, 29, 12, 0, 0)

    print("=" * 58)
    print("             AGENTVAULT SIMULATION")
    print("       LOCAL TEST ONLY - NO BLOCKCHAIN")
    print("=" * 58)

    # Scenario 1: A valid payment is allowed.
    vault = make_vault()
    result = vault.submit_payment(
        caller="agent-1",
        recipient="merchant-1",
        amount=10,
        now=now,
        reason="Demo: normal merchant payment",
        model_id="agentvault-demo",
    )
    assert result["status"] == "Allowed"
    assert vault.balance == 490
    show_result("1. ALLOWED PAYMENT", result, vault)

    # Scenario 2: An unknown recipient is blocked.
    vault = make_vault()
    result = vault.submit_payment(
        caller="agent-1",
        recipient="unknown-merchant",
        amount=10,
        now=now,
        reason="Demo: unapproved recipient",
        model_id="agentvault-demo",
    )
    assert result["status"] == "Blocked"
    assert vault.balance == 500
    show_result("2. BLOCKED RECIPIENT", result, vault)

    # Scenario 3: A large payment requires owner approval.
    vault = make_vault()
    pending = vault.submit_payment(
        caller="agent-1",
        recipient="merchant-1",
        amount=30,
        now=now,
        reason="Demo: payment requiring owner approval",
        model_id="agentvault-demo",
    )
    assert pending["status"] == "Pending"
    assert vault.balance == 500
    show_result("3. PAYMENT AWAITING APPROVAL", pending, vault)

    approved = vault.approve_payment(
        caller="owner-1",
        payment_id=pending["payment_id"],
        now=now,
    )
    assert approved["status"] == "Approved"
    assert vault.balance == 470
    show_result("4. OWNER APPROVES PAYMENT", approved, vault)

    # Scenario 4: Owner rejection leaves the balance unchanged.
    vault = make_vault()
    pending = vault.submit_payment(
        caller="agent-1",
        recipient="merchant-1",
        amount=30,
        now=now,
        reason="Demo: payment to be rejected",
        model_id="agentvault-demo",
    )
    assert pending["status"] == "Pending"

    rejected = vault.reject_payment(
        caller="owner-1",
        payment_id=pending["payment_id"],
    )
    assert rejected["status"] == "Rejected"
    assert vault.balance == 500
    show_result("5. OWNER REJECTS PAYMENT", rejected, vault)

    print("\n" + "=" * 58)
    print("DEMO COMPLETE: ALL 5 SCENARIOS PASSED")
    print("All displayed receipts passed local hash verification.")
    print("No blockchain transaction was submitted.")
    print("=" * 58)


if __name__ == "__main__":
    main()
