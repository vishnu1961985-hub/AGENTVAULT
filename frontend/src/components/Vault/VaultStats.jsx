import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { AGENT_VAULT_ABI, AGENT_VAULT_ADDRESS, MST_TESTNET_RPC } from "../../contracts/agentVault";

const empty = {
  balance:"Loading...", dailyLimit:"Loading...", todaySpending:"Loading...",
  perTransactionMax:"Loading...", approvalThreshold:"Loading...", trustTier:"Loading...",
  agent:"Loading...", owner:"Loading..."
};
const fmt = (v) => `${ethers.formatEther(v)} MSTC`;
const short = (v) => v ? `${v.slice(0,8)}...${v.slice(-6)}` : "Unavailable";

export default function VaultStats() {
  const [stats,setStats]=useState(empty);
  const [error,setError]=useState("");

  useEffect(()=>{
    let alive=true;
    async function load(){
      try{
        setError("");
        const provider=new ethers.JsonRpcProvider(MST_TESTNET_RPC);
        const vault=new ethers.Contract(AGENT_VAULT_ADDRESS,AGENT_VAULT_ABI,provider);
        const [balance,dailyLimit,spent,max,threshold,tier,agent,owner]=await Promise.all([
          vault.getVaultBalance(), vault.getEffectiveDailyLimit(), vault.getSpentToday(),
          vault.perTransactionMax(), vault.approvalThreshold(), vault.trustTier(),
          vault.agent(), vault.owner()
        ]);
        if(alive) setStats({
          balance:fmt(balance), dailyLimit:fmt(dailyLimit), todaySpending:fmt(spent),
          perTransactionMax:fmt(max), approvalThreshold:fmt(threshold),
          trustTier:`Tier ${tier}`, agent, owner
        });
      }catch(err){ if(alive){console.error(err);setError("Could not read AgentVault data from MST Testnet.");setStats({...empty,balance:"Unavailable",dailyLimit:"Unavailable",todaySpending:"Unavailable",perTransactionMax:"Unavailable",approvalThreshold:"Unavailable",trustTier:"Unavailable",agent:"Unavailable",owner:"Unavailable"});}}
    }
    load(); const id=setInterval(load,15000); return ()=>{alive=false;clearInterval(id)};
  },[]);

  const items=[
    ["Vault Balance",stats.balance,"◈","cyan"],["Effective Daily Limit",stats.dailyLimit,"⌁","purple"],
    ["Today's Spending",stats.todaySpending,"↗","green"],["Per-Tx Maximum",stats.perTransactionMax,"◆","amber"],
    ["Approval Threshold",stats.approvalThreshold,"!","red"],["Trust Tier",stats.trustTier,"◇","cyan"],
    ["Authorized Agent",short(stats.agent),"AI","purple"],["Vault Owner",short(stats.owner),"◎","amber"]
  ];
  return <section className="telemetry-grid">
    {items.map(([label,value,icon,accent])=><article className={`telemetry-card ${accent}`} key={label}>
      <div className="telemetry-card-top"><span>{label}</span><div className="telemetry-icon">{icon}</div></div>
      <strong title={value}>{value}</strong><div className="telemetry-line"><span/></div>
    </article>)}
    {error && <p className="demo-warning">{error}</p>}
  </section>;
}