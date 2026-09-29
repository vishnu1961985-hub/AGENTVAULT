import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { AgentService } from "../service/agent-service.js";

dotenv.config({ path: "agent/.env" });

const vaultAddress = process.env.AGENTVAULT_ADDRESS;
const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;

if (!vaultAddress) {
  throw new Error("AGENTVAULT_ADDRESS is not configured");
}

if (!agentPrivateKey) {
  throw new Error("AGENT_PRIVATE_KEY is not configured");
}

const agentService = new AgentService(
  vaultAddress,
  agentPrivateKey,
);

const server = new McpServer({
  name: "agentvault",
  version: "1.0.0",
});

server.registerTool(
  "pay_agent_vault",
  {
    description:
      "Request an on-chain payment through AgentVault. " +
      "The payment is evaluated by AgentVault rules on MST Testnet.",
    inputSchema: {
      recipient: z
        .string()
        .describe("Recipient blockchain address"),

      amount: z
        .string()
        .regex(/^\d+$/)
        .describe(
          "Payment amount in the smallest MST unit as an integer string",
        ),

      receiptData: z
        .string()
        .min(1)
        .describe(
          "Receipt data that will be hashed and recorded with the payment",
        ),
    },
  },
  async ({ recipient, amount, receiptData }) => {
    const result = await agentService.requestPayment({
      recipient,
      amount: BigInt(amount),
      receiptData,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();

await server.connect(transport);