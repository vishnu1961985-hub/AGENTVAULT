import dotenv from "dotenv";

import { AgentService } from "./service/agent-service.js";

dotenv.config({ path: "agent/.env" });

const vaultAddress = process.env.AGENTVAULT_ADDRESS;
const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;

if (!vaultAddress) {
  throw new Error("AGENTVAULT_ADDRESS is not configured");
}

if (!agentPrivateKey) {
  throw new Error("AGENT_PRIVATE_KEY is not configured");
}

const service = new AgentService(
  vaultAddress,
  agentPrivateKey,
);

const agentAddress = await service.getAgentAddress();

console.log("=== AgentVault Agent Service ===");
console.log("Status: READY");
console.log("Vault:", vaultAddress);
console.log("Agent:", agentAddress);