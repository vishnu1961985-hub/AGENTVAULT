const rules = [
  {
    label: "Daily spending limit",
    functionName: "setDailyLimit(uint256)",
  },
  {
    label: "Per-transaction maximum",
    functionName: "setPerTransactionMax(uint256)",
  },
  {
    label: "Approval threshold",
    functionName: "setApprovalThreshold(uint256)",
  },
];

export default function RulesPanel() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Rules</p>
          <h3>Spending Rules</h3>
        </div>

        <span className="status-badge blocked">
          Contract not deployed
        </span>
      </div>

      <div className="rule-list">
        {rules.map((rule) => (
          <div key={rule.label}>
            <div>
              <span>{rule.label}</span>
              <small>{rule.functionName}</small>
            </div>

            <button
              className="secondary-button"
              type="button"
              disabled
              title="Available after MST Testnet deployment"
            >
              Configure
            </button>
          </div>
        ))}
      </div>

      <p className="demo-warning">
        Contract writes will be enabled after AgentVault is deployed to MST
        Testnet.
      </p>
    </section>
  );
}