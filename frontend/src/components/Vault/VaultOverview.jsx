import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

export default function VaultOverview() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVaultStatus() {
      try {
        const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

        const vault = new ethers.Contract(
          AGENT_VAULT_ADDRESS,
          AGENT_VAULT_ABI,
          provider
        );

        const [paused, active] = await Promise.all([
          vault.paused(),
          vault.isActive(),
        ]);

        if (paused) {
          setStatus("Paused");
        } else if (active) {
          setStatus("Active");
        } else {
          setStatus("Inactive");
        }
      } catch (err) {
        console.error("Failed to read vault status:", err);
        setStatus("Unavailable");
        setError("Could not read vault status from MST Testnet.");
      }
    }

    loadVaultStatus();
  }, []);

  const isActive = status === "Active";
  const isPaused = status === "Paused";

  return (
    <section className="vault-command-card">
      <div className="vault-command-grid" />

      <div className="vault-command-content">
        <div className="vault-card-top">
          <div className="vault-card-label">
            <span className="vault-card-index">01</span>
            VAULT CORE
          </div>

          <div className="vault-live-indicator">
            <span className={isActive ? "" : "warning"} />
            {isActive ? "LIVE" : "ATTENTION"}
          </div>
        </div>

        <div className="vault-identity">
          <div className="vault-mini-core">
            <span>◇</span>
          </div>

          <div>
            <span>SECURED WALLET</span>
            <h2>AgentVault</h2>
          </div>
        </div>

        <div className="vault-state">
          <div
            className={`vault-state-icon ${
              isActive ? "active" : "inactive"
            }`}
          >
            {isActive ? "✓" : isPaused ? "!" : "×"}
          </div>

          <div>
            <span>CURRENT STATE</span>

            <strong>
              {status.toUpperCase()}
            </strong>

            <small>
              {isActive
                ? "Vault is accepting policy-bound activity."
                : isPaused
                ? "Owner controls have paused vault activity."
                : "Vault is not currently active."}
            </small>
          </div>
        </div>

        {error && (
          <p className="demo-warning">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}