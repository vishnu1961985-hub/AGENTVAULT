import { useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_CHAIN_ID,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

function getReadOnlyContract() {
  const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

  return new ethers.Contract(
    AGENT_VAULT_ADDRESS,
    AGENT_VAULT_ABI,
    provider
  );
}

export default function AllowedRecipients() {
  const [recipient, setRecipient] = useState("");
  const [approved, setApproved] = useState(null);
  const [cap, setCap] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function getOwnerContract() {
    if (!window.ethereum) {
      throw new Error("BridgeKey wallet not detected.");
    }

    if (!window.ethereum.isBridgeKey) {
      throw new Error("Please use BridgeKey.");
    }

    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    const numericChainId = parseInt(chainId, 16);

    if (numericChainId !== MST_TESTNET_CHAIN_ID) {
      throw new Error("Please switch BridgeKey to MST Testnet.");
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts.length) {
      throw new Error("Please connect BridgeKey.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const vault = new ethers.Contract(
      AGENT_VAULT_ADDRESS,
      AGENT_VAULT_ABI,
      signer
    );

    const owner = await vault.owner();

    if (owner.toLowerCase() !== accounts[0].toLowerCase()) {
      throw new Error("Connected wallet is not the vault owner.");
    }

    return vault;
  }

  function validateRecipient() {
    if (!recipient.trim()) {
      throw new Error("Enter a recipient address.");
    }

    if (!ethers.isAddress(recipient.trim())) {
      throw new Error("Enter a valid Ethereum address.");
    }

    return ethers.getAddress(recipient.trim());
  }

  async function checkRecipient() {
    try {
      setLoading(true);
      setMessage("");

      const address = validateRecipient();
      const vault = getReadOnlyContract();

      const [isApproved, recipientCap] = await Promise.all([
        vault.approvedRecipient(address),
        vault.recipientCap(address),
      ]);

      setApproved(isApproved);
      setCap(recipientCap.toString());

      setMessage("Recipient details loaded from AgentVault.");
    } catch (error) {
      console.error("Failed to check recipient:", error);

      setApproved(null);
      setCap("");

      setMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Could not read recipient details."
      );
    } finally {
      setLoading(false);
    }
  }

  async function setApproval(value) {
    try {
      setSaving(true);
      setMessage("");

      const address = validateRecipient();
      const vault = await getOwnerContract();

      setMessage(
        value
          ? "Approving recipient..."
          : "Removing recipient approval..."
      );

      const tx = await vault.setRecipientApproval(
        address,
        value
      );

      setMessage("Waiting for transaction confirmation...");

      await tx.wait();

      setApproved(value);

      setMessage(
        value
          ? "Recipient approved successfully."
          : "Recipient approval removed successfully."
      );
    } catch (error) {
      console.error("Failed to update recipient approval:", error);

      setMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Failed to update recipient approval."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipientCap() {
    try {
      setSaving(true);
      setMessage("");

      const address = validateRecipient();

      if (cap.trim() === "") {
        throw new Error("Enter a recipient cap.");
      }

      if (!/^\d+$/.test(cap.trim())) {
        throw new Error(
          "Recipient cap must be a whole number."
        );
      }

      const capValue = BigInt(cap.trim());

      const vault = await getOwnerContract();

      setMessage("Updating recipient cap...");

      const tx = await vault.setRecipientCap(
        address,
        capValue
      );

      setMessage("Waiting for transaction confirmation...");

      await tx.wait();

      setMessage(
        "Recipient cap updated successfully."
      );
    } catch (error) {
      console.error("Failed to update recipient cap:", error);

      setMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Failed to update recipient cap."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">RECIPIENT CONTROL</p>
          <h2>Allowed Recipients</h2>
        </div>
      </div>

      <p className="rules-description">
        Check and manage recipient approval and the
        per-recipient spending cap stored on AgentVault.
        Owner changes require BridgeKey approval.
      </p>

      <div className="recipient-editor">

        <div className="recipient-input-row">
          <label htmlFor="recipient-address">
            Recipient address
          </label>

          <input
            id="recipient-address"
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setApproved(null);
              setCap("");
              setMessage("");
            }}
          />

          <button
            disabled={loading || saving}
            onClick={checkRecipient}
          >
            {loading ? "Checking..." : "Check"}
          </button>
        </div>

        {approved !== null && (
          <div className="recipient-status">
            <div>
              <span>Approval status</span>

              <strong>
                {approved
                  ? "Approved"
                  : "Not approved"}
              </strong>
            </div>

            <div>
              <span>Recipient cap</span>

              <strong>
                {cap || "0"} MST
              </strong>
            </div>
          </div>
        )}

        <div className="recipient-actions">
          <button
            disabled={saving || !recipient.trim()}
            onClick={() => setApproval(true)}
          >
            Approve Recipient
          </button>

          <button
            disabled={saving || !recipient.trim()}
            onClick={() => setApproval(false)}
          >
            Remove Approval
          </button>
        </div>

        <div className="recipient-cap-row">
          <div>
            <label htmlFor="recipient-cap">
              Recipient spending cap
            </label>

            <span>
              Whole MST units
            </span>
          </div>

          <input
            id="recipient-cap"
            type="number"
            min="0"
            step="1"
            value={cap}
            onChange={(event) =>
              setCap(event.target.value)
            }
          />

          <button
            disabled={
              saving ||
              !recipient.trim() ||
              cap.trim() === ""
            }
            onClick={saveRecipientCap}
          >
            Save Cap
          </button>
        </div>
      </div>

      {message && (
        <div className="rules-message">
          {message}
        </div>
      )}
    </section>
  );
}