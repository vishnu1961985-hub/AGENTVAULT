// // P2 Agent Service -> P3 Dashboard integration boundary.

const PAYMENT_API_BASE =
  import.meta.env.VITE_PAYMENT_API_URL || "";

const PAYMENT_API_PATH = "/api/payments";
const HEALTH_API_PATH = "/api/health";

const VALID_STATUSES = new Set([
  "ALLOWED",
  "BLOCKED",
  "PENDING",
  "UNKNOWN",
]);

export function normalizePaymentResult(result = {}) {
  const status = VALID_STATUSES.has(result.status)
    ? result.status
    : "UNKNOWN";

  return {
    txHash: result.txHash ?? "",
    status,
    reason: result.reason ?? null,
    agent: result.agent ?? "",
    recipient: result.recipient ?? "",
    amount: result.amount ?? "0",
    receiptHash: result.receiptHash ?? "",
    blockNumber: result.blockNumber ?? null,
  };
}

export async function requestPayment({
  recipient,
  amount,
  receiptData,
}) {
  const response = await fetch(
    `${PAYMENT_API_BASE}${PAYMENT_API_PATH}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient,
        amount,
        receiptData,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch {}
    throw new Error(body.error || `Payment service request failed (${response.status})`);
  }

  const result = await response.json();

  return normalizePaymentResult(result);
}

export async function getPaymentServiceHealth() {
  const response = await fetch(
    `${PAYMENT_API_BASE}${HEALTH_API_PATH}`
  );

  if (!response.ok) {
    throw new Error(
      `Payment service health check failed (${response.status})`
    );
  }

  return response.json();
}
