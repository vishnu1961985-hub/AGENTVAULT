import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { requestPayment } from "../../services/paymentService";

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function buildReceiptData({ recipient, amount }) {
  return JSON.stringify({
    version: 1,
    action: "submit_payment",
    timestamp: new Date().toISOString(),
    source: "AgentVault dashboard",
    payment_details: { recipient, amount: String(amount) }
  });
}

export default function PolicyEngine({ selectedTransaction, onPaymentResult }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const valid = useMemo(() => {
    if (!isAddress(recipient)) return false;
    if (!/^\\d+(\\.\\d{1,18})?$/.test(amount.trim())) return false;
    try { return ethers.parseEther(amount.trim()) > 0n; } catch { return false; }
  }, [recipient, amount]);

  async function execute() {
    setError(""); setResult(null);
    if (!isAddress(recipient)) return setError("Enter a valid EVM recipient address.");
    if (!/^\\d+(\\.\\d{1,18})?$/.test(amount.trim())) return setError("Enter a valid MSTC amount with up to 18 decimals.");
    try {
      setBusy(true);
      const baseUnits = ethers.parseEther(amount.trim()).toString();
      const receiptData = buildReceiptData({ recipient, amount: baseUnits });
      const response = await requestPayment({ recipient, amount: baseUnits, receiptData });
      setResult(response);
      onPaymentResult?.(response);
    } catch (err) {
      setError(err?.message || "Payment request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="policy-engine-live">
      <div className="policy-engine-top">
        <div>
          <div className="engine-kicker"><span className="live-beacon" /> LIVE DECISION CONSOLE</div>
          <h3>Submit an agent payment request</h3>
          <p>The request is sent to the Agent Service. AgentVault remains the final policy authority.</p>
        </div>
        <div className="engine-badge">ON-CHAIN ENFORCED</div>
      </div>

      <div className="payment-console-grid">
        <div className="payment-form">
          <label>RECIPIENT</label>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="0x…" spellCheck="false" />
          <label>AMOUNT · MSTC</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.10" inputMode="decimal" />
          <button className="primary-button payment-submit" type="button" onClick={execute} disabled={busy || !valid}>
            {busy ? "WAITING FOR BLOCKCHAIN…" : "REQUEST PAYMENT →"}
          </button>
          {error && <div className="console-error">{error}</div>}
        </div>

        <div className="decision-preview">
          <div className="decision-preview-title">POLICY PATH</div>
          {["Authorized agent","Vault active","Recipient allowlist","Per-transaction max","Daily remaining limit","Recipient cap","Approval threshold"].map((item, i) => (
            <div className="decision-step" key={item}><span>{String(i + 1).padStart(2, "0")}</span><strong>{item}</strong><em>CONTRACT</em></div>
          ))}
        </div>
      </div>

      {result && (
        <div className={`payment-result ${result.status?.toLowerCase() || "unknown"}`}>
          <div className="payment-result-main">
            <span className="result-dot" />
            <div><small>AGENTVAULT DECISION</small><strong>{result.status}</strong></div>
          </div>
          <div className="payment-result-grid">
            <div><span>AMOUNT</span><strong>{ethers.formatEther(result.amount || "0")} MSTC</strong></div>
            <div><span>RECIPIENT</span><code>{result.recipient}</code></div>
            <div><span>REASON CODE</span><strong>{result.reason}</strong></div>
            <div><span>BLOCK</span><strong>{result.blockNumber ?? "pending"}</strong></div>
            <div className="wide"><span>TX HASH</span><code>{result.txHash}</code></div>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div className="selected-decision">
          Inspecting event <strong>#{selectedTransaction.id}</strong> · {selectedTransaction.status} · block {selectedTransaction.blockNumber}
        </div>
      )}
    </section>
  );
}
