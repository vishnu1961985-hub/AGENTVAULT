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
    clean_payment_count: int = 0
    clean_payments_per_tier: int = 3
    daily_spending: dict[date, int] = field(default_factory=dict)
    recipient_spending: dict[str, int] = field(default_factory=dict)
    pending_payments: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    receipts: list[dict] = field(default_factory=list)
    next_payment_id: int = 1

    def _attach_receipt(
        self,
        result: dict,
        *,
        action: str,
        model_id: str,
        timestamp: str,
        agent_output: str,
        agent_explanation: str,
        payment_details: dict,
    ) -> dict:
        """Attach a verifiable receipt to a local simulation result."""

        from simulation.receipts import create_action_receipt

        receipt = create_action_receipt(
            action=action,
            status=result["status"],
            reason=result.get("reason", ""),
            model_id=model_id,
            timestamp=timestamp,
            agent_output=agent_output,
            agent_explanation=agent_explanation,
            payment_details=payment_details,
        )
        result["receipt"] = receipt
        self.receipts.append(receipt)
        return result

    def effective_daily_limit(self) -> int:
        configured = self.daily_limits_by_tier.get(self.trust_tier, 0)
        return min(configured, self.owner_max_daily_limit)

    def record_clean_payment(self) -> None:
        """Advance trust after enough successfully completed payments."""

        self.clean_payment_count += 1
        if self.clean_payment_count < self.clean_payments_per_tier:
            return
        available_tiers = sorted(
            tier for tier in self.daily_limits_by_tier if tier > self.trust_tier
        )
        if available_tiers:
            self.trust_tier = available_tiers[0]
        self.clean_payment_count = 0

    def submit_payment(
        self,
        caller: str,
        recipient: str,
        amount: int,
        now: datetime,
        reason: str = "Local test payment",
        model_id: str = "local-test-model",
    ) -> dict:
        """Evaluate a payment in the configured rule order."""

        day = now.date()

        def finish(
            status: str,
            message: str,
            payment_id: Optional[int] = None,
        ) -> dict:
            result = {
                "label": SIMULATION_LABEL,
                "status": status,
                "reason": message,
                "recipient": recipient,
                "amount": amount,
                "balance": self.balance,
                "trust_tier": self.trust_tier,
            }
            payment_details = {
                "caller": caller,
                "recipient": recipient,
                "amount": amount,
            }
            if payment_id is not None:
                result["payment_id"] = payment_id
                payment_details["payment_id"] = payment_id
            self._attach_receipt(
                result,
                action="submit_payment",
                model_id=model_id,
                timestamp=now.isoformat(),
                agent_output=reason,
                agent_explanation=message,
                payment_details=payment_details,
            )
            self.events.append(result.copy())
            return result

        def block(message: str) -> dict:
            """Block a violation and reset local trust progress."""

            self.trust_tier = 0
            self.clean_payment_count = 0
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

        # 7. Sufficient simulated balance.
        if self.balance < amount:
            return block("Insufficient simulated balance")

        # 8. Approval threshold.
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
            return finish(
                "Pending",
                "Owner approval required",
                payment_id=payment_id,
            )
        # Local simulated accounting only.
        self.balance -= amount
        self.daily_spending[day] = spent_today + amount
        self.recipient_spending[recipient] = spent_to_recipient + amount
        self.record_clean_payment()
        return finish("Allowed", "All configured checks passed")

    def approve_payment(
        self,
        caller: str,
        payment_id: int,
        now: Optional[datetime] = None,
    ) -> dict:
        """Approve a pending payment as the vault owner."""

        def blocked_result(
            message: str,
            payment: Optional[dict] = None,
        ) -> dict:
            """Record a blocked approval attempt with a local receipt."""

            result = {
                "label": SIMULATION_LABEL,
                "status": "Blocked",
                "reason": message,
                "payment_id": payment_id,
            }
            payment_details = {"payment_id": payment_id}
            if payment is not None:
                payment_details["recipient"] = payment["recipient"]
                payment_details["amount"] = payment["amount"]
            self._attach_receipt(
                result,
                action="approve_payment",
                model_id=(
                    payment.get("modelId", "local-test-model")
                    if payment is not None
                    else "local-test-model"
                ),
                timestamp=(
                    now.isoformat() if now is not None else datetime.now().isoformat()
                ),
                agent_output=(
                    payment.get("reason", "Owner approval attempt")
                    if payment is not None
                    else "Owner approval attempt"
                ),
                agent_explanation=message,
                payment_details=payment_details,
            )
            self.events.append(result.copy())
            return result

        # Only the owner may approve.
        if caller != self.owner:
            return blocked_result("Only the vault owner can approve payments")
        # Find the pending payment.
        payment = next(
            (item for item in self.pending_payments if item["id"] == payment_id),
            None,
        )
        if payment is None:
            message = "Pending payment not found"
            result = {
                "label": SIMULATION_LABEL,
                "status": "NotFound",
                "reason": message,
                "payment_id": payment_id,
            }
            self._attach_receipt(
                result,
                action="approve_payment",
                model_id="local-test-model",
                timestamp=(
                    now.isoformat() if now is not None else datetime.now().isoformat()
                ),
                agent_output="Owner approval attempt",
                agent_explanation=message,
                payment_details={"payment_id": payment_id},
            )
            self.events.append(result.copy())
            return result
        if payment["status"] != "Pending":
            message = "Payment is no longer pending"
            result = {
                "label": SIMULATION_LABEL,
                "status": "AlreadyProcessed",
                "reason": message,
                "payment_id": payment_id,
            }
            self._attach_receipt(
                result,
                action="approve_payment",
                model_id=payment.get("modelId", "local-test-model"),
                timestamp=(
                    now.isoformat() if now is not None else datetime.now().isoformat()
                ),
                agent_output=payment.get("reason", "Owner approval attempt"),
                agent_explanation=message,
                payment_details={
                    "payment_id": payment_id,
                    "recipient": payment["recipient"],
                    "amount": payment["amount"],
                },
            )
            self.events.append(result.copy())
            return result
        # Check expiry at approval time when a time is supplied.
        if now is not None:
            if self.expires_at is not None and now >= self.expires_at:
                return blocked_result("Vault has expired", payment)
        payment_date = date.fromisoformat(payment["date"])
        recipient = payment["recipient"]
        amount = payment["amount"]
        # Recheck current vault constraints before approval.
        if self.paused:
            return blocked_result("Vault is paused", payment)
        if recipient not in self.allowlist:
            return blocked_result(
                "Recipient is not allowlisted",
                payment,
            )
        if amount <= 0:
            return blocked_result("Amount must be positive", payment)
        if amount > self.max_per_transaction:
            return blocked_result(
                "Per-transaction maximum exceeded",
                payment,
            )
        if self.balance < amount:
            return blocked_result(
                "Insufficient simulated balance",
                payment,
            )
        # Ensure the payment was not submitted after vault expiry.
        if (
            self.expires_at is not None
            and datetime.fromisoformat(payment["createdAt"]) >= self.expires_at
        ):
            return blocked_result(
                "Payment was submitted after vault expiry",
                payment,
            )
        # Recheck the daily limit before approval.
        daily_limit = self.effective_daily_limit()
        spent_today = self.daily_spending.get(payment_date, 0)
        if amount > daily_limit - spent_today:
            return blocked_result(
                "Daily spending limit exceeded",
                payment,
            )
        # Recheck the recipient cap before approval.
        cap = self.recipient_caps.get(recipient)
        spent_to_recipient = self.recipient_spending.get(recipient, 0)
        if cap is not None and amount > cap - spent_to_recipient:
            return blocked_result(
                "Per-recipient cap exceeded",
                payment,
            )
        # Local simulated accounting only.
        self.balance -= amount
        self.daily_spending[payment_date] = spent_today + amount
        self.recipient_spending[recipient] = spent_to_recipient + amount
        payment["status"] = "Approved"
        self.record_clean_payment()
        result = {
            "label": SIMULATION_LABEL,
            "status": "Approved",
            "reason": "Owner approved payment; simulated accounting updated",
            "payment_id": payment_id,
            "recipient": recipient,
            "amount": amount,
            "balance": self.balance,
        }
        self._attach_receipt(
            result,
            action="approve_payment",
            model_id=payment.get("modelId", "local-test-model"),
            timestamp=(
                now.isoformat() if now is not None else datetime.now().isoformat()
            ),
            agent_output=payment.get("reason", "Pending payment"),
            agent_explanation=result["reason"],
            payment_details={
                "payment_id": payment_id,
                "recipient": recipient,
                "amount": amount,
            },
        )
        self.events.append(result.copy())
        return result

    def reject_payment(
        self,
        caller: str,
        payment_id: int,
    ) -> dict:
        """Reject a pending payment as the vault owner."""

        def failure_result(status: str, message: str) -> dict:
            result = {
                "label": SIMULATION_LABEL,
                "status": status,
                "reason": message,
                "payment_id": payment_id,
            }
            payment = next(
                (item for item in self.pending_payments if item["id"] == payment_id),
                None,
            )
            payment_details = {"payment_id": payment_id}
            if payment is not None:
                payment_details["recipient"] = payment["recipient"]
                payment_details["amount"] = payment["amount"]
            self._attach_receipt(
                result,
                action="reject_payment",
                model_id=(
                    payment.get("modelId", "local-test-model")
                    if payment is not None
                    else "local-test-model"
                ),
                timestamp=datetime.now().isoformat(),
                agent_output=(
                    payment.get("reason", "Owner rejection attempt")
                    if payment is not None
                    else "Owner rejection attempt"
                ),
                agent_explanation=message,
                payment_details=payment_details,
            )
            self.events.append(result.copy())
            return result

        if caller != self.owner:
            return failure_result(
                "Blocked",
                "Only the vault owner can reject payments",
            )
        payment = next(
            (item for item in self.pending_payments if item["id"] == payment_id),
            None,
        )
        if payment is None:
            return failure_result(
                "NotFound",
                "Pending payment not found",
            )
        if payment["status"] != "Pending":
            return failure_result(
                "AlreadyProcessed",
                "Payment is no longer pending",
            )
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
        self._attach_receipt(
            result,
            action="reject_payment",
            model_id=payment.get("modelId", "local-test-model"),
            timestamp=datetime.now().isoformat(),
            agent_output=payment.get("reason", "Pending payment"),
            agent_explanation=result["reason"],
            payment_details={
                "payment_id": payment_id,
                "recipient": payment["recipient"],
                "amount": payment["amount"],
            },
        )
        self.events.append(result.copy())
        return result
