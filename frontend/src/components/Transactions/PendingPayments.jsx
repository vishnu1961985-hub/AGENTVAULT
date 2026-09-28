export default function PendingPayments() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Pending Payments</p>
          <h3>Approval Queue</h3>
        </div>

        <span className="status-badge blocked">
          Contract not deployed
        </span>
      </div>

      <div className="empty-state">
        <strong>No pending payments available.</strong>

        <p>
          Pending payments will appear here after AgentVault is deployed to
          MST Testnet and the final payment structure is available.
        </p>
      </div>

      <div className="button-row">
        <button
          className="primary-button"
          type="button"
          disabled
          title="Available after MST Testnet deployment"
        >
          Approve Payment
        </button>

        <button
          className="danger-button"
          type="button"
          disabled
          title="Available after MST Testnet deployment"
        >
          Reject Payment
        </button>
      </div>

      <p className="demo-warning">
        Contract functions: approvePayment(uint256) / rejectPayment(uint256)
      </p>
    </section>
  );
}