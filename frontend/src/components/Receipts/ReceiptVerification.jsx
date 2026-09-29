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

function shortenHash(value, start = 18, end = 12) {
  if (!value) return "—";

  if (value.length <= start + end) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

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
     * The current AgentVault frontend does not expose a
     * cryptographic receipt verification function.
     *
     * Do not claim that a receipt has been verified.
     */
    setVerificationMessage(
      "Cryptographic verification is not connected yet. The receipt hash can be inspected, but no verification result is claimed."
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
    <section className="audit-command-center">

      {/* HEADER */}

      <div className="audit-header">

        <div>
          <div className="section-kicker">
            <span className="pulse-dot" />
            AUDIT & PROOF
          </div>

          <h2>Receipt Verification</h2>

          <p>
            Inspect the evidence attached to an autonomous
            payment request and trace the corresponding
            blockchain transaction.
          </p>
        </div>

        <div
          className={`audit-state ${
            hasTransactionHash
              ? "confirmed"
              : "waiting"
          }`}
        >
          <span className="state-dot" />

          <div>
            <small>CHAIN LINK</small>

            <strong>
              {hasTransactionHash
                ? "AVAILABLE"
                : "WAITING"}
            </strong>
          </div>
        </div>

      </div>

      {/* RECEIPT IDENTITY */}

      <div className="audit-identity">

        <div className="audit-identity-label">
          <span>RECEIPT HASH</span>
          <small>SHA-256 CLAIM IDENTIFIER</small>
        </div>

        <div className="audit-hash">
          <code>
            {displayedReceiptHash}
          </code>

          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(
                displayedReceiptHash
              )
            }
          >
            COPY
          </button>
        </div>

      </div>

      {/* AUDIT PIPELINE */}

      <div className="audit-pipeline">

        <div className="audit-stage complete">
          <span className="audit-stage-number">
            01
          </span>

          <div>
            <strong>AGENT OUTPUT</strong>
            <small>
              Decision context captured
            </small>
          </div>
        </div>

        <div className="audit-connector" />

        <div className="audit-stage complete">
          <span className="audit-stage-number">
            02
          </span>

          <div>
            <strong>RECEIPT HASH</strong>
            <small>
              Evidence identifier attached
            </small>
          </div>
        </div>

        <div className="audit-connector" />

        <div
          className={`audit-stage ${
            hasTransactionHash
              ? "complete"
              : "pending"
          }`}
        >
          <span className="audit-stage-number">
            03
          </span>

          <div>
            <strong>BLOCKCHAIN TX</strong>
            <small>
              {hasTransactionHash
                ? "Transaction available"
                : "Awaiting confirmed payment"}
            </small>
          </div>
        </div>

      </div>

      {/* EVIDENCE GRID */}

      <div className="audit-evidence-grid">

        <article className="audit-evidence-card">

          <div className="audit-card-heading">
            <span className="audit-card-index">
              REQUEST
            </span>

            <span className="audit-card-status">
              CAPTURED
            </span>
          </div>

          <div className="audit-data-row">
            <span>Action</span>
            <strong>
              {mockReceipt.action}
            </strong>
          </div>

          <div className="audit-data-row">
            <span>Model</span>
            <strong>
              {mockReceipt.model_id}
            </strong>
          </div>

          <div className="audit-data-row">
            <span>Timestamp</span>
            <strong>
              {mockReceipt.timestamp}
            </strong>
          </div>

        </article>

        <article className="audit-evidence-card">

          <div className="audit-card-heading">
            <span className="audit-card-index">
              PAYMENT
            </span>

            <span
              className={`audit-status ${
                mockReceipt.status.toLowerCase()
              }`}
            >
              {mockReceipt.status.toUpperCase()}
            </span>
          </div>

          <div className="audit-data-row">
            <span>Caller</span>
            <strong>
              {mockReceipt.payment_details.caller}
            </strong>
          </div>

          <div className="audit-data-row">
            <span>Recipient</span>
            <strong>
              {mockReceipt.payment_details.recipient}
            </strong>
          </div>

          <div className="audit-data-row">
            <span>Amount</span>
            <strong>
              {mockReceipt.payment_details.amount} MST
            </strong>
          </div>

        </article>

      </div>

      {/* AGENT CONTEXT */}

      <div className="audit-context-grid">

        <div className="audit-context-card">

          <div className="audit-context-heading">
            <span>AGENT OUTPUT</span>
            <small>RECORDED CONTEXT</small>
          </div>

          <p>
            {mockReceipt.agent_output}
          </p>

        </div>

        <div className="audit-context-card">

          <div className="audit-context-heading">
            <span>AGENT EXPLANATION</span>
            <small>RECORDED CONTEXT</small>
          </div>

          <p>
            {mockReceipt.agent_explanation}
          </p>

        </div>

      </div>

      {/* BLOCKCHAIN PROOF */}

      <div className="blockchain-proof">

        <div className="blockchain-proof-header">

          <div>
            <span className="audit-card-index">
              BLOCKCHAIN PROOF
            </span>

            <h3>
              Transaction Evidence
            </h3>
          </div>

          <span
            className={`proof-status ${
              hasTransactionHash
                ? "available"
                : "unavailable"
            }`}
          >
            {hasTransactionHash
              ? "CONFIRMED LINK"
              : "NO TX LINK"}
          </span>

        </div>

        <div className="proof-hash">

          <span>
            TRANSACTION HASH
          </span>

          <code>
            {hasTransactionHash
              ? shortenHash(transactionHash)
              : "No confirmed transaction available"}
          </code>

        </div>

        <div className="audit-actions">

          <button
            className="audit-primary"
            type="button"
            onClick={handleVerifyReceipt}
          >
            <span>VERIFY RECEIPT</span>
            <small>
              Inspect cryptographic verification state
            </small>
          </button>

          <button
            className="audit-secondary"
            type="button"
            disabled={!hasTransactionHash}
            onClick={handleViewMSTScan}
          >
            <span>OPEN MSTSCAN</span>
            <small>
              View transaction on-chain
            </small>
          </button>

        </div>

      </div>

      {/* VERIFICATION STATE */}

      {verificationMessage && (
        <div className="audit-verification-message">

          <div className="verification-icon">
            ?
          </div>

          <div>
            <span>
              VERIFICATION STATE
            </span>

            <p>
              {verificationMessage}
            </p>
          </div>

        </div>
      )}

      {/* DISCLAIMER */}

      <div className="audit-disclaimer">

        <span>!</span>

        <p>
          This interface currently displays a local simulation
          receipt. The receipt hash is distinct from the
          blockchain transaction hash. A successful on-chain
          transaction does not by itself establish that the
          receipt's SHA-256 claim has been cryptographically
          verified by this component.
        </p>

      </div>

    </section>
  );
}