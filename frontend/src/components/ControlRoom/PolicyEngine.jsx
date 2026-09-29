import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const STATUS_CONFIG = {
  Allowed: {
    className: "allowed",
    label: "PAYMENT ALLOWED",
    icon: "✓",
    description:
      "The payment was accepted by the AgentVault policy flow and recorded on-chain.",
  },
  Blocked: {
    className: "blocked",
    label: "PAYMENT BLOCKED",
    icon: "×",
    description:
      "The payment was rejected by the AgentVault policy flow.",
  },
  Pending: {
    className: "pending",
    label: "APPROVAL REQUIRED",
    icon: "!",
    description:
      "The payment is waiting for owner approval before execution.",
  },
  READY: {
    className: "ready",
    label: "AWAITING REQUEST",
    icon: "◇",
    description:
      "Select a payment from the activity stream to inspect its decision.",
  },
};

function formatAmount(amount) {
  try {
    return `${ethers.formatEther(amount)} MST`;
  } catch {
    return `${amount ?? "0"} MST`;
  }
}

function shortenAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function shortenHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function EngineStep({ number, title, description, active, complete }) {
  return (
    <div className={`engine-step ${active ? "active" : ""}`}>
      <div className={`engine-step-marker ${complete ? "complete" : ""}`}>
        {complete ? "✓" : number}
      </div>

      <div className="engine-step-copy">
        <span>{title}</span>
        <small>{description}</small>
      </div>
    </div>
  );
}

export default function PolicyEngine({ selectedTransaction }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((value) => !value);
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  const status = selectedTransaction?.status || "READY";

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.READY;

  const selectedAmount = useMemo(() => {
    if (!selectedTransaction) return "0 MST";
    return formatAmount(selectedTransaction.amount);
  }, [selectedTransaction]);

  return (
    <section className={`policy-engine-console ${config.className}`}>
      <div className="policy-engine-topline">
        <div className="policy-engine-title">
          <div className="engine-command-icon">
            <span />
            <span />
            <span />
          </div>

          <div>
            <p className="eyebrow">AUTONOMOUS SECURITY LAYER</p>
            <h2>Agent Decision Engine</h2>
          </div>
        </div>

        <div className={`engine-online ${pulse ? "pulse" : ""}`}>
          <span />
          ENGINE ONLINE
        </div>
      </div>

      <div className="policy-engine-subtitle">
        <p>
          Every payment request is evaluated against the vault&apos;s
          on-chain spending policy before funds move.
        </p>

        <div className="engine-mode">
          <span className="engine-mode-dot" />
          MST TESTNET
        </div>
      </div>

      <div className="engine-main-grid">
        <div className="engine-request-card">
          <div className="engine-card-label">
            <span>01</span>
            SELECTED REQUEST
          </div>

          {selectedTransaction ? (
            <>
              <div className="request-identity">
                <div className="request-orb">
                  <span>AI</span>
                </div>

                <div>
                  <span className="request-caption">AGENT PAYMENT</span>
                  <strong>Payment #{selectedTransaction.id}</strong>
                </div>
              </div>

              <div className="request-amount">
                <span>REQUESTED VALUE</span>
                <strong>{selectedAmount}</strong>
              </div>

              <div className="request-target">
                <span>RECIPIENT</span>
                <code>{shortenAddress(selectedTransaction.recipient)}</code>
              </div>
            </>
          ) : (
            <div className="request-empty">
              <div className="request-empty-orb">◇</div>

              <strong>Awaiting agent activity</strong>

              <span>
                Select a payment from the live transaction stream to inspect
                it here.
              </span>
            </div>
          )}
        </div>

        <div className="engine-flow-card">
          <div className="engine-card-label">
            <span>02</span>
            POLICY PIPELINE
          </div>

          <div className="engine-flow">
            <EngineStep
              number="01"
              title="AGENT REQUEST"
              description="Payment intent received"
              active={Boolean(selectedTransaction)}
              complete={Boolean(selectedTransaction)}
            />

            <div className="engine-flow-line" />

            <EngineStep
              number="02"
              title="POLICY ENGINE"
              description="Vault rules evaluated"
              active={Boolean(selectedTransaction)}
              complete={Boolean(selectedTransaction)}
            />

            <div className="engine-flow-line" />

            <EngineStep
              number="03"
              title="DECISION"
              description="On-chain result"
              active={Boolean(selectedTransaction)}
              complete={Boolean(selectedTransaction)}
            />
          </div>
        </div>
      </div>

      <div className={`engine-decision-panel ${config.className}`}>
        <div className="decision-visual">
          <div className="decision-ring ring-a" />
          <div className="decision-ring ring-b" />

          <div className="decision-core">
            <span>{config.icon}</span>
          </div>
        </div>

        <div className="decision-copy">
          <span className="decision-overline">
            {selectedTransaction
              ? "ON-CHAIN DECISION"
              : "CURRENT ENGINE STATE"}
          </span>

          <h3>{config.label}</h3>

          <p>{config.description}</p>
        </div>

        <div className="decision-meta">
          {selectedTransaction ? (
            <>
              <div>
                <span>PAYMENT</span>
                <strong>#{selectedTransaction.id}</strong>
              </div>

              <div>
                <span>BLOCK</span>
                <strong>{selectedTransaction.blockNumber}</strong>
              </div>
            </>
          ) : (
            <div>
              <span>STATUS</span>
              <strong>READY</strong>
            </div>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <div className="engine-audit-grid">
          <div className="audit-item">
            <span className="audit-icon">✓</span>

            <div>
              <span>BLOCKCHAIN RECORD</span>
              <strong>Event detected</strong>
            </div>
          </div>

          <div className="audit-item">
            <span className="audit-icon">#</span>

            <div>
              <span>TRANSACTION HASH</span>
              <strong>{shortenHash(selectedTransaction.transactionHash)}</strong>
            </div>
          </div>

          <div className="audit-item">
            <span className="audit-icon">◆</span>

            <div>
              <span>RECEIPT HASH</span>
              <strong>{shortenHash(selectedTransaction.receiptHash)}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}