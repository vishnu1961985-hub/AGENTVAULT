import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_CHAIN_ID,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

export default function VaultControls() {
  const [paused, setPaused] = useState(null);
  const [owner, setOwner] = useState("");
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadVaultState() {
    try {
      const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

      const vault = new ethers.Contract(
        AGENT_VAULT_ADDRESS,
        AGENT_VAULT_ABI,
        provider
      );

      const [currentPaused, currentOwner] = await Promise.all([
        vault.paused(),
        vault.owner(),
      ]);

      setPaused(currentPaused);
      setOwner(currentOwner);
    } catch (err) {
      console.error("Failed to read vault control state:", err);
      setError("Could not read vault control state.");
    }
  }

  useEffect(() => {
    loadVaultState();
  }, []);

  async function connectAndCheckOwner() {
    setError("");
    setMessage("");

    if (!window.ethereum?.isBridgeKey) {
      setError("BridgeKey wallet not detected.");
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      const network = await provider.getNetwork();

      if (network.chainId !== BigInt(MST_TESTNET_CHAIN_ID)) {
        throw new Error(
          "Please switch BridgeKey to MST Testnet before continuing."
        );
      }

      const accounts = await provider.send("eth_requestAccounts", []);

      const connectedAccount = accounts[0];

      if (!connectedAccount) {
        throw new Error("No wallet account connected.");
      }

      const vault = new ethers.Contract(
        AGENT_VAULT_ADDRESS,
        AGENT_VAULT_ABI,
        provider
      );

      const contractOwner = await vault.owner();

      setAccount(connectedAccount);
      setOwner(contractOwner);

      if (
        connectedAccount.toLowerCase() !== contractOwner.toLowerCase()
      ) {
        throw new Error(
          "Connected wallet is not the AgentVault owner."
        );
      }

      return provider;
    } catch (err) {
      setError(err.message || "Wallet check failed.");
      return null;
    }
  }

  async function changePauseState(shouldPause) {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const provider = await connectAndCheckOwner();

      if (!provider) {
        return;
      }

      const signer = await provider.getSigner();

      const vault = new ethers.Contract(
        AGENT_VAULT_ADDRESS,
        AGENT_VAULT_ABI,
        signer
      );

      const transaction = shouldPause
        ? await vault.pause()
        : await vault.unpause();

      setMessage("Transaction submitted. Waiting for confirmation...");

      await transaction.wait();

      setMessage(
        shouldPause
          ? "Vault paused successfully."
          : "Vault unpaused successfully."
      );

      await loadVaultState();
    } catch (err) {
      console.error("Vault control transaction failed:", err);
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  const ownerConnected =
    account &&
    owner &&
    account.toLowerCase() === owner.toLowerCase();

  return (
    <section className="panel danger-panel">
      <div>
        <p className="eyebrow">Vault Control</p>

        <h3>Emergency Control</h3>

        <p>
          Pause prevents new agent payment activity. Only the AgentVault
          owner can change this state.
        </p>

        <span
          className={`status-badge ${
            paused === true ? "blocked" : "active"
          }`}
        >
          {paused === null
            ? "Loading..."
            : paused
              ? "Vault Paused"
              : "Vault Active"}
        </span>
      </div>

      <div className="button-row">
        <button
          className="danger-button"
          type="button"
          onClick={() => changePauseState(true)}
          disabled={loading || paused === true}
        >
          {loading ? "Processing..." : "Pause Vault"}
        </button>

        <button
          className="secondary-button"
          type="button"
          onClick={() => changePauseState(false)}
          disabled={loading || paused === false}
        >
          {loading ? "Processing..." : "Unpause Vault"}
        </button>
      </div>

      {ownerConnected && (
        <p className="muted">
          Connected wallet is the AgentVault owner.
        </p>
      )}

      {message && <p className="success-message">{message}</p>}

      {error && <p className="demo-warning">{error}</p>}
    </section>
  );
}