import dotenv from "dotenv";
import { createServer } from "node:http";
import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

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

const port = Number(
  process.env.AGENT_SERVICE_PORT ?? "3000",
);

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.statusCode = statusCode;
  response.setHeader(
    "Content-Type",
    "application/json",
  );
  response.end(JSON.stringify(body));
}

async function readBody(
  request: IncomingMessage,
): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(
  async (request, response) => {
    try {
      if (
        request.method === "GET" &&
        request.url === "/api/health"
      ) {
        const agent =
          await agentService.getAgentAddress();

        sendJson(response, 200, {
          status: "READY",
          agent,
          vault: vaultAddress,
        });

        return;
      }

      if (
        request.method === "POST" &&
        request.url === "/api/payments"
      ) {
        const rawBody = await readBody(request);

        let body: {
          recipient?: unknown;
          amount?: unknown;
          receiptData?: unknown;
        };

        try {
          body = JSON.parse(rawBody);
        } catch {
          sendJson(response, 400, {
            error: "Request body must be valid JSON",
          });
          return;
        }

        if (
          typeof body.recipient !== "string" ||
          typeof body.amount !== "string" ||
          typeof body.receiptData !== "string"
        ) {
          sendJson(response, 400, {
            error:
              "recipient, amount, and receiptData are required strings",
          });
          return;
        }

        if (!/^\d+$/.test(body.amount)) {
          sendJson(response, 400, {
            error:
              "amount must be a non-negative integer string",
          });
          return;
        }

        const result =
          await agentService.requestPayment({
            recipient: body.recipient,
            amount: BigInt(body.amount),
            receiptData: body.receiptData,
          });

        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, {
        error: "Not found",
      });
    } catch (error) {
      console.error("Agent service error:", error);

      sendJson(response, 500, {
        error: "Agent service request failed",
      });
    }
  },
);

server.listen(port, () => {
  console.log(
    `AgentVault service listening on http://localhost:${port}`,
  );
});