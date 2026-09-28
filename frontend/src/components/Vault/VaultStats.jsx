import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

function formatValue(value) {
  return `${ethers.formatEther(value)} MSTC`;
}

export default function VaultStats() {
  const [stats, setStats] = useState({
    balance: "Loading...",
    dailyLimit: "Loading...",
    todaySpending: "Loading...",
    perTransactionMax: "Loading...",
    approvalThreshold: "Loading...",
    trustTier: "Loading...",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVaultStats() {
      try {
        setError("");

        const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

        const vault = new ethers.Contract(
          AGENT_VAULT_ADDRESS,
          AGENT_VAULT_ABI,
          provider
        );

        const [
          balance,
          dailyLimit,
          todaySpending,
          perTransactionMax,
          approvalThreshold,
          trustTier,
        ] = await Promise.all([
          vault.getVaultBalance(),
          vault.dailyLimit(),
          vault.getSpentToday(),
          vault.perTransactionMax(),
          vault.approvalThreshold(),
          vault.trustTier(),
        ]);

        setStats({
          balance: formatValue(balance),
          dailyLimit: formatValue(dailyLimit),
          todaySpending: formatValue(todaySpending),
          perTransactionMax: formatValue(perTransactionMax),
          approvalThreshold: formatValue(approvalThreshold),
          trustTier: `Tier ${trustTier.toString()}`,
        });
      } catch (err) {
        console.error("Failed to read AgentVault stats:", err);

        setError(
          "Could not read AgentVault data from MST Testnet."
        );

        setStats({
          balance: "Unavailable",
          dailyLimit: "Unavailable",
          todaySpending: "Unavailable",
          perTransactionMax: "Unavailable",
          approvalThreshold: "Unavailable",
          trustTier: "Unavailable",
        });
      }
    }

    loadVaultStats();
  }, []);

  const statsList = [
    ["Vault Balance", stats.balance],
    ["Daily Limit", stats.dailyLimit],
    ["Today's Spending", stats.todaySpending],
    ["Per-Transaction Maximum", stats.perTransactionMax],
    ["Approval Threshold", stats.approvalThreshold],
    ["Trust Tier", stats.trustTier],
  ];

  return (
    <section className="stats-grid">
      {statsList.map(([label, value]) => (
        <article className="stat-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}

      {error && <p className="demo-warning">{error}</p>}
    </section>
  );
}