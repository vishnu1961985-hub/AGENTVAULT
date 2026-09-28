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
          vault.queryFilter(vault.filters.Allowed(), fromBlock, latestBlock),
          vault.queryFilter(vault.filters.Blocked(), fromBlock, latestBlock),
          vault.queryFilter(vault.filters.Pending(), fromBlock, latestBlock),
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
      setError(err?.message || "Unable to load blockchain transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();

    const interval = setInterval(loadTransactions, 15000);

    return () => clearInterval(interval);
  }, []);

  const filteredTransactions =
    filter === "All"
      ? transactions
      : transactions.filter((tx) => tx.status === filter);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Blockchain Activity</p>
          <h3>Transaction Feed</h3>
        </div>

        <div className="filter-row">
          {["All", "Allowed", "Blocked", "Pending"].map((item) => (
            <button
              key={item}
              type="button"
              className={`filter-button ${
                filter === item ? "active" : ""
              }`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="muted">Reading AgentVault events from MST Testnet...</p>
      )}

      {error && <p className="error-text">{error}</p>}

      {!loading && !error && filteredTransactions.length === 0 && (
        <p className="muted">No blockchain transactions found.</p>
      )}

      {!loading && !error && filteredTransactions.length > 0 && (
        <div className="transaction-list">
          {filteredTransactions.map((tx) => (
            <button
              key={`${tx.transactionHash}-${tx.id}`}
              type="button"
              className="transaction-row"
              onClick={() => onSelectTransaction?.(tx)}
            >
              <div>
                <strong>Payment #{tx.id}</strong>

                <div className="muted">
                  {tx.recipient}
                </div>
              </div>

              <div>
                <strong>{formatAmount(tx.amount)}</strong>

                <div className="muted">
                  {shortenHash(tx.transactionHash)}
                </div>
              </div>

              <span
                className={`status-badge ${tx.status.toLowerCase()}`}
              >
                {STATUS[
                  tx.status === "Allowed"
                    ? 0
                    : tx.status === "Blocked"
                    ? 1
                    : 2
                ]}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && filteredTransactions.length > 0 && (
        <p className="muted">
          Click a transaction to inspect its receipt and MSTScan transaction.
        </p>
      )}
    </section>
  );
}