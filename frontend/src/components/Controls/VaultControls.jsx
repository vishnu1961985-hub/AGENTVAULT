export default function VaultControls() {
  return (
    <section className="panel danger-panel">
      <div>
        <p className="eyebrow">Vault Control</p>
        <h3>Emergency Control</h3>

        <p>
          The vault pause control will be connected to the AgentVault contract
          after MST Testnet deployment.
        </p>

        <span className="status-badge blocked">
          Contract not deployed
        </span>
      </div>

      <div>
        <button
          className="danger-button"
          type="button"
          disabled
          title="Available after MST Testnet deployment"
        >
          Pause Vault
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled
          title="Available after MST Testnet deployment"
        >
          Unpause Vault
        </button>
      </div>

      <p className="demo-warning">
        Contract functions: pause() / unpause()
      </p>
    </section>
  );
}