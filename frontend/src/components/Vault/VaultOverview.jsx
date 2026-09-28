export default function VaultOverview() {
  return (
    <section className="panel vault-overview">
      <p className="eyebrow">Vault Overview</p>

      <h2>AgentVault</h2>

      <span className="status-badge blocked">
        Contract not deployed
      </span>

      <p className="muted">
        Vault status will be read from the AgentVault contract after MST
        Testnet deployment.
      </p>
    </section>
  );
}