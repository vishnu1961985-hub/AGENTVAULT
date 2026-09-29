import dotenv from "dotenv";
import { isAddress, keccak256, toUtf8Bytes } from "ethers";
import { createServer } from "node:http";
import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";

import { AgentService } from "../service/agent-service.js";

dotenv.config({ path: "agent/.env" });

const vaultAddress = process.env.AGENTVAULT_ADDRESS;
const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;

if (!vaultAddress || !isAddress(vaultAddress)) {
  throw new Error("AGENTVAULT_ADDRESS must be a valid EVM address");
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
        const agent = await agentService.getAgentAddress();

        sendJson(response, 200, {
          status: "READY",
          agent,
          vault: vaultAddress,
        });

        return;
      }

      /*
       * Read-only payment dry run.
       *
       * This validates the payment intent and computes the
       * exact receipt hash that would be submitted to AgentVault.
       *
       * IMPORTANT:
       * This endpoint does NOT submit a blockchain transaction
       * and does NOT attempt to reproduce AgentVault policy logic.
       */
      if (
        request.method === "POST" &&
        request.url === "/api/payments/dry-run"
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

        if (
          !/^0x[a-fA-F0-9]{40}$/.test(body.recipient)
        ) {
          sendJson(response, 400, {
            error: "recipient must be a valid EVM address",
          });
          return;
        }

        if (
          !/^\d+$/.test(body.amount) ||
          body.amount === "0"
        ) {
          sendJson(response, 400, {
            error:
              "amount must be a positive integer string in MST base units",
          });
          return;
        }

        if (body.receiptData.length === 0) {
          sendJson(response, 400, {
            error: "receiptData is required",
          });
          return;
        }

        const receiptHash = keccak256(
          toUtf8Bytes(body.receiptData),
        );

        const agent =
          await agentService.getAgentAddress();

        sendJson(response, 200, {
          mode: "DRY_RUN",
          wouldSubmit: true,
          agent,
          vault: vaultAddress,
          recipient: body.recipient,
          amount: body.amount,
          receiptHash,
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

        if (!/^\d+$/.test(body.amount) || body.amount === "0") {
          sendJson(response, 400, {
            error:
              "amount must be a positive integer string in MST base units",
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