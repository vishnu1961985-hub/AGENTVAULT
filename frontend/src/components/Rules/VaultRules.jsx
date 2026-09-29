import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_CHAIN_ID,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

function getReadOnlyContract() {
  return new ethers.Contract(
    AGENT_VAULT_ADDRESS,
    AGENT_VAULT_ABI,
    new ethers.JsonRpcProvider(MST_TESTNET_RPC)
  );
}

function shorten(value) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";
}

function errorText(error, fallback) {
  return error?.shortMessage || error?.reason || error?.message || fallback;
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
  const [activeEdit, setActiveEdit] = useState("");

  async function loadRules() {
    try {
      setLoading(true);
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
        dailyLimit: ethers.formatEther(dailyLimit),
        perTransactionMax: ethers.formatEther(perTransactionMax),
        approvalThreshold: ethers.formatEther(approvalThreshold),
        maxTrustTier: maxTrustTier.toString(),
        paymentsToNextTier: paymentsToNextTier.toString(),
        tierDailyLimit: ethers.formatEther(tierDailyLimit),
      });
    } catch (error) {
      console.error("Failed to load vault rules:", error);
      setMessage("Could not read vault rules from AgentVault.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, [tier]);

  function updateField(field, value) {
    setRules((previous) => ({ ...previous, [field]: value }));
  }

  async function getOwnerContract() {
    if (!window.ethereum?.isBridgeKey) {
      throw new Error("BridgeKey wallet not detected.");
    }
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) !== MST_TESTNET_CHAIN_ID) {
      throw new Error("Please switch BridgeKey to MST Testnet.");
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts[0]) throw new Error("Please connect BridgeKey.");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const vault = new ethers.Contract(AGENT_VAULT_ADDRESS, AGENT_VAULT_ABI, signer);
    const owner = await vault.owner();

    if (owner.toLowerCase() !== accounts[0].toLowerCase()) {
      throw new Error("Connected wallet is not the vault owner.");
    }
    return vault;
  }

  async function updateRule(label, transactionFunction) {
    try {
      setSaving(true);
      setActiveEdit(label);
      setMessage(`Updating ${label}...`);
      const vault = await getOwnerContract();
      const tx = await transactionFunction(vault);
      setMessage(`Confirming ${label}...`);
      await tx.wait();
      setMessage(`${label} updated successfully.`);
      await loadRules();
    } catch (error) {
      console.error(`Failed to update ${label}:`, error);
      setMessage(errorText(error, `Failed to update ${label}.`));
    } finally {
      setSaving(false);
      setActiveEdit("");
    }
  }

  const parseMst = (value, label) => {
    if (!/^\d+(\.\d{1,18})?$/.test(String(value).trim())) {
      throw new Error(`${label} must be a valid MST amount with up to 18 decimals.`);
    }
    return ethers.parseEther(String(value).trim());
  };

  const saveDailyLimit = () => updateRule(
    "daily spending limit",
    (vault) => vault.setDailyLimit(parseMst(rules.dailyLimit, "Daily limit"))
  );

  const savePerTransactionMax = () => updateRule(
    "transaction maximum",
    (vault) => vault.setPerTransactionMax(parseMst(rules.perTransactionMax, "Transaction maximum"))
  );

  const saveApprovalThreshold = () => updateRule(
    "approval threshold",
    (vault) => vault.setApprovalThreshold(parseMst(rules.approvalThreshold, "Approval threshold"))
  );

  const saveMaxTrustTier = () => updateRule(
    "maximum trust tier",
    (vault) => vault.setMaxTrustTier(BigInt(rules.maxTrustTier || "0"))
  );

  const savePaymentsToNextTier = () => updateRule(
    "tier progression",
    (vault) => vault.setPaymentsToNextTier(BigInt(rules.paymentsToNextTier || "0"))
  );

  const saveTierDailyLimit = () => updateRule(
    `Tier ${tier} daily limit`,
    (vault) => vault.setTierDailyLimit(Number(tier), parseMst(rules.tierDailyLimit, `Tier ${tier} daily limit`))
  );

  if (loading) {
    return (
      <section className="policy-config-shell">
        <div className="policy-config-loading">
          <span className="loading-orb" />
          <div>
            <p className="eyebrow">POLICY ENGINE</p>
            <h2>Loading enforcement rules</h2>
            <p>Reading live policy state from AgentVault.</p>
          </div>
        </div>
      </section>
    );
  }

  const maxTier = Math.min(Number(rules.maxTrustTier || 0), 10);

  return (
    <section className="policy-config-shell">
      <div className="policy-config-header">
        <div>
          <div className="section-kicker"><span className="pulse-dot" /> ON-CHAIN POLICY CONTROL</div>
          <h2>Policy Control Center</h2>
          <p>Configure the boundaries governing autonomous payment execution. Every change is written directly to AgentVault and requires owner authorization.</p>
        </div>
        <div className="policy-integrity">
          <span>POLICY INTEGRITY</span>
          <strong>ON-CHAIN</strong>
          <small>{shorten(AGENT_VAULT_ADDRESS)}</small>
        </div>
      </div>

      <div className="policy-rule-grid">
        <article className="policy-rule-card featured">
          <div className="rule-card-top">
            <div className="rule-icon">01</div>
            <div><span className="rule-label">SPENDING GUARDRAILS</span><h3>Financial boundaries</h3></div>
            <span className="rule-live">ENFORCED</span>
          </div>
          <div className="rule-fields">
            <RuleField label="Daily spending limit" description="Owner-defined daily ceiling. The effective limit is the lower of this and the current trust-tier limit." value={rules.dailyLimit} unit="MST" onChange={(v) => updateField("dailyLimit", v)} onSave={saveDailyLimit} saving={saving && activeEdit === "daily spending limit"} />
            <RuleField label="Transaction maximum" description="Hard ceiling applied to each individual payment." value={rules.perTransactionMax} unit="MST" onChange={(v) => updateField("perTransactionMax", v)} onSave={savePerTransactionMax} saving={saving && activeEdit === "transaction maximum"} />
            <RuleField label="Human approval threshold" description="Payments above this amount enter the owner approval queue." value={rules.approvalThreshold} unit="MST" onChange={(v) => updateField("approvalThreshold", v)} onSave={saveApprovalThreshold} saving={saving && activeEdit === "approval threshold"} />
          </div>
        </article>

        <article className="policy-rule-card">
          <div className="rule-card-top">
            <div className="rule-icon">02</div>
            <div><span className="rule-label">TRUST MODEL</span><h3>Agent progression</h3></div>
            <span className="rule-live">ACTIVE</span>
          </div>
          <div className="trust-visual">
            <div className="trust-level"><span>CURRENT CONFIGURATION</span><strong>TIER {Math.min(Number(tier), maxTier)}</strong></div>
            <div className="tier-track">
              {Array.from({ length: Math.max(1, maxTier + 1) }, (_, item) => (
                <div key={item} className={`tier-node ${Number(tier) === item ? "selected" : ""}`}>
                  <span>{item}</span><small>T{item}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="rule-fields compact">
            <RuleField label="Maximum trust tier" description="Highest tier the vault can assign." value={rules.maxTrustTier} unit="TIER" onChange={(v) => updateField("maxTrustTier", v)} onSave={saveMaxTrustTier} saving={saving && activeEdit === "maximum trust tier"} />
            <RuleField label="Clean payments to advance" description="Successful payments required for progression." value={rules.paymentsToNextTier} unit="PAYMENTS" onChange={(v) => updateField("paymentsToNextTier", v)} onSave={savePaymentsToNextTier} saving={saving && activeEdit === "tier progression"} />

            <div className="tier-configurator">
              <div><span className="field-label">Tier limit profile</span><span className="field-description">Select the trust tier whose daily limit you want to edit.</span></div>
              <select value={tier} onChange={(event) => setTier(event.target.value)}>
                {Array.from({ length: Math.max(1, maxTier + 1) }, (_, item) => <option key={item} value={item}>Tier {item}</option>)}
              </select>
            </div>

            <RuleField label={`Tier ${tier} daily limit`} description="Limit profile used by this trust tier." value={rules.tierDailyLimit} unit="MST" onChange={(v) => updateField("tierDailyLimit", v)} onSave={saveTierDailyLimit} saving={saving && activeEdit === `Tier ${tier} daily limit`} />
          </div>
        </article>
      </div>

      {message && <div className="policy-config-message"><span className="message-indicator" /><span>{message}</span></div>}
    </section>
  );
}

function RuleField({ label, description, value, unit, onChange, onSave, saving }) {
  return (
    <div className="rule-field">
      <div className="rule-field-copy">
        <span className="field-label">{label}</span>
        <span className="field-description">{description}</span>
      </div>
      <div className="rule-field-action">
        <div className="policy-input">
          <input type="number" min="0" step="any" value={value} onChange={(event) => onChange(event.target.value)} />
          <span>{unit}</span>
        </div>
        <button type="button" onClick={onSave} disabled={saving}>{saving ? "..." : "UPDATE"}</button>
      </div>
    </div>
  );
}
