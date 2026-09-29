import json
import unittest

from simulation.payment_intent import build_payment_request
from simulation.receipts import create_action_receipt


class PaymentIntentTests(unittest.TestCase):
    def make_receipt(self, recipient=None, amount="1000000000000000000"):
        return create_action_receipt(
            action="summarize",
            status="SIMULATED",
            reason="Local simulation result",
            model_id="test-model",
            timestamp="2026-09-29T12:00:00Z",
            agent_output="Summary generated",
            agent_explanation="Test receipt only",
            payment_details={
                "recipient": recipient or "0x" + "1" * 40,
                "amount": amount,
            },
        )

    def test_builds_request_from_verified_receipt(self):
        receipt = self.make_receipt()
        request = build_payment_request(receipt)

        self.assertEqual(request["recipient"], receipt["payment_details"]["recipient"])
        self.assertEqual(request["amount"], "1000000000000000000")
        self.assertEqual(json.loads(request["receiptData"]), receipt)

    def test_rejects_modified_receipt(self):
        receipt = self.make_receipt()
        receipt["agent_output"] = "Modified"
        with self.assertRaisesRegex(ValueError, "verification failed"):
            build_payment_request(receipt)

    def test_rejects_invalid_recipient(self):
        with self.assertRaisesRegex(ValueError, "EVM address"):
            build_payment_request(self.make_receipt(recipient="merchant-1"))

    def test_rejects_invalid_or_nonpositive_amount(self):
        for amount in ("1.5", "-1", "0", "1 MST", ""):
            with self.subTest(amount=amount):
                with self.assertRaises(ValueError):
                    build_payment_request(self.make_receipt(amount=amount))


if __name__ == "__main__":
    unittest.main()
