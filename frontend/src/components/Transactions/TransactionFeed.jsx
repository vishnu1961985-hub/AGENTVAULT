const filters = ["All", "Allowed", "Blocked", "Pending"];

export default function TransactionFeed() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Activity</p>
          <h3>Transaction Feed</h3>
        </div>

        <div className="filter-row">
          {filters.map((filter) => (
            <button
              className="filter-button"
              type="button"
              key={filter}
              disabled
              title="Available after MST Testnet deployment"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="empty-state">
        <strong>No blockchain activity connected yet.</strong>

        <p>
          Transaction history will appear here after AgentVault is deployed
          to MST Testnet and connected to the contract events.
        </p>
      </div>

      <p className="demo-warning">
        Waiting for AgentVault contract deployment.
      </p>
    </section>
  );
}