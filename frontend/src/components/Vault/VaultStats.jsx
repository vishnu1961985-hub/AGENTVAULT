const stats = [
  ["Vault Balance", "Not connected"],
  ["Daily Limit", "Not connected"],
  ["Today's Spending", "Not connected"],
  ["Per-Transaction Maximum", "Not connected"],
  ["Approval Threshold", "Not connected"],
  ["Trust Tier", "Not implemented"],
];

export default function VaultStats() {
  return (
    <section className="stats-grid">
      {stats.map(([label, value]) => (
        <article className="stat-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}