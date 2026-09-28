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

export default function ReceiptVerification() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Receipts</p>
          <h3>Receipt Verification</h3>
        </div>

        <span className="status-badge blocked">
          Verification not connected
        </span>
      </div>

      <div className="receipt-demo-label">
        {mockReceipt.label}
      </div>

      <div className="receipt-grid">
        <div>
          <span>Action</span>
          <strong>{mockReceipt.action}</strong>
        </div>

        <div>
          <span>Status</span>
          <strong>{mockReceipt.status}</strong>
        </div>

        <div>
          <span>Reason</span>
          <strong>{mockReceipt.reason}</strong>
        </div>

        <div>
          <span>Model ID</span>
          <strong>{mockReceipt.model_id}</strong>
        </div>

        <div>
          <span>Timestamp</span>
          <strong>{mockReceipt.timestamp}</strong>
        </div>

        <div>
          <span>Caller</span>
          <strong>{mockReceipt.payment_details.caller}</strong>
        </div>

        <div>
          <span>Recipient</span>
          <strong>{mockReceipt.payment_details.recipient}</strong>
        </div>

        <div>
          <span>Amount</span>
          <strong>{mockReceipt.payment_details.amount}</strong>
        </div>
      </div>

      <div className="receipt-text">
        <span>Agent Output</span>
        <p>{mockReceipt.agent_output}</p>
      </div>

      <div className="receipt-text">
        <span>Agent Explanation</span>
        <p>{mockReceipt.agent_explanation}</p>
      </div>

      <div className="receipt-hash">
        <span>Receipt Hash</span>
        <code>{mockReceipt.receipt_hash}</code>
      </div>

      <div className="receipt-actions">
        <button
          className="secondary-button"
          type="button"
          disabled
          title="Verification endpoint is not implemented yet"
        >
          Verify Receipt
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled
          title="Waiting for confirmed MSTScan transaction details"
        >
          View on MSTScan
        </button>
      </div>

      <p className="demo-warning">
        Demo receipt only. The receipt hash is a local SHA-256 digest and is
        not an MSTScan transaction hash.
      </p>

      <p className="muted">
        MSTScan linking will be enabled after the deployed MST Testnet
        transaction details are provided.
      </p>
    </section>
  );
}