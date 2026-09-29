import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

const STATUS = {
  0: "Allowed",
  1: "Blocked",
  2: "Pending",
};

function formatAmount(amount) {
  try {
    return `${ethers.formatEther(amount)} MST`;
  } catch {
    return `${amount} MST`;
  }
}

function shortenHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function shortenAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function statusIcon(status) {
  if (status === "Allowed") return "✓";
  if (status === "Blocked") return "×";
  return "!";
}

export default function TransactionFeed({ onSelectTransaction }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

      const vault = new ethers.Contract(
        AGENT_VAULT_ADDRESS,
        AGENT_VAULT_ABI,
        provider
      );

      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 10000);

      const [allowedEvents, blockedEvents, pendingEvents] =
        await Promise.all([
          vault.queryFilter(
            vault.filters.Allowed(),
            fromBlock,
            latestBlock
          ),
          vault.queryFilter(
            vault.filters.Blocked(),
            fromBlock,
            latestBlock
          ),
          vault.queryFilter(
            vault.filters.Pending(),
            fromBlock,
            latestBlock
          ),
        ]);

      const events = [
        ...allowedEvents.map((event) => ({
          id: event.args.id.toString(),
          recipient: event.args.recipient,
          amount: event.args.amount,
          receiptHash: event.args.receiptHash,
          status: "Allowed",
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        })),

        ...blockedEvents.map((event) => ({
          id: event.args.id.toString(),
          recipient: event.args.recipient,
          amount: event.args.amount,
          receiptHash: event.args.receiptHash,
          status: "Blocked",
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        })),

        ...pendingEvents.map((event) => ({
          id: event.args.id.toString(),
          recipient: event.args.recipient,
          amount: event.args.amount,
          receiptHash: event.args.receiptHash,
          status: "Pending",
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        })),
      ];

      events.sort((a, b) => b.blockNumber - a.blockNumber);

      setTransactions(events);
    } catch (err) {
      console.error("Failed to load transaction feed:", err);
      setError(
        err?.message ||
          "Unable to load blockchain transactions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();

    const interval = setInterval(
      loadTransactions,
      15000
    );

    return () => clearInterval(interval);
  }, []);

  const filteredTransactions =
    filter === "All"
      ? transactions
      : transactions.filter(
          (tx) => tx.status === filter
        );

  return (
    <section className="activity-console">
      <div className="activity-console-header">
        <div>
          <div className="activity-title-row">
            <span className="activity-terminal-dot" />

            <span className="activity-terminal-label">
              BLOCKCHAIN EVENT STREAM
            </span>
          </div>

          <h3>Agent Activity</h3>

          <p>
            Live decisions emitted by the AgentVault contract.
          </p>
        </div>

        <div className="activity-counter">
          <strong>{transactions.length}</strong>
          <span>EVENTS</span>
        </div>
      </div>

      <div className="activity-filter-bar">
        <div className="activity-filter-label">
          FILTER
        </div>

        <div className="activity-filters">
          {["All", "Allowed", "Blocked", "Pending"].map(
            (item) => (
              <button
                key={item}
                type="button"
                className={`activity-filter ${
                  filter === item ? "active" : ""
                }`}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>

      {loading && (
        <div className="activity-empty-state">
          <div className="activity-loader">
            <span />
            <span />
            <span />
          </div>

          <strong>
            Reading MST Testnet events
          </strong>

          <span>
            Synchronizing AgentVault activity...
          </span>
        </div>
      )}

      {error && (
        <div className="activity-error">
          <span>!</span>
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        filteredTransactions.length === 0 && (
          <div className="activity-empty-state">
            <div className="activity-empty-icon">
              ◇
            </div>

            <strong>
              No matching events
            </strong>

            <span>
              AgentVault has not emitted an event matching
              this filter.
            </span>
          </div>
        )}

      {!loading &&
        !error &&
        filteredTransactions.length > 0 && (
          <div className="activity-stream">
            {filteredTransactions.map(
              (tx, index) => (
                <button
                  key={`${tx.transactionHash}-${tx.id}`}
                  type="button"
                  className="activity-event"
                  onClick={() =>
                    onSelectTransaction?.(tx)
                  }
                >
                  <div className="activity-event-line">
                    {index !==
                      filteredTransactions.length - 1 && (
                      <span />
                    )}
                  </div>

                  <div
                    className={`activity-event-icon ${tx.status.toLowerCase()}`}
                  >
                    {statusIcon(tx.status)}
                  </div>

                  <div className="activity-event-main">
                    <div className="activity-event-heading">
                      <div>
                        <span className="activity-event-type">
                          PAYMENT #{tx.id}
                        </span>

                        <strong>
                          {tx.status === "Allowed"
                            ? "Payment executed"
                            : tx.status === "Blocked"
                            ? "Payment rejected"
                            : "Approval required"}
                        </strong>
                      </div>

                      <span
                        className={`activity-status ${tx.status.toLowerCase()}`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    <div className="activity-event-details">
                      <span>
                        RECIPIENT{" "}
                        <strong>
                          {shortenAddress(
                            tx.recipient
                          )}
                        </strong>
                      </span>

                      <span>
                        BLOCK{" "}
                        <strong>
                          {tx.blockNumber}
                        </strong>
                      </span>

                      <span>
                        TX{" "}
                        <strong>
                          {shortenHash(
                            tx.transactionHash
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="activity-event-value">
                    <span>VALUE</span>

                    <strong>
                      {formatAmount(tx.amount)}
                    </strong>

                    <small>
                      INSPECT →
                    </small>
                  </div>
                </button>
              )
            )}
          </div>
        )}

      {!loading &&
        !error &&
        filteredTransactions.length > 0 && (
          <div className="activity-footer">
            <span>
              ● STREAMING EVERY 15 SECONDS
            </span>

            <span>
              SELECT EVENT FOR INSPECTION
            </span>
          </div>
        )}
    </section>
  );
}