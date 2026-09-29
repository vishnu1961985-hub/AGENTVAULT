import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { AGENT_VAULT_ABI, AGENT_VAULT_ADDRESS, MST_TESTNET_RPC } from "../../contracts/agentVault";

export default function TrustTier() {
  const [state, setState] = useState({ tier: null, clean: null, max: null, next: null });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const vault = new ethers.Contract(AGENT_VAULT_ADDRESS, AGENT_VAULT_ABI, new ethers.JsonRpcProvider(MST_TESTNET_RPC));
        const [tier, clean, max, next] = await Promise.all([
          vault.trustTier(), vault.cleanPayments(), vault.maxTrustTier(), vault.paymentsToNextTier()
        ]);
        if (alive) setState({ tier: Number(tier), clean: Number(clean), max: Number(max), next: Number(next) });
      } catch (err) {
        if (alive) setError(err?.message || "Could not read trust tier.");
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="sub-panel">
      <span className="eyebrow">TRUST TIER</span>
      {error ? <p>{error}</p> : (
        <>
          <strong>{state.tier === null ? "Loading..." : `Tier ${state.tier}`}</strong>
          <p>{state.clean === null ? "Reading on-chain progression..." : `${state.clean}/${state.next} clean payments toward the next tier · max Tier ${state.max}`}</p>
        </>
      )}
    </div>
  );
}
