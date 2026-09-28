
"""Local AgentVault simulation. No blockchain interaction."""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional


SIMULATION_LABEL = "SIMULATION / LOCAL TEST"


@dataclass
class Vault:
    owner: str
    authorised_agent: str
    balance: int
    daily_limits_by_tier: dict[int, int]
    owner_max_daily_limit: int
    max_per_transaction: int
    recipient_caps: dict[str, int]
    approval_threshold: int
    allowlist: set[str]

    paused: bool = False
    expires_at: Optional[datetime] = None
    trust_tier: int = 0

    daily_spending: dict[date, int] = field(default_factory=dict)
    recipient_spending: dict[str, int] = field(default_factory=dict)
    pending_payments: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    next_payment_id: int = 1

    def effective_daily_limit(self) -> int:
        configured = self.daily_limits_by_tier.get(self.trust_tier, 0)
        return min(configured, self.owner_max_daily_limit)

    def submit_payment(
        self,
        caller: str,
        recipient: str,
        amount: int,
        now: datetime,
        reason: str = "Local test payment",
        model_id: str = "local-test-model",
    ) -> dict:
        """Evaluate a payment in the specified rule order."""

        day = now.date()

        def finish(status: str, message: str) -> dict:
            result = {
                "label": SIMULATION_LABEL,
                "status": status,
                "reason": message,
                "recipient": recipient,
                "amount": amount,
                "balance": self.balance,
                "trust_tier": self.trust_tier,
            }
            self.events.append(result.copy())
            return result

        def block(message: str) -> dict:
            # A blocked violation resets the trust tier to zero.
            self.trust_tier = 0
            return finish("Blocked", message)

        # 1. Authorised agent caller.
        if caller != self.authorised_agent:
            return block("Caller is not the authorised agent")

        # 2. Vault active, unpaused, and unexpired.
        if self.paused:
            return block("Vault is paused")

        if self.expires_at is not None and now >= self.expires_at:
            return block("Vault has expired")

        # 3. Recipient allowlist.
        if recipient not in self.allowlist:
            return block("Recipient is not allowlisted")

        # 4. Per-transaction maximum.
        if amount <= 0:
            return block("Amount must be positive")

        if amount > self.max_per_transaction:
            return block("Per-transaction maximum exceeded")

        # 5. Remaining daily limit for the current tier.
        daily_limit = self.effective_daily_limit()
        spent_today = self.daily_spending.get(day, 0)

        if amount > daily_limit - spent_today:
            return block("Daily spending limit exceeded")

        # 6. Per-recipient cap.
        cap = self.recipient_caps.get(recipient)
        spent_to_recipient = self.recipient_spending.get(recipient, 0)

        if cap is not None and amount > cap - spent_to_recipient:
            return block("Per-recipient cap exceeded")

        # 7. Approval threshold.
        if amount > self.approval_threshold:
            payment_id = self.next_payment_id
            self.next_payment_id += 1

            payment = {
                "id": payment_id,
                "status": "Pending",
                "recipient": recipient,
                "amount": amount,
                "reason": reason,
                "modelId": model_id,
                "createdAt": now.isoformat(),
                "date": day.isoformat(),
            }
            self.pending_payments.append(payment)

            result = finish("Pending", "Owner approval required")
            result["payment_id"] = payment_id
            return result

        # Local simulated accounting only.
        self.balance -= amount
        self.daily_spending[day] = spent_today + amount
        self.recipient_spending[recipient] = spent_to_recipient + amount

        return finish("Allowed", "All configured checks passed")

    def approve_payment(
        self,
        caller: str,
        payment_id: int,
        now: Optional[datetime] = None,
    ) -> dict:
        """Approve a pending payment as the vault owner."""

        # Only the owner may approve.
        if caller != self.owner:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Only the vault owner can approve payments",
                "payment_id": payment_id,
            }

        # Find the pending payment.
        payment = next(
            (
                item
                for item in self.pending_payments
                if item["id"] == payment_id
            ),
            None,
        )

        if payment is None:
            return {
                "label": SIMULATION_LABEL,
                "status": "NotFound",
                "reason": "Pending payment not found",
                "payment_id": payment_id,
            }

        if payment["status"] != "Pending":
            return {
                "label": SIMULATION_LABEL,
                "status": "AlreadyProcessed",
                "reason": "Payment is no longer pending",
                "payment_id": payment_id,
            }

        # Check expiry at approval time when the current time is supplied.
        if now is not None:
            if self.expires_at is not None and now >= self.expires_at:
                return {
                    "label": SIMULATION_LABEL,
                    "status": "Blocked",
                    "reason": "Vault has expired",
                    "payment_id": payment_id,
                }

        payment_date = date.fromisoformat(payment["date"])
        recipient = payment["recipient"]
        amount = payment["amount"]

        # Recheck current vault constraints before approval.
        if self.paused:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Vault is paused",
                "payment_id": payment_id,
            }

        # Recheck the recipient allowlist at approval time.
        if recipient not in self.allowlist:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Recipient is not allowlisted",
                "payment_id": payment_id,
            }

        # Recheck the per-transaction maximum at approval time.
        if amount <= 0:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Amount must be positive",
                "payment_id": payment_id,
            }

        if amount > self.max_per_transaction:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Per-transaction maximum exceeded",
                "payment_id": payment_id,
            }

        if self.balance < amount:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Insufficient simulated balance",
                "payment_id": payment_id,
            }

        # Also check whether the payment was submitted after expiry.
        if (
            self.expires_at is not None
            and datetime.fromisoformat(payment["createdAt"]) >= self.expires_at
        ):
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Payment was submitted after vault expiry",
                "payment_id": payment_id,
            }

        # Recheck the daily limit before approval.
        daily_limit = self.effective_daily_limit()
        spent_today = self.daily_spending.get(payment_date, 0)

        if amount > daily_limit - spent_today:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Daily spending limit exceeded",
                "payment_id": payment_id,
            }

        # Recheck the recipient cap before approval.
        cap = self.recipient_caps.get(recipient)
        spent_to_recipient = self.recipient_spending.get(recipient, 0)

        if cap is not None and amount > cap - spent_to_recipient:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Per-recipient cap exceeded",
                "payment_id": payment_id,
            }

        # Local simulated accounting only.
        self.balance -= amount
        self.daily_spending[payment_date] = spent_today + amount
        self.recipient_spending[recipient] = spent_to_recipient + amount
        payment["status"] = "Approved"

        result = {
            "label": SIMULATION_LABEL,
            "status": "Approved",
            "reason": "Owner approved payment; simulated accounting updated",
            "payment_id": payment_id,
            "recipient": recipient,
            "amount": amount,
            "balance": self.balance,
        }
        self.events.append(result.copy())
        return result

    def reject_payment(
        self,
        caller: str,
        payment_id: int,
    ) -> dict:
        """Reject a pending payment as the vault owner."""

        if caller != self.owner:
            return {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": "Only the vault owner can reject payments",
                "payment_id": payment_id,
            }

        payment = next(
            (
                item
                for item in self.pending_payments
                if item["id"] == payment_id
            ),
            None,
        )

        if payment is None:
            return {
                "label": SIMULATION_LABEL,
                "status": "NotFound",
                "reason": "Pending payment not found",
                "payment_id": payment_id,
            }

        if payment["status"] != "Pending":
            return {
                "label": SIMULATION_LABEL,
                "status": "AlreadyProcessed",
                "reason": "Payment is no longer pending",
                "payment_id": payment_id,
            }

        payment["status"] = "Rejected"

        result = {
            "label": SIMULATION_LABEL,
            "status": "Rejected",
            "reason": "Owner rejected payment; no funds moved",
            "payment_id": payment_id,
            "recipient": payment["recipient"],
            "amount": payment["amount"],
            "balance": self.balance,
        }
        self.events.append(result.copy())
        return result
