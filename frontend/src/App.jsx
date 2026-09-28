import "./App.css";
import { useState } from "react";


import WalletConnect from "./components/Wallet/WalletConnect";
import VaultOverview from "./components/Vault/VaultOverview";
import VaultStats from "./components/Vault/VaultStats";
import AllowedRecipients from "./components/Allowlist/AllowedRecipients";
import VaultRules from "./components/Rules/VaultRules";
import VaultControls from "./components/Controls/VaultControls";
import TransactionFeed from "./components/Transactions/TransactionFeed";
import PendingPayments from "./components/Transactions/PendingPayments";
import ReceiptVerification from "./components/Receipts/ReceiptVerification";

function App() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">AGENTVAULT</div>

          <div className="subtitle">
            Rule-bound wallet for AI agents
          </div>
        </div>

        <WalletConnect />
      </header>

      <main className="dashboard">

        {/* REAL CONTRACT STATUS */}
        <VaultOverview />

        {/* REAL CONTRACT STATS */}
        <VaultStats />

        {/* REAL CONTRACT RECIPIENT CHECK + OWNER CONTROLS */}
        <AllowedRecipients />

        {/* REAL BLOCKCHAIN TRANSACTION FEED */}
        
          <TransactionFeed
  onSelectTransaction={setSelectedTransaction}
/>

        {/* REAL BLOCKCHAIN PENDING PAYMENTS */}
        <PendingPayments />

        {/* OWNER RULES EDITOR */}
        <VaultRules />

        {/* OWNER PAUSE / UNPAUSE CONTROLS */}
        <VaultControls />

        <ReceiptVerification
  transactionHash={selectedTransaction?.transactionHash ?? ""}
  receiptHash={selectedTransaction?.receiptHash ?? ""}
/>

      </main>
    </div>
  );
}
        
export default App;