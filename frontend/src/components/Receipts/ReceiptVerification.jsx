import { useMemo, useState } from "react";
import {
  MSTSCAN_TX_BASE_URL,
} from "../../contracts/agentVault";

const mockReceipt = {
  label: "SIMULATION / LOCAL TEST",
  action: "submit_payment",
  status: "Allowed",
  reason: "All configured checks passed",
  model_id: "local-test-model",
  timestamp: "2026-09-29T12:00:00",
  agent_output: "Demo payment for receipt UI testing",
  agent_explanation: "All configured checks passed",
  payment_details: {
    caller: "demo-agent",
    recipient: "demo-merchant",
    amount: 10,
  },
  receipt_hash:
    "47cdb0b194097b73fb3cc7ccd2a369219fa59e18e5123830dfbf531a1897b9e4",
};

export default function ReceiptVerification({
  transactionHash = "",
  receiptHash = "",
}) {
  const [verificationMessage, setVerificationMessage] =
    useState("");

  const hasTransactionHash =
    typeof transactionHash === "string" &&
    transactionHash.trim().length > 0;

  const displayedReceiptHash =
    receiptHash || mockReceipt.receipt_hash;

  const mstScanUrl = useMemo(() => {
    if (!hasTransactionHash) {
      return "";
    }

    return `${MSTSCAN_TX_BASE_URL}${transactionHash}`;
  }, [transactionHash, hasTransactionHash]);

  function handleVerifyReceipt() {
    /*
     * Person 4's current implementation provides the
     * receipt structure and local SHA-256 concept, but
     * does not currently expose a verification function
     * to this React component.
     *
     * Therefore we do NOT claim the receipt is verified.
     */
    setVerificationMessage(
      "Receipt verification is not connected to a verification function yet."
    );
  }

  function handleViewMSTScan() {
    if (!mstScanUrl) {
      return;
    }

    window.open(
      mstScanUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <section className="panel receipt-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Receipts</p>

          <h3>
            Receipt Verification
          </h3>
        </div>

        <span
          className={
            hasTransactionHash
              ? "status-badge allowed"
              : "status-badge blocked"
          }
        >
          {hasTransactionHash
            ? "Transaction Available"
            : "Verification Pending"}
        </span>
      </div>

      <div className="receipt-demo-label">
        {mockReceipt.label}
      </div>

      <div className="receipt-grid">
        <div>
          <span>Action</span>
          <strong>
            {mockReceipt.action}
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            {mockReceipt.status}
          </strong>
        </div>

        <div>
          <span>Reason</span>
          <strong>
            {mockReceipt.reason}
          </strong>
        </div>

        <div>
          <span>Model ID</span>
          <strong>
            {mockReceipt.model_id}
          </strong>
        </div>

        <div>
          <span>Timestamp</span>
          <strong>
            {mockReceipt.timestamp}
          </strong>
        </div>

        <div>
          <span>Caller</span>
          <strong>
            {mockReceipt.payment_details.caller}
          </strong>
        </div>

        <div>
          <span>Recipient</span>
          <strong>
            {mockReceipt.payment_details.recipient}
          </strong>
        </div>

        <div>
          <span>Amount</span>
          <strong>
            {mockReceipt.payment_details.amount} MST
          </strong>
        </div>
      </div>

      <div className="receipt-text">
        <span>Agent Output</span>

        <p>
          {mockReceipt.agent_output}
        </p>
      </div>

      <div className="receipt-text">
        <span>Agent Explanation</span>

        <p>
          {mockReceipt.agent_explanation}
        </p>
      </div>

      <div className="receipt-hash">
        <span>Receipt Hash</span>

        <code>
          {displayedReceiptHash}
        </code>
      </div>

      <div className="receipt-hash">
        <span>Blockchain Transaction Hash</span>

        <code>
          {hasTransactionHash
            ? transactionHash
            : "No confirmed transaction available"}
        </code>
      </div>

      <div className="receipt-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={handleVerifyReceipt}
        >
          Verify Receipt
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={!hasTransactionHash}
          onClick={handleViewMSTScan}
          title={
            hasTransactionHash
              ? "Open transaction on MSTScan"
              : "Waiting for a confirmed blockchain transaction"
          }
        >
          View on MSTScan
        </button>
      </div>

      {verificationMessage && (
        <p className="muted">
          {verificationMessage}
        </p>
      )}

      <p className="demo-warning">
        The displayed receipt is currently a local
        simulation receipt. Its SHA-256 receipt hash is
        separate from the blockchain transaction hash.
      </p>

      {!hasTransactionHash && (
        <p className="muted">
          MSTScan linking will become available when a
          real AgentVault payment transaction is available.
        </p>
      )}
    </section>
  );
}