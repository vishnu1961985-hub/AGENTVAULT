import { useMemo, useState } from "react";
import { MSTSCAN_TX_BASE_URL } from "../../contracts/agentVault";

function short(value) {
  if (!value) return "—";
  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}

export default function ReceiptVerification({ transactionHash = "", receiptHash = "", transaction = null }) {
  const [copied, setCopied] = useState(false);
  const hasTx = Boolean(transactionHash);
  const hasReceipt = Boolean(receiptHash);
  const url = useMemo(() => hasTx ? `${MSTSCAN_TX_BASE_URL}${transactionHash}` : "", [hasTx, transactionHash]);

  async function copy(value) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  }

  return (
    <section className="receipt-live">
      <div className="receipt-header">
        <div><div className="engine-kicker"><span className="live-beacon cyan" /> ON-CHAIN EVIDENCE</div><h3>Payment provenance</h3><p>This panel displays evidence emitted by AgentVault. It does not invent or certify off-chain claims.</p></div>
        <span className={hasTx ? "evidence-state live" : "evidence-state"}>{hasTx ? "TRANSACTION LINKED" : "SELECT AN EVENT"}</span>
      </div>

      {!hasTx && !hasReceipt ? (
        <div className="receipt-empty"><span>◇</span><strong>No payment selected</strong><small>Select a blockchain event above to inspect its evidence.</small></div>
      ) : (
        <div className="receipt-grid">
          <div className="receipt-card"><span>DECISION</span><strong>{transaction?.status || "ON-CHAIN EVENT"}</strong><small>AgentVault event</small></div>
          <div className="receipt-card"><span>RECEIPT HASH</span><code>{hasReceipt ? short(receiptHash) : "—"}</code><button onClick={() => copy(receiptHash)} disabled={!hasReceipt}>{copied ? "COPIED" : "COPY"}</button></div>
          <div className="receipt-card"><span>TRANSACTION HASH</span><code>{hasTx ? short(transactionHash) : "—"}</code><button onClick={() => copy(transactionHash)} disabled={!hasTx}>COPY</button></div>
          <div className="receipt-card"><span>BLOCK</span><strong>{transaction?.blockNumber ?? "—"}</strong><small>Confirmed event block</small></div>
        </div>
      )}

      {hasTx && <a className="receipt-explorer" href={url} target="_blank" rel="noreferrer">OPEN TRANSACTION ON MSTSCAN ↗</a>}
      <div className="receipt-note">The on-chain receipt hash is the hash emitted with the payment decision. Local agent receipt integrity, if present, is a separate concern.</div>
    </section>
  );
}
