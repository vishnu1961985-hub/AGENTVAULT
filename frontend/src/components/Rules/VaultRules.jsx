import { useEffect, useState } from "react";
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

export default function VaultRules() {
  const [rules, setRules] = useState({
    dailyLimit: "",
    perTransactionMax: "",
    approvalThreshold: "",
    maxTrustTier: "",
    paymentsToNextTier: "",
    tierDailyLimit: "",
  });

  const [tier, setTier] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRules() {
    try {
      setLoading(true);
      setMessage("");

      const vault = getReadOnlyContract();

      const [
        dailyLimit,
        perTransactionMax,
        approvalThreshold,
        maxTrustTier,
        paymentsToNextTier,
        tierDailyLimit,
      ] = await Promise.all([
        vault.dailyLimit(),
        vault.perTransactionMax(),
        vault.approvalThreshold(),
        vault.maxTrustTier(),
        vault.paymentsToNextTier(),
        vault.tierDailyLimit(Number(tier)),
      ]);

      setRules({
        // These three values are wei-denominated MST amounts.
        dailyLimit: ethers.formatEther(dailyLimit),
        perTransactionMax: ethers.formatEther(perTransactionMax),
        approvalThreshold: ethers.formatEther(approvalThreshold),

        // These are integer configuration values.
        maxTrustTier: maxTrustTier.toString(),
        paymentsToNextTier: paymentsToNextTier.toString(),

        // IMPORTANT:
        // tierDailyLimit is stored directly as 100 / 250 / 500 / 1000,
        // not as wei.
        tierDailyLimit: tierDailyLimit.toString(),
      });
    } catch (error) {
      console.error("Failed to load vault rules:", error);
      setMessage("Could not read vault rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, [tier]);

  function updateField(field, value) {
    setRules((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

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

  async function updateRule(label, transactionFunction) {
    try {
      setSaving(true);
      setMessage(`Updating ${label}...`);

      const vault = await getOwnerContract();

      const tx = await transactionFunction(vault);

      setMessage(`Waiting for ${label} transaction...`);

      await tx.wait();

      setMessage(`${label} updated successfully.`);

      await loadRules();
    } catch (error) {
      console.error(`Failed to update ${label}:`, error);

      setMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          `Failed to update ${label}.`
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDailyLimit() {
    const value = ethers.parseEther(rules.dailyLimit || "0");

    await updateRule("daily limit", (vault) =>
      vault.setDailyLimit(value)
    );
  }

  async function savePerTransactionMax() {
    const value = ethers.parseEther(
      rules.perTransactionMax || "0"
    );

    await updateRule("per-transaction maximum", (vault) =>
      vault.setPerTransactionMax(value)
    );
  }

  async function saveApprovalThreshold() {
    const value = ethers.parseEther(
      rules.approvalThreshold || "0"
    );

    await updateRule("approval threshold", (vault) =>
      vault.setApprovalThreshold(value)
    );
  }

  async function saveMaxTrustTier() {
    const value = BigInt(rules.maxTrustTier || "0");

    await updateRule("maximum trust tier", (vault) =>
      vault.setMaxTrustTier(value)
    );
  }

  async function savePaymentsToNextTier() {
    const value = BigInt(
      rules.paymentsToNextTier || "0"
    );

    await updateRule(
      "payments required for next tier",
      (vault) => vault.setPaymentsToNextTier(value)
    );
  }

  async function saveTierDailyLimit() {
    // IMPORTANT:
    // The deployed contract stores this value directly:
    // Tier 0 -> 100
    // Tier 1 -> 250
    // Tier 2 -> 500
    // Tier 3 -> 1000
    //
    // Therefore DO NOT use ethers.parseEther() here.
    const value = BigInt(rules.tierDailyLimit || "0");

    await updateRule(
      `Tier ${tier} daily limit`,
      (vault) =>
        vault.setTierDailyLimit(
          Number(tier),
          value
        )
    );
  }

  if (loading) {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">OWNER SETTINGS</p>
            <h2>Rules Editor</h2>
          </div>
        </div>

        <p>Loading rules from AgentVault...</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">OWNER SETTINGS</p>
          <h2>Rules Editor</h2>
        </div>
      </div>

      <p className="rules-description">
        Update the spending and trust rules stored directly on
        the AgentVault contract. Changes require the vault
        owner's BridgeKey approval.
      </p>

      <div className="rules-editor">

        {/* Daily spending limit */}
        <div className="rule-editor-row">
          <div>
            <label>Daily spending limit</label>
            <span>MST</span>
          </div>

          <input
            type="number"
            min="0"
            step="0.000001"
            value={rules.dailyLimit}
            onChange={(event) =>
              updateField(
                "dailyLimit",
                event.target.value
              )
            }
          />

          <button
            disabled={saving}
            onClick={saveDailyLimit}
          >
            Save
          </button>
        </div>

        {/* Per-transaction maximum */}
        <div className="rule-editor-row">
          <div>
            <label>Maximum per transaction</label>
            <span>MST</span>
          </div>

          <input
            type="number"
            min="0"
            step="0.000001"
            value={rules.perTransactionMax}
            onChange={(event) =>
              updateField(
                "perTransactionMax",
                event.target.value
              )
            }
          />

          <button
            disabled={saving}
            onClick={savePerTransactionMax}
          >
            Save
          </button>
        </div>

        {/* Approval threshold */}
        <div className="rule-editor-row">
          <div>
            <label>Approval threshold</label>
            <span>MST</span>
          </div>

          <input
            type="number"
            min="0"
            step="0.000001"
            value={rules.approvalThreshold}
            onChange={(event) =>
              updateField(
                "approvalThreshold",
                event.target.value
              )
            }
          />

          <button
            disabled={saving}
            onClick={saveApprovalThreshold}
          >
            Save
          </button>
        </div>

        {/* Maximum trust tier */}
        <div className="rule-editor-row">
          <div>
            <label>Maximum trust tier</label>
            <span>Tier</span>
          </div>

          <input
            type="number"
            min="0"
            step="1"
            value={rules.maxTrustTier}
            onChange={(event) =>
              updateField(
                "maxTrustTier",
                event.target.value
              )
            }
          />

          <button
            disabled={saving}
            onClick={saveMaxTrustTier}
          >
            Save
          </button>
        </div>

        {/* Payments required for next tier */}
        <div className="rule-editor-row">
          <div>
            <label>
              Payments required for next tier
            </label>
            <span>Payments</span>
          </div>

          <input
            type="number"
            min="0"
            step="1"
            value={rules.paymentsToNextTier}
            onChange={(event) =>
              updateField(
                "paymentsToNextTier",
                event.target.value
              )
            }
          />

          <button
            disabled={saving}
            onClick={savePaymentsToNextTier}
          >
            Save
          </button>
        </div>

        {/* Tier selector */}
        <div className="tier-selector">
          <label>
            Tier daily-limit configuration
          </label>

          <select
            value={tier}
            onChange={(event) =>
              setTier(event.target.value)
            }
          >
            <option value="0">Tier 0</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        </div>

        {/* Selected tier daily limit */}
        <div className="rule-editor-row">
          <div>
            <label>
              Tier {tier} daily limit
            </label>
            <span>MST</span>
          </div>

          <input
            type="number"
            min="0"
            step="1"
            value={rules.tierDailyLimit}
            onChange={(event) =>
              updateField(
                "tierDailyLimit",
                event.target.value
              )
            }
          />

          <button
            disabled={saving}
            onClick={saveTierDailyLimit}
          >
            Save
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