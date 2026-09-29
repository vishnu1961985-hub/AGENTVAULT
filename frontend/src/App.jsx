import { useEffect, useState } from "react";
import { ethers } from "ethers";
import "./App.css";

import WalletConnect from "./components/Wallet/WalletConnect";
import VaultOverview from "./components/Vault/VaultOverview";
import VaultStats from "./components/Vault/VaultStats";
import AllowedRecipients from "./components/Allowlist/AllowedRecipients";
import VaultRules from "./components/Rules/VaultRules";
import VaultControls from "./components/Controls/VaultControls";
import TransactionFeed from "./components/Transactions/TransactionFeed";
import PendingPayments from "./components/Transactions/PendingPayments";
import ReceiptVerification from "./components/Receipts/ReceiptVerification";
import PolicyEngine from "./components/ControlRoom/PolicyEngine";
import { AGENT_VAULT_ABI, AGENT_VAULT_ADDRESS, MST_TESTNET_RPC } from "./contracts/agentVault";
import { getPaymentServiceHealth } from "./services/paymentService";

function App() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [system, setSystem] = useState({ active:null, paused:null, service:null });

  useEffect(() => {
    let alive = true;
    async function loadSystem() {
      try {
        const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);
        const vault = new ethers.Contract(AGENT_VAULT_ADDRESS, AGENT_VAULT_ABI, provider);
        const [active, paused] = await Promise.all([vault.isActive(), vault.paused()]);
        let service = null;
        try { service = await getPaymentServiceHealth(); } catch {}
        if (alive) setSystem({ active, paused, service });
      } catch (error) { console.error("System telemetry failed:", error); }
    }
    loadSystem();
    const id = setInterval(loadSystem, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const selectTransaction = (transaction) => {
    setSelectedTransaction(transaction);
  };

  return (
    <div className="app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      {/* =====================================================
          COMMAND HEADER
         ===================================================== */}

      <header className="topbar command-header">
        <div className="brand-area">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>

          <div>
            <div className="brand">AGENTVAULT</div>

            <div className="subtitle">
              Autonomous finance, under control.
            </div>
          </div>
        </div>

        <div className="network-status">
          <div className="network-pill">
            <span className="network-dot" />
            MST TESTNET
          </div>

          <div className="network-pill subtle">
            <span className="network-dot cyan" />
            POLICY ENGINE
          </div>

          <WalletConnect onWalletChange={setWallet} />
        </div>
      </header>

      <main className="dashboard">

        {/* =====================================================
            HERO COMMAND CENTER
           ===================================================== */}

        <section className="command-hero">
          <div className="command-hero-copy">
            <div className="hero-kicker">
              <span className="hero-kicker-line" />
              AI AGENT CONTROL CENTER
            </div>

            <h1>
              Autonomous action.
              <br />
              <span>Human authority.</span>
            </h1>

            <p>
              AgentVault gives an AI agent the ability to request payments
              while keeping the spending policy, approval boundary and
              emergency controls on-chain.
            </p>

            <div className="hero-command-status">
              <div className="hero-status-card">
                <span className="status-pulse" />

                <div>
                  <small>VAULT STATUS</small>
                  <strong>{system.active === null ? "READING" : system.active ? "ACTIVE" : "INACTIVE"}</strong>
                </div>
              </div>

              <div className="hero-status-card">
                <span className="status-pulse cyan" />

                <div>
                  <small>NETWORK</small>
                  <strong>MST TESTNET</strong>
                </div>
              </div>

              <div className="hero-status-card">
                <span className="status-pulse purple" />

                <div>
                  <small>POLICY</small>
                  <strong>ENFORCED</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="command-hero-core">
            <div className="hero-core-grid" />

            <div className="hero-core-orbit orbit-one" />
            <div className="hero-core-orbit orbit-two" />
            <div className="hero-core-orbit orbit-three" />

            <div className="hero-core-center">
              <div className="hero-core-symbol">◇</div>
              <span>VAULT</span>
              <strong>ACTIVE</strong>
            </div>

            <div className="hero-core-label">
              <span>AGENTVAULT</span>
              <small>RULE ENGINE PROTECTED</small>
            </div>
          </div>
        </section>

        {/* =====================================================
            SYSTEM TELEMETRY
           ===================================================== */}

        <section className="system-strip command-strip">
          <div>
            <span className="strip-dot green" />
            {system.active === null ? "CONTRACT READING" : system.active ? "CONTRACT ONLINE" : "CONTRACT INACTIVE"}
          </div>

          <div>
            <span className="strip-dot cyan" />
            BLOCKCHAIN EVENTS LIVE
          </div>

          <div>
            <span className="strip-dot purple" />
            {system.paused ? "VAULT PAUSED" : "RULE ENGINE ACTIVE"}
          </div>

          <div>
            <span className="strip-dot amber" />
            OWNER CONTROLS ENABLED
          </div>
        </section>

        {/* =====================================================
            VAULT TELEMETRY
           ===================================================== */}

        <section className="section-intro telemetry-heading">
          <div>
            <p className="eyebrow">VAULT TELEMETRY</p>
            <h2>Command overview</h2>
          </div>

          <span className="section-live">
            <span />
            LIVE DATA
          </span>
        </section>

        <div className="overview-command-grid">
          <VaultOverview />
          <VaultStats />
        </div>

        {/* =====================================================
            MAIN DECISION ENGINE
           ===================================================== */}

        <section className="decision-section">
          <div className="section-intro">
            <div>
              <p className="eyebrow">AUTONOMOUS SECURITY LAYER</p>

              <h2>
                Watch the agent
                <span className="heading-accent"> decide.</span>
              </h2>
            </div>

            <div className="decision-heading-meta">
              <span className="live-beacon" />
              REAL-TIME POLICY EVALUATION
            </div>
          </div>

          <PolicyEngine
            selectedTransaction={selectedTransaction}
            onPaymentResult={() => setRefreshKey((value) => value + 1)}
          />
        </section>

        {/* =====================================================
            LIVE ACTIVITY
           ===================================================== */}

        <section className="activity-section">
          <div className="section-intro">
            <div>
              <p className="eyebrow">ON-CHAIN ACTIVITY</p>

              <h2>
                Agent activity
                <span className="heading-accent"> stream.</span>
              </h2>
            </div>

            <div className="activity-meta">
              <span className="live-beacon cyan" />
              BLOCKCHAIN EVENTS
            </div>
          </div>

          <div className="activity-command-layout">
            <div className="activity-feed-shell">
              <TransactionFeed
                key={refreshKey}
                onSelectTransaction={selectTransaction}
              />
            </div>

            <aside className="activity-side-panel">
              <div className="side-panel-header">
                <span>INSPECTION MODE</span>

                <span className="side-panel-status">
                  {selectedTransaction ? "ACTIVE" : "IDLE"}
                </span>
              </div>

              {selectedTransaction ? (
                <div className="inspection-active">
                  <div className="inspection-status">
                    <span
                      className={`inspection-status-dot ${selectedTransaction.status.toLowerCase()}`}
                    />

                    <div>
                      <small>SELECTED EVENT</small>

                      <strong>
                        Payment #{selectedTransaction.id}
                      </strong>
                    </div>
                  </div>

                  <div className="inspection-value">
                    <small>DECISION</small>

                    <strong>
                      {selectedTransaction.status.toUpperCase()}
                    </strong>
                  </div>

                  <div className="inspection-target">
                    <small>RECIPIENT</small>

                    <code>
                      {selectedTransaction.recipient}
                    </code>
                  </div>

                  <div className="inspection-block">
                    <small>BLOCK NUMBER</small>

                    <strong>
                      {selectedTransaction.blockNumber}
                    </strong>
                  </div>

                  <div className="inspection-note">
                    This event is being inspected directly from the
                    AgentVault blockchain activity stream.
                  </div>
                </div>
              ) : (
                <div className="inspection-idle">
                  <div className="inspection-idle-icon">
                    ◇
                  </div>

                  <strong>
                    No event selected
                  </strong>

                  <span>
                    Select a transaction to activate deep inspection.
                  </span>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* =====================================================
            HUMAN OVERSIGHT
           ===================================================== */}

        <section className="oversight-section">
          <div className="section-intro">
            <div>
              <p className="eyebrow">HUMAN OVERSIGHT</p>

              <h2>
                Where the human
                <span className="heading-accent"> steps in.</span>
              </h2>
            </div>

            <div className="decision-heading-meta">
              <span className="live-beacon amber" />
              OWNER AUTHORITY
            </div>
          </div>

          <div className="oversight-grid">
            <div>
              <div className="module-label">
                <span>01</span>
                PENDING AUTHORITY
              </div>

              <PendingPayments />
            </div>

            <div>
              <div className="module-label">
                <span>02</span>
                APPROVED RECIPIENTS
              </div>

              <AllowedRecipients />
            </div>
          </div>
        </section>

        {/* =====================================================
            POLICY CONFIGURATION
           ===================================================== */}

        <section className="policy-section">
          <div className="section-intro">
            <div>
              <p className="eyebrow">PROGRAMMABLE SECURITY</p>

              <h2>
                Define the boundaries.
              </h2>
            </div>

            <div className="policy-heading-copy">
              Spending rules are enforced by the vault contract.
            </div>
          </div>

          <div className="policy-layout">
            <div>
              <div className="module-label">
                <span>RULES</span>
                SPENDING POLICY
              </div>

              <VaultRules />
            </div>

            <div>
              <div className="module-label">
                <span>CONTROL</span>
                OWNER ACTIONS
              </div>

              <VaultControls wallet={wallet} />
            </div>
          </div>
        </section>

        {/* =====================================================
            CRYPTOGRAPHIC AUDIT
           ===================================================== */}

        <section className="audit-section">
          <div className="section-intro">
            <div>
              <p className="eyebrow">CRYPTOGRAPHIC AUDIT TRAIL</p>

              <h2>
                Prove what happened.
              </h2>
            </div>

            <div className="decision-heading-meta">
              <span className="live-beacon cyan" />
              VERIFIABLE
            </div>
          </div>

          <ReceiptVerification
            transaction={selectedTransaction}
            transactionHash={selectedTransaction?.transactionHash ?? ""}
            receiptHash={selectedTransaction?.receiptHash ?? ""}
          />
        </section>

        {/* =====================================================
            FOOTER
           ===================================================== */}

        <footer className="dashboard-footer command-footer">
          <div className="footer-brand">
            <span className="footer-dot" />
            AGENTVAULT
          </div>

          <div>
            Rule-bound wallets for autonomous AI agents.
          </div>

          <div>
            MST TESTNET · BUILDATHON
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;