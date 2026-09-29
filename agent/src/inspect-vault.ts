import dotenv from "dotenv";
import { Contract, JsonRpcProvider } from "ethers";
import { readFileSync } from "node:fs";

dotenv.config({ path: "agent/.env" });

const rpcUrl = process.env.MST_RPC_URL;
const vaultAddress = process.env.AGENTVAULT_ADDRESS;

if (!rpcUrl) {
  throw new Error("MST_RPC_URL is not configured");
}

if (!vaultAddress) {
  throw new Error("AGENTVAULT_ADDRESS is not configured");
}

const abi = JSON.parse(
  readFileSync("abi/AgentVault.json", "utf8"),
);

const provider = new JsonRpcProvider(rpcUrl);
const vault = new Contract(vaultAddress, abi, provider);

console.log("=== AgentVault Inspection ===");
console.log("Vault:", vaultAddress);

console.log("Owner:", await vault.owner());
console.log("Agent:", await vault.agent());
console.log("Paused:", await vault.paused());
console.log("Active:", await vault.isActive());
console.log("Expiry:", await vault.expiry());
console.log("Daily limit:", (await vault.dailyLimit()).toString());
console.log(
  "Per-transaction max:",
  (await vault.perTransactionMax()).toString(),
);
console.log(
  "Vault balance:",
  (await vault.getVaultBalance()).toString(),
);
console.log(
  "Spent today:",
  (await vault.getSpentToday()).toString(),
);
console.log(
  "Trust tier:",
  (await vault.trustTier()).toString(),
);
console.log(
  "Approval threshold:",
  (await vault.approvalThreshold()).toString(),
);