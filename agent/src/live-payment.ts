import dotenv from "dotenv";
import { keccak256, toUtf8Bytes } from "ethers";

import { AgentVaultClient } from "./mst/agent-vault-client.js";

dotenv.config({ path: "agent/.env" });

const privateKey = process.env.AGENT_PRIVATE_KEY;
const vaultAddress = process.env.AGENTVAULT_ADDRESS;
const merchantAddress = process.env.MOCK_MERCHANT_ADDRESS;

if (!privateKey) {
  throw new Error("AGENT_PRIVATE_KEY is not configured");
}

if (!vaultAddress) {
  throw new Error("AGENTVAULT_ADDRESS is not configured");
}

if (!merchantAddress) {
  throw new Error("MOCK_MERCHANT_ADDRESS is not configured");
}

// Keep the amount as raw base units.
// Do not assume MST decimals here.
const amountText = process.env.PAYMENT_AMOUNT_WEI;

if (!amountText || !/^\d+$/.test(amountText)) {
  throw new Error(
    "PAYMENT_AMOUNT_WEI must be a positive integer string",
  );
}

const amount = BigInt(amountText);

// Deterministic receipt data for the demo.
// The hash is what gets submitted on-chain.
const receiptData =
  process.env.RECEIPT_DATA ??
  JSON.stringify({
    service: "MockMerchant",
    action: "pay-per-call",
    timestamp: new Date().toISOString(),
  });

const receiptHash = keccak256(toUtf8Bytes(receiptData));

console.log("=== AgentVault Live Payment ===");
console.log("Vault:", vaultAddress);
console.log("Merchant:", merchantAddress);
console.log("Amount:", amount.toString());
console.log("Receipt hash:", receiptHash);

const client = new AgentVaultClient(
  vaultAddress,
  privateKey,
);

const agentAddress = await client.getAgentAddress();

console.log("Agent:", agentAddress);

console.log("Submitting payment...");

const txHash = await client.pay(
  merchantAddress,
  amount,
  receiptHash,
);

console.log("Transaction hash:", txHash);
console.log("Payment transaction submitted.");