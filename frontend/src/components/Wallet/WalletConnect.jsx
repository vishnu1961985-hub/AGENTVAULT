import { useState } from "react";

export default function WalletConnect() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  async function connectWallet() {
    setError("");

    if (!window.ethereum?.isBridgeKey) {
      setError("BridgeKey wallet not detected.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0] ?? null);
    } catch (err) {
      setError(err.message || "Wallet connection failed.");
    }
  }

  return (
    <div>
      <button
        className="primary-button"
        type="button"
        onClick={connectWallet}
      >
        {account
          ? `${account.slice(0, 6)}...${account.slice(-4)}`
          : "Connect Wallet"}
      </button>

      {error && <p className="wallet-error">{error}</p>}
    </div>
  );
}