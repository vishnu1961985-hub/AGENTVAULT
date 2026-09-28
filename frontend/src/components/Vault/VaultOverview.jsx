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

  return (
    <section className="panel vault-overview">
      <p className="eyebrow">Vault Overview</p>

      <h2>AgentVault</h2>

      <span
        className={`status-badge ${
          status === "Active" ? "active" : "blocked"
        }`}
      >
        ● {status}
      </span>

      {error && <p className="demo-warning">{error}</p>}
    </section>
  );
}