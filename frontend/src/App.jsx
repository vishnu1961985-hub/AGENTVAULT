import "./App.css";
import WalletConnect from "./components/Wallet/WalletConnect";

const vault = {
  balance: "12,450 MST",
  dailyLimit: "5,000 MST",
  spentToday: "1,240 MST",
  transactionLimit: "1,000 MST",
  approvalThreshold: "500 MST",
  trustTier: "Tier 2",
  status: "Active",
};

const transactions = [
  {
    id: "TX-001",
    recipient: "marketplace.mst",
    amount: "120 MST",
    status: "Allowed",
    time: "10:42 AM",
  },
  {
    id: "TX-002",
    recipient: "unknown.recipient",
    amount: "850 MST",
    status: "Blocked",
    time: "10:18 AM",
  },
  {
    id: "TX-003",
    recipient: "services.mst",
    amount: "600 MST",
    status: "Pending",
    time: "09:56 AM",
  },
];

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>;
}

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">AGENTVAULT</div>
          <div className="subtitle">Rule-bound wallet for AI agents</div>
        </div>

        <WalletConnect />
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">VAULT OVERVIEW</p>
            <h1>Agent spending control</h1>
            <p className="hero-description">
              Monitor your vault, spending rules and agent transactions from
              one place.
            </p>
          </div>

          <div className="vault-status">
            <span className="status-dot" />
            {vault.status}
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Vault Balance" value={vault.balance} />
          <StatCard label="Daily Limit" value={vault.dailyLimit} />
          <StatCard label="Today's Spending" value={vault.spentToday} />
          <StatCard
            label="Per-Transaction Maximum"
            value={vault.transactionLimit}
          />
          <StatCard
            label="Approval Threshold"
            value={vault.approvalThreshold}
          />
          <StatCard label="Trust Tier" value={vault.trustTier} />
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">RULES</p>
                <h2>Vault Rules</h2>
              </div>

              <button className="secondary-button">Edit Rules</button>
            </div>

            <div className="rules-list">
              <div className="rule-row">
                <span>Daily spending limit</span>
                <strong>{vault.dailyLimit}</strong>
              </div>

              <div className="rule-row">
                <span>Maximum per transaction</span>
                <strong>{vault.transactionLimit}</strong>
              </div>

              <div className="rule-row">
                <span>Manual approval above</span>
                <strong>{vault.approvalThreshold}</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ACCESS CONTROL</p>
                <h2>Allowed Recipients</h2>
              </div>

              <button className="secondary-button">Manage</button>
            </div>

            <div className="recipient-list">
              <div className="recipient">
                <span>marketplace.mst</span>
                <span className="allowed-label">Allowed</span>
              </div>

              <div className="recipient">
                <span>services.mst</span>
                <span className="allowed-label">Allowed</span>
              </div>

              <div className="recipient">
                <span>payments.mst</span>
                <span className="allowed-label">Allowed</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">TRANSACTION MONITOR</p>
              <h2>Transaction Feed</h2>
            </div>

            <div className="feed-filters">
              <button className="filter active">All</button>
              <button className="filter">Allowed</button>
              <button className="filter">Blocked</button>
              <button className="filter">Pending</button>
            </div>
          </div>

          <div className="transaction-table">
            <div className="transaction-header">
              <span>ID</span>
              <span>Recipient</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Time</span>
            </div>

            {transactions.map((transaction) => (
              <div className="transaction-row" key={transaction.id}>
                <span>{transaction.id}</span>
                <span>{transaction.recipient}</span>
                <span>{transaction.amount}</span>
                <StatusBadge status={transaction.status} />
                <span>{transaction.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel pending-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ACTION REQUIRED</p>
                <h2>Pending Payment</h2>
              </div>

              <StatusBadge status="Pending" />
            </div>

            <div className="pending-details">
              <div>
                <span>Recipient</span>
                <strong>services.mst</strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>600 MST</strong>
              </div>
            </div>

            <div className="action-buttons">
              <button className="approve-button">Approve</button>
              <button className="reject-button">Reject</button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">SAFETY CONTROL</p>
                <h2>Vault Control</h2>
              </div>
            </div>

            <p className="control-description">
              Pause the vault to prevent new agent transactions until it is
              manually resumed.
            </p>

            <button className="pause-button">Pause Vault</button>
          </div>
        </section>

        <section className="panel receipt-panel">
          <div>
            <p className="eyebrow">VERIFICATION</p>
            <h2>Receipt Verification</h2>
            <p className="control-description">
              Verify transaction receipts and open the corresponding MSTScan
              transaction once blockchain integration is connected.
            </p>
          </div>

          <button className="secondary-button">Verify Receipt</button>
        </section>

        <div className="demo-warning">
          DEMO UI — transaction values and statuses shown above are local
          placeholder data and are not blockchain activity.
        </div>
      </main>
    </div>
  );
}

export default App;