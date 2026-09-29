import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { AGENT_VAULT_ABI, AGENT_VAULT_ADDRESS, MST_TESTNET_CHAIN_ID, MST_TESTNET_RPC } from "../../contracts/agentVault";

const OWNER_READ = "owner";

function short(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet";
}

export default function WalletConnect({ onWalletChange }) {
  const [wallet, setWallet] = useState({ account: null, chainId: null, owner: null, isOwner: false, isCorrectNetwork: false });
  const [error, setError] = useState("");

  async function sync(accountOverride) {
    if (!window.ethereum?.isBridgeKey) {
      setError("BridgeKey wallet not detected.");
      const next = { account: null, chainId: null, owner: null, isOwner: false, isCorrectNetwork: false };
      setWallet(next); onWalletChange?.(next); return;
    }
    try {
      const accounts = accountOverride ?? await window.ethereum.request({ method: "eth_accounts" });
      const account = accounts?.[0] ?? null;
      const chainHex = await window.ethereum.request({ method: "eth_chainId" });
      const chainId = Number.parseInt(chainHex, 16);
      const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);
      const vault = new ethers.Contract(AGENT_VAULT_ADDRESS, AGENT_VAULT_ABI, provider);
      const owner = await vault[OWNER_READ]();
      const next = { account, chainId, owner, isOwner: !!account && account.toLowerCase() === owner.toLowerCase(), isCorrectNetwork: chainId === MST_TESTNET_CHAIN_ID };
      setWallet(next); setError(""); onWalletChange?.(next);
    } catch (err) {
      setError(err?.message || "Unable to read wallet state.");
    }
  }

  async function connect() {
    setError("");
    try {
      if (!window.ethereum?.isBridgeKey) throw new Error("BridgeKey wallet not detected.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      await sync(accounts);
    } catch (err) {
      setError(err?.message || "Wallet connection failed.");
    }
  }

  useEffect(() => {
    sync();
    if (!window.ethereum) return undefined;
    const onAccounts = (accounts) => sync(accounts);
    const onChain = () => sync();
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  return (
    <div className="wallet-connect">
      <button className="primary-button" type="button" onClick={connect}>
        <span className="wallet-button-dot" />
        {wallet.account ? short(wallet.account) : "Connect BridgeKey"}
      </button>
      {wallet.account && (
        <div className="wallet-meta">
          <span className={wallet.isCorrectNetwork ? "ok" : "warn"}>{wallet.isCorrectNetwork ? "MST TESTNET" : `CHAIN ${wallet.chainId}`}</span>
          <span className={wallet.isOwner ? "ok" : "muted"}>{wallet.isOwner ? "OWNER" : "VIEW ONLY"}</span>
        </div>
      )}
      {error && <p className="wallet-error">{error}</p>}
    </div>
  );
}
