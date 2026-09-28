const recipients = [
  {
    address: "Not configured",
    status: "Not connected",
    cap: "Not connected",
  },
];

export default function AllowedRecipients() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Allowlist</p>
          <h3>Allowed Recipients</h3>
        </div>

        <span className="status-badge blocked">
          Contract not deployed
        </span>
      </div>

      <div className="recipient-list">
        {recipients.map((recipient, index) => (
          <div className="recipient" key={index}>
            <div>
              <strong>{recipient.address}</strong>
              <span>
                Allowlist: {recipient.status}
              </span>
              <span>
                Recipient cap: {recipient.cap}
              </span>
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
        Recipient approval and caps will be connected after AgentVault is
        deployed to MST Testnet.
      </p>
    </section>
  );
}