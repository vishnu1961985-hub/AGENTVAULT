import { useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

export default function AllowedRecipients() {
  const [recipient, setRecipient] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkRecipient() {
    setError("");
    setResult(null);

    if (!ethers.isAddress(recipient)) {
      setError("Enter a valid wallet address.");
      return;
    }

    try {
      setLoading(true);

      const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

      const vault = new ethers.Contract(
        AGENT_VAULT_ADDRESS,
        AGENT_VAULT_ABI,
        provider
      );

      const [approved, cap] = await Promise.all([
        vault.approvedRecipient(recipient),
        vault.recipientCap(recipient),
      ]);

      setResult({
        approved,
        cap: ethers.formatEther(cap),
      });
    } catch (err) {
      console.error("Failed to check recipient:", err);
      setError("Could not read recipient settings from MST Testnet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Allowlist</p>
          <h3>Allowed Recipients</h3>
        </div>

        <span className="status-badge active">
          Connected to contract
        </span>
      </div>

      <div className="recipient-check">
        <label htmlFor="recipient-address">
          Check recipient address
        </label>

        <input
          id="recipient-address"
          type="text"
          placeholder="0x..."
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        />

        <button
          className="secondary-button"
          type="button"
          onClick={checkRecipient}
          disabled={loading}
        >
          {loading ? "Checking..." : "Check Recipient"}
        </button>
      </div>

      {result && (
        <div className="recipient-result">
          <div>
            <span>Recipient</span>
            <strong>{recipient}</strong>
          </div>

          <div>
            <span>Allowlist Status</span>
            <strong>
              {result.approved ? "Allowed" : "Not Allowed"}
            </strong>
          </div>

          <div>
            <span>Recipient Cap</span>
            <strong>{result.cap} MSTC</strong>
          </div>
        </div>
      )}

      {error && <p className="demo-warning">{error}</p>}

      <p className="muted">
        Recipient settings are read directly from the deployed AgentVault
        contract.
      </p>
    </section>
  );
}