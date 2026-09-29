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

    const interval = setInterval(loadVaultStats, 15000);

    return () => clearInterval(interval);
  }, []);

  const statsList = [
    {
      label: "Vault Balance",
      value: stats.balance,
      icon: "◈",
      accent: "cyan",
    },
    {
      label: "Daily Limit",
      value: stats.dailyLimit,
      icon: "⌁",
      accent: "purple",
    },
    {
      label: "Today's Spending",
      value: stats.todaySpending,
      icon: "↗",
      accent: "green",
    },
    {
      label: "Per-Tx Maximum",
      value: stats.perTransactionMax,
      icon: "◆",
      accent: "amber",
    },
    {
      label: "Approval Threshold",
      value: stats.approvalThreshold,
      icon: "!",
      accent: "red",
    },
    {
      label: "Trust Tier",
      value: stats.trustTier,
      icon: "◇",
      accent: "cyan",
    },
  ];

  return (
    <section className="telemetry-grid">
      {statsList.map((stat) => (
        <article
          className={`telemetry-card ${stat.accent}`}
          key={stat.label}
        >
          <div className="telemetry-card-top">
            <span>{stat.label}</span>

            <div className="telemetry-icon">
              {stat.icon}
            </div>
          </div>

          <strong>{stat.value}</strong>

          <div className="telemetry-line">
            <span />
          </div>
        </article>
      ))}

      {error && (
        <p className="demo-warning">
          {error}
        </p>
      )}
    </section>
  );
}