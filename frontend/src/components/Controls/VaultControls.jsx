import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_CHAIN_ID,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

export default function VaultControls({ wallet }) {
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

      const [currentPaused, currentOwner] =
        await Promise.all([
          vault.paused(),
          vault.owner(),
        ]);

      setPaused(currentPaused);
      setOwner(currentOwner);
    } catch (err) {
      console.error(err);
      setError("Could not read vault control state.");
    }
  }

  useEffect(() => {
    loadVaultState();
  }, []);

  async function connectAndCheckOwner() {
    setError("");
    setMessage("");

    if (wallet?.account && wallet?.isOwner && wallet?.isCorrectNetwork) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setAccount(wallet.account);
      setOwner(wallet.owner);
      return provider;
    }

    if (!window.ethereum?.isBridgeKey) {
      throw new Error("BridgeKey wallet not detected.");
    }

    const provider = new ethers.BrowserProvider(
      window.ethereum
    );

    const network = await provider.getNetwork();

    if (
      network.chainId !==
      BigInt(MST_TESTNET_CHAIN_ID)
    ) {
      throw new Error(
        "Please switch BridgeKey to MST Testnet."
      );
    }

    const accounts = await provider.send(
      "eth_requestAccounts",
      []
    );

    if (!accounts[0]) {
      throw new Error("No wallet account connected.");
    }

    const vault = new ethers.Contract(
      AGENT_VAULT_ADDRESS,
      AGENT_VAULT_ABI,
      provider
    );

    const contractOwner = await vault.owner();

    setAccount(accounts[0]);
    setOwner(contractOwner);

    if (
      accounts[0].toLowerCase() !==
      contractOwner.toLowerCase()
    ) {
      throw new Error(
        "Connected wallet is not the AgentVault owner."
      );
    }

    return provider;
  }

  async function changePauseState(shouldPause) {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const provider =
        await connectAndCheckOwner();

      const signer =
        await provider.getSigner();

      const vault = new ethers.Contract(
        AGENT_VAULT_ADDRESS,
        AGENT_VAULT_ABI,
        signer
      );

      const tx = shouldPause
        ? await vault.pause()
        : await vault.unpause();

      setMessage(
        "Authority transaction submitted. Waiting for confirmation..."
      );

      await tx.wait();

      setMessage(
        shouldPause
          ? "Vault is now paused."
          : "Vault is now active."
      );

      await loadVaultState();
    } catch (err) {
      console.error(err);

      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Transaction failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const ownerConnected = Boolean(wallet?.isOwner ?? (account && owner && account.toLowerCase() === owner.toLowerCase()));

  return (
    <section className="authority-console">

      <div className="authority-header">
        <div>
          <div className="section-kicker">
            <span className="pulse-dot" />
            HUMAN OVERSIGHT
          </div>

          <h2>Vault Authority</h2>

          <p>
            The emergency control layer sits outside the autonomous
            payment flow. The vault owner can immediately pause or
            restore agent activity.
          </p>
        </div>

        <div
          className={`authority-state ${
            paused ? "is-paused" : "is-active"
          }`}
        >
          <span className="state-dot" />
          <div>
            <small>VAULT STATE</small>
            <strong>
              {paused === null
                ? "READING"
                : paused
                  ? "PAUSED"
                  : "ACTIVE"}
            </strong>
          </div>
        </div>
      </div>

      <div className="authority-body">

        <div className="authority-warning">
          <span className="warning-symbol">!</span>

          <div>
            <strong>Emergency boundary</strong>

            <p>
              Pausing the vault prevents new agent payment
              activity. This action requires the AgentVault
              owner through BridgeKey.
            </p>
          </div>
        </div>

        <div className="authority-actions">

          <button
            className="authority-pause"
            onClick={() =>
              changePauseState(true)
            }
            disabled={
              loading ||
              paused === true ||
              !ownerConnected
            }
          >
            <span>PAUSE VAULT</span>
            <small>
              {paused
                ? "Already paused"
                : "Stop autonomous activity"}
            </small>
          </button>

          <button
            className="authority-resume"
            onClick={() =>
              changePauseState(false)
            }
            disabled={
              loading ||
              paused === false ||
              !ownerConnected
            }
          >
            <span>RESUME VAULT</span>
            <small>
              {paused === false
                ? "Already active"
                : "Restore autonomous activity"}
            </small>
          </button>

        </div>

        <div className="authority-footer">

          <div>
            <span>OWNER AUTHORITY</span>

            <strong>
              {owner
                ? `${owner.slice(
                    0,
                    8
                  )}...${owner.slice(-6)}`
                : "Loading..."}
            </strong>
          </div>

          <div>
            <span>WALLET STATUS</span>

            <strong>
              {ownerConnected
                ? "AUTHORIZED"
                : wallet?.account
                  ? "VIEW ONLY"
                  : "NOT CONNECTED"}
            </strong>
          </div>

        </div>

      </div>

      {message && (
        <div className="authority-message success">
          <span />
          {message}
        </div>
      )}

      {error && (
        <div className="authority-message error">
          <span />
          {error}
        </div>
      )}

    </section>
  );
}