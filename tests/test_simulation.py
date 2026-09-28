import unittest
from datetime import date, datetime

from simulation.vault import Vault, SIMULATION_LABEL


class TestAgentVaultSimulation(unittest.TestCase):
    def make_vault(self):
        """Create a fresh vault for each test."""
        return Vault(
            owner="owner-1",
            authorised_agent="agent-1",
            balance=500,
            daily_limits_by_tier={0: 100, 1: 150, 2: 200},
            owner_max_daily_limit=200,
            max_per_transaction=20,
            recipient_caps={"merchant-1": 50},
            approval_threshold=20,
            allowlist={"merchant-1"},
        )

    def test_normal_allowlisted_payment_within_limits(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=10,
            now=datetime(2026, 9, 28, 12, 0),
            reason="Approved merchant purchase",
            model_id="local-test-model",
        )

        self.assertEqual(result["label"], SIMULATION_LABEL)
        self.assertEqual(result["status"], "Allowed")
        self.assertEqual(vault.balance, 490)
        self.assertEqual(vault.daily_spending[date(2026, 9, 28)], 10)
        self.assertEqual(vault.recipient_spending["merchant-1"], 10)
        self.assertEqual(vault.pending_payments, [])

    def test_unknown_recipient_is_blocked(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="agent-1",
            recipient="unknown-merchant",
            amount=10,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("allowlisted", result["reason"])
        self.assertEqual(vault.balance, 500)

    def test_unauthorised_caller_is_blocked(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="attacker",
            recipient="merchant-1",
            amount=10,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("authorised agent", result["reason"])
        self.assertEqual(vault.balance, 500)

    def test_per_transaction_maximum_is_enforced(self):
        vault = self.make_vault()

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=25,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("maximum", result["reason"])
        self.assertEqual(vault.balance, 500)

    def test_daily_spending_limit_is_enforced(self):
        vault = self.make_vault()
        vault.daily_limits_by_tier[0] = 20
        now = datetime(2026, 9, 28, 12, 0)

        first = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=15,
            now=now,
        )
        second = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=10,
            now=now,
        )

        self.assertEqual(first["status"], "Allowed")
        self.assertEqual(second["status"], "Blocked")
        self.assertIn("Daily", second["reason"])
        self.assertEqual(vault.balance, 485)

    def test_recipient_cap_is_enforced(self):
        vault = self.make_vault()
        vault.recipient_caps["merchant-1"] = 25
        now = datetime(2026, 9, 28, 12, 0)

        first = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=15,
            now=now,
        )
        second = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=15,
            now=now,
        )

        self.assertEqual(first["status"], "Allowed")
        self.assertEqual(second["status"], "Blocked")
        self.assertIn("recipient cap", second["reason"])
        self.assertEqual(vault.balance, 485)
        self.assertEqual(vault.recipient_spending["merchant-1"], 15)

    def test_insufficient_balance_blocks_submission(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40
        vault.balance = 10

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("balance", result["reason"].lower())
        self.assertEqual(vault.balance, 10)
        self.assertEqual(vault.pending_payments, [])

    def test_large_payment_becomes_pending(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Pending")
        self.assertIn("approval", result["reason"])
        self.assertEqual(vault.balance, 500)
        self.assertEqual(len(vault.pending_payments), 1)

    def test_pending_payment_does_not_count_as_spending(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(vault.daily_spending, {})
        self.assertEqual(vault.recipient_spending, {})
        self.assertEqual(vault.balance, 500)

    def test_owner_can_approve_pending_payment(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
        )

        self.assertEqual(result["status"], "Approved")
        self.assertEqual(vault.balance, 479)
        self.assertEqual(vault.daily_spending[date(2026, 9, 28)], 21)

    def test_owner_can_reject_pending_payment(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        result = vault.reject_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
        )

        self.assertEqual(result["status"], "Rejected")
        self.assertEqual(vault.balance, 500)
        self.assertEqual(vault.pending_payments[0]["status"], "Rejected")

    def test_non_owner_cannot_approve_payment(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        result = vault.approve_payment(
            caller="attacker",
            payment_id=submitted["payment_id"],
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertEqual(vault.balance, 500)
        self.assertEqual(vault.pending_payments[0]["status"], "Pending")

    def test_payment_cannot_be_approved_twice(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40
        now = datetime(2026, 9, 28, 12, 0)

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=now,
        )
        payment_id = submitted["payment_id"]

        first = vault.approve_payment(
            caller="owner-1",
            payment_id=payment_id,
        )
        second = vault.approve_payment(
            caller="owner-1",
            payment_id=payment_id,
        )

        self.assertEqual(first["status"], "Approved")
        self.assertEqual(second["status"], "AlreadyProcessed")
        self.assertEqual(vault.balance, 479)

    def test_approval_fails_with_insufficient_balance(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(submitted["status"], "Pending")

        # Simulate the balance becoming insufficient before approval.
        vault.balance = 10

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("balance", result["reason"].lower())
        self.assertEqual(vault.balance, 10)
        self.assertEqual(vault.pending_payments[0]["status"], "Pending")

    def test_paused_vault_cannot_approve_payment(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        vault.paused = True

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
            now=datetime(2026, 9, 28, 14, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("paused", result["reason"])
        self.assertEqual(vault.balance, 500)

    def test_expired_vault_cannot_approve_payment(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40
        vault.expires_at = datetime(2026, 9, 28, 13, 0)

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(submitted["status"], "Pending")

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
            now=datetime(2026, 9, 28, 14, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("expired", result["reason"].lower())
        self.assertEqual(vault.balance, 500)
        self.assertEqual(vault.pending_payments[0]["status"], "Pending")

    def test_expired_vault_cannot_be_approved(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40
        vault.expires_at = datetime(2026, 9, 28, 13, 0)

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(submitted["status"], "Pending")

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
            now=datetime(2026, 9, 28, 14, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("expired", result["reason"].lower())
        self.assertEqual(vault.balance, 500)
        self.assertEqual(vault.pending_payments[0]["status"], "Pending")

    def test_removed_recipient_cannot_be_approved(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        vault.allowlist.remove("merchant-1")

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("allowlisted", result["reason"])
        self.assertEqual(vault.balance, 500)
        self.assertEqual(vault.pending_payments[0]["status"], "Pending")

    def test_reduced_transaction_maximum_blocks_approval(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        submitted = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        vault.max_per_transaction = 20

        result = vault.approve_payment(
            caller="owner-1",
            payment_id=submitted["payment_id"],
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertIn("maximum", result["reason"])
        self.assertEqual(vault.balance, 500)
        self.assertEqual(vault.pending_payments[0]["status"], "Pending")

    def test_clean_payments_progress_trust_tier(self):
        vault = self.make_vault()
        self.assertEqual(vault.trust_tier, 0)

        for hour in (12, 13, 14):
            result = vault.submit_payment(
                caller="agent-1",
                recipient="merchant-1",
                amount=1,
                now=datetime(2026, 9, 28, hour, 0),
            )
            self.assertEqual(result["status"], "Allowed")

        self.assertEqual(vault.trust_tier, 1)
        self.assertEqual(vault.clean_payment_count, 0)

    def test_pending_payment_does_not_increase_trust(self):
        vault = self.make_vault()
        vault.max_per_transaction = 40

        result = vault.submit_payment(
            caller="agent-1",
            recipient="merchant-1",
            amount=21,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Pending")
        self.assertEqual(vault.trust_tier, 0)
        self.assertEqual(vault.clean_payment_count, 0)

    def test_blocked_payment_resets_trust_and_clean_progress(self):
        vault = self.make_vault()
        vault.trust_tier = 1
        vault.clean_payment_count = 2

        result = vault.submit_payment(
            caller="agent-1",
            recipient="unknown-merchant",
            amount=1,
            now=datetime(2026, 9, 28, 12, 0),
        )

        self.assertEqual(result["status"], "Blocked")
        self.assertEqual(vault.trust_tier, 0)
        self.assertEqual(vault.clean_payment_count, 0)


if __name__ == "__main__":
    unittest.main()
