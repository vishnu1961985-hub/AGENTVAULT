import { useState } from "react";
import { ethers } from "ethers";
import { AGENT_VAULT_ABI, AGENT_VAULT_ADDRESS, MST_TESTNET_CHAIN_ID, MST_TESTNET_RPC } from "../../contracts/agentVault";

function getReadOnlyContract() {
  return new ethers.Contract(AGENT_VAULT_ADDRESS, AGENT_VAULT_ABI, new ethers.JsonRpcProvider(MST_TESTNET_RPC));
}
function shortAddress(address) { return address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "—"; }
function errorText(error, fallback) { return error?.shortMessage || error?.reason || error?.message || fallback; }

export default function AllowedRecipients({ wallet }) {
  const [recipient, setRecipient] = useState("");
  const [approved, setApproved] = useState(null);
  const [cap, setCap] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function validateRecipient() {
    const value = recipient.trim();
    if (!value) throw new Error("Enter a recipient address.");
    if (!ethers.isAddress(value)) throw new Error("Enter a valid EVM address.");
    return ethers.getAddress(value);
  }

  async function getOwnerContract() {
    if (!window.ethereum?.isBridgeKey) throw new Error("BridgeKey wallet not detected.");
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) !== MST_TESTNET_CHAIN_ID) throw new Error("Please switch BridgeKey to MST Testnet.");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts[0]) throw new Error("Please connect BridgeKey.");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const vault = new ethers.Contract(AGENT_VAULT_ADDRESS, AGENT_VAULT_ABI, signer);
    const owner = await vault.owner();
    if (owner.toLowerCase() !== accounts[0].toLowerCase()) throw new Error("Connected wallet is not the vault owner.");
    return vault;
  }

  async function checkRecipient() {
    try {
      setLoading(true); setMessage("");
      const address = validateRecipient();
      const vault = getReadOnlyContract();
      const [isApproved, recipientCap] = await Promise.all([vault.approvedRecipient(address), vault.recipientCap(address)]);
      setApproved(isApproved);
      setCap(ethers.formatEther(recipientCap));
      setMessage("Recipient policy loaded from AgentVault.");
    } catch (error) {
      console.error(error); setApproved(null); setCap("");
      setMessage(errorText(error, "Could not read recipient policy."));
    } finally { setLoading(false); }
  }

  async function setApproval(value) {
    try {
      setSaving(true); setMessage("");
      const address = validateRecipient();
      const vault = await getOwnerContract();
      const tx = await vault.setRecipientApproval(address, value);
      setMessage("Confirming recipient authorization...");
      await tx.wait();
      setApproved(value);
      setMessage(value ? "Recipient authorization enabled." : "Recipient authorization removed.");
    } catch (error) {
      console.error(error); setMessage(errorText(error, "Recipient update failed."));
    } finally { setSaving(false); }
  }

  async function saveRecipientCap() {
    try {
      setSaving(true); setMessage("");
      const address = validateRecipient();
      if (!/^\d+(\.\d{1,18})?$/.test(cap.trim())) throw new Error("Recipient cap must be a valid MST amount.");
      const vault = await getOwnerContract();
      const tx = await vault.setRecipientCap(address, ethers.parseEther(cap.trim()));
      setMessage("Confirming recipient cap...");
      await tx.wait();
      setMessage("Recipient cap updated.");
    } catch (error) {
      console.error(error); setMessage(errorText(error, "Recipient cap update failed."));
    } finally { setSaving(false); }
  }

  return (
    <section className="recipient-command-center">
      <div className="recipient-header">
        <div><div className="section-kicker"><span className="pulse-dot" /> RECIPIENT SECURITY</div><h2>Authorization Registry</h2><p>Autonomous payments can only reach recipients explicitly authorized by the vault owner.</p></div>
        <div className="registry-badge"><span>ALLOWLIST</span><strong>ENFORCED</strong></div>
      </div>
      <div className="recipient-body">
        <div className="recipient-search">
          <div className="search-label"><span>RECIPIENT ADDRESS</span><small>ON-CHAIN LOOKUP</small></div>
          <div className="address-input">
            <span className="address-prefix">0x</span>
            <input type="text" placeholder="Enter recipient address..." value={recipient} onChange={(event) => { setRecipient(event.target.value); setApproved(null); setCap(""); setMessage(""); }} />
            <button onClick={checkRecipient} disabled={loading || saving || !recipient.trim()}>{loading ? "READING..." : "INSPECT"}</button>
          </div>
        </div>
        {approved !== null && (
          <div className="recipient-inspection">
            <div className="recipient-identity"><span>INSPECTED RECIPIENT</span><strong>{shortAddress(recipient)}</strong></div>
            <div className={`authorization-state ${approved ? "authorized" : "restricted"}`}><span className="state-dot" /><div><small>AUTHORIZATION</small><strong>{approved ? "AUTHORIZED" : "RESTRICTED"}</strong></div></div>
            <div className="recipient-cap-display"><span>PER-RECIPIENT CAP</span><strong>{cap || "0"}<small> MST</small></strong></div>
          </div>
        )}
        <div className="recipient-command-grid">
          <div className="recipient-command-card">
            <span className="command-number">01</span><div><h3>Authorization</h3><p>Decide whether the agent may send payments to this recipient.</p></div>
            <div className="command-actions">
              <button className="approve-recipient" disabled={saving || !recipient.trim() || !wallet?.isOwner || !wallet?.isCorrectNetwork} onClick={() => setApproval(true)}>AUTHORIZE</button>
              <button className="remove-recipient" disabled={saving || !recipient.trim() || !wallet?.isOwner || !wallet?.isCorrectNetwork} onClick={() => setApproval(false)}>RESTRICT</button>
            </div>
          </div>
          <div className="recipient-command-card">
            <span className="command-number">02</span><div><h3>Spending Boundary</h3><p>Set the maximum amount that can be spent on this recipient.</p></div>
            <div className="cap-editor">
              <input type="number" min="0" step="any" value={cap} onChange={(event) => setCap(event.target.value)} placeholder="0" />
              <span>MST</span>
              <button disabled={saving || !recipient.trim() || !cap.trim() || !wallet?.isOwner || !wallet?.isCorrectNetwork} onClick={saveRecipientCap}>SAVE CAP</button>
            </div>
          </div>
        </div>
      </div>
      {message && <div className="recipient-message"><span />{message}</div>}
    </section>
  );
}
