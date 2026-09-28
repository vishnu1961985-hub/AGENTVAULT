import WalletConnect from "../components/Wallet/WalletConnect";
import VaultOverview from "../components/Vault/VaultOverview";
import VaultStats from "../components/Vault/VaultStats";
import RulesPanel from "../components/Rules/RulesPanel";
import AllowedRecipients from "../components/Allowlist/AllowedRecipients";
import TransactionFeed from "../components/Transactions/TransactionFeed";
import PendingPayments from "../components/Transactions/PendingPayments";
import VaultControls from "../components/Controls/VaultControls";
import ReceiptVerification from "../components/Receipts/ReceiptVerification";

export default function Dashboard() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand">AGENTVAULT</p>
          <span className="brand-subtitle">
            Safe, rule-bound wallets for AI agents
          </span>
        </div>

        <WalletConnect />
      </header>

      <VaultOverview />

      <VaultStats />

      <div className="two-column">
        <RulesPanel />
        <AllowedRecipients />
      </div>

      <TransactionFeed />

      <PendingPayments />

      <div className="two-column">
        <VaultControls />
        <ReceiptVerification />
      </div>
    </main>
  );
}