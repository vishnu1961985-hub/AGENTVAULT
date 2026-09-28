from datetime import datetime

from simulation.vault import Vault
import unittest

from simulation.receipts import (
    create_action_receipt,
    verify_action_receipt,
)
from simulation.vault import SIMULATION_LABEL


class TestActionReceipts(unittest.TestCase):

    def make_receipt(self):
        return create_action_receipt(
            action="submit_payment",
            status="Allowed",
            reason="All configured checks passed",
            model_id="local-test-model",
            timestamp="2026-09-28T12:00:00",
            agent_output="Pay merchant-1 ten units",
            agent_explanation=(
                "The recipient and payment amount meet configured rules."
            ),
            payment_details={
                "recipient": "merchant-1",
                "amount": 10,
            },
        )

    def make_vault(self):
        return Vault(
            owner="owner-1",
            authorised_agent="agent-1",
            balance=1000,
            daily_limits_by_tier={0: 500, 1: 1000},
            owner_max_daily_limit=1000,
            max_per_transaction=300,
            recipient_caps={"merchant-1": 500},
            approval_threshold=100,
            allowlist={"merchant-1"},
        )

    def test_valid_receipt_verifies(self):
        receipt = self.make_receipt()

        self.assertEqual(receipt["label"], SIMULATION_LABEL)
        self.assertEqual(len(receipt["receipt_hash"]), 64)
        self.assertTrue(verify_action_receipt(receipt))

    def test_modified_status_fails_verification(self):
        receipt = self.make_receipt()
        receipt["status"] = "Blocked"

        self.assertFalse(verify_action_receipt(receipt))

    def test_modified_nested_payment_details_fail_verification(self):
        receipt = self.make_receipt()
        receipt["payment_details"]["amount"] = 1000

        self.assertFalse(verify_action_receipt(receipt))

    def test_modified_agent_explanation_fails_verification(self):
        receipt = self.make_receipt()
        receipt["agent_explanation"] = "Explanation changed after receipt creation"

        self.assertFalse(verify_action_receipt(receipt))

    def test_missing_hash_fails_verification(self):
        receipt = self.make_receipt()
        del receipt["receipt_hash"]

        self.assertFalse(verify_action_receipt(receipt))

    def test_non_receipt_input_fails_verification(self):
        self.assertFalse(verify_action_receipt({}))
        self.assertFalse(verify_action_receipt({"receipt_hash": 123}))

    def test_receipt_is_independent_of_original_payment_details(self):
        details = {
            "recipient": "merchant-1",
            "amount": 10,
        }

        receipt = create_action_receipt(
            action="payment",
            status="Allowed",
            reason="All configured checks passed",
            model_id="test-model",
            timestamp="2026-09-28T12:00:00",
            agent_output="Pay merchant-1",
            agent_explanation="Test payment",
            payment_details=details,
        )

        # Change the original dictionary after creating the receipt.
        details["amount"] = 999

        # The receipt must retain its independent copy.
        self.assertEqual(receipt["payment_details"]["amount"], 10)
        self.assertTrue(verify_action_receipt(receipt))

    def test_allowed_submission_creates_receipt(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=10,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Allowed")
        self.assertIn("receipt", result)
        self.assertEqual(result["receipt"]["status"], "Allowed")
        self.assertEqual(result["receipt"]["label"], SIMULATION_LABEL)
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(len(vault.receipts), 1)

    def test_blocked_submission_creates_receipt(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="agent-1",
            recipient="unknown-merchant",
            amount=10,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("receipt", result)
        self.assertEqual(result["receipt"]["status"], "Blocked")
        self.assertIn("allowlisted", result["receipt"]["reason"])
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(len(vault.receipts), 1)

    def test_pending_submission_creates_receipt(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=150,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Pending")
        self.assertIn("receipt", result)
        self.assertEqual(result["receipt"]["status"], "Pending")
        self.assertEqual(result["receipt"]["payment_details"]["amount"], 150)
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(len(vault.receipts), 1)

        self.assertEqual(
            result["receipt"]["payment_details"]["payment_id"],
            result["payment_id"],
        )

    def test_owner_approval_creates_receipt(self):
        vault = self.make_vault()
        now = datetime(2026, 9, 28, 12, 0)

        pending = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=150,
            now=now,
        )

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=pending["payment_id"],
            now=now,
        )

        self.assertEqual(result["status"], "Approved")
        self.assertIn("receipt", result)
        self.assertEqual(result["receipt"]["action"], "approve_payment")
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(len(vault.receipts), 2)

    def test_owner_rejection_creates_receipt(self):
        vault = self.make_vault()
        now = datetime(2026, 9, 28, 12, 0)

        pending = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=150,
            now=now,
        )

        result = vault.reject_payment(
            caller="owner-1",
            payment_id=pending["payment_id"],
        )

        self.assertEqual(result["status"], "Rejected")
        self.assertIn("receipt", result)
        self.assertEqual(result["receipt"]["action"], "reject_payment")
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(len(vault.receipts), 2)

    def test_unauthorized_approval_creates_receipt(self):
        vault = self.make_vault()

        result = vault.approve_payment(
            caller="intruder",
            payment_id=999,
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("receipt", result)
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(result["receipt"]["action"], "approve_payment")
        self.assertEqual(len(vault.receipts), 1)

    def test_paused_vault_approval_creates_receipt(self):
        vault = self.make_vault()
        now = datetime(2026, 9, 28, 12, 0, 0)

        submission = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=150,
            now=now,
        )
        vault.paused = True

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submission["payment_id"],
            now=now,
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("receipt", result)
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(result["receipt"]["action"], "approve_payment")
        self.assertEqual(len(vault.receipts), 2)

    def test_unauthorized_rejection_creates_receipt(self):
        vault = self.make_vault()

        result = vault.reject_payment(
            caller="intruder",
            payment_id=999,
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(result["receipt"]["action"], "reject_payment")
        self.assertEqual(len(vault.receipts), 1)

    def test_missing_rejection_creates_receipt(self):
        vault = self.make_vault()

        result = vault.reject_payment(
            caller="owner-1",
            payment_id=999,
        )

        self.assertEqual(result["status"], "NotFound")
        self.assertTrue(verify_action_receipt(result["receipt"]))

    def test_already_processed_rejection_creates_receipt(self):
        vault = self.make_vault()
        now = datetime(2026, 9, 28, 12, 0)

        pending = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=150,
            now=now,
        )
        vault.reject_payment(
            caller="owner-1",
            payment_id=pending["payment_id"],
        )

        result = vault.reject_payment(
            caller="owner-1",
            payment_id=pending["payment_id"],
        )

        self.assertEqual(result["status"], "AlreadyProcessed")
        self.assertTrue(verify_action_receipt(result["receipt"]))

    def test_missing_approval_creates_receipt(self):
        vault = self.make_vault()

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=999,
        )

        self.assertEqual(result["status"], "NotFound")
        self.assertIn("receipt", result)
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(
            result["receipt"]["action"],
            "approve_payment",
        )
        self.assertEqual(len(vault.receipts), 1)

    def test_already_processed_approval_creates_receipt(self):
        vault = self.make_vault()
        now = datetime(2026, 9, 28, 12, 0)

        pending = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=150,
            now=now,
        )

        vault.reject_payment(
            caller="owner-1",
            payment_id=pending["payment_id"],
        )

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=pending["payment_id"],
            now=now,
        )

        self.assertEqual(result["status"], "AlreadyProcessed")
        self.assertIn("receipt", result)
        self.assertTrue(verify_action_receipt(result["receipt"]))
        self.assertEqual(
            result["receipt"]["action"],
            "approve_payment",
        )
        self.assertEqual(len(vault.receipts), 3)


if __name__ == "__main__":
    unittest.main()
