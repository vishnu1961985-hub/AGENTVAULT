import { keccak256, toUtf8Bytes } from "ethers";

import {
  AgentVaultClient,
  PaymentResult,
} from "../mst/agent-vault-client.js";

export interface PaymentRequest {
  recipient: string;
  amount: bigint;
  receiptData: string;
}

export class AgentService {
  private readonly vaultClient: AgentVaultClient;

  constructor(
    vaultAddress: string,
    agentPrivateKey: string,
  ) {
    this.vaultClient = new AgentVaultClient(
      vaultAddress,
      agentPrivateKey,
    );
  }

  async getAgentAddress(): Promise<string> {
    return await this.vaultClient.getAgentAddress();
  }

  async requestPayment(
    request: PaymentRequest,
  ): Promise<PaymentResult> {
    if (!request.recipient) {
      throw new Error("Payment recipient is required");
    }

    if (request.amount <= 0n) {
      throw new Error(
        "Payment amount must be greater than zero",
      );
    }

    if (!request.receiptData) {
      throw new Error("Receipt data is required");
    }

    const receiptHash = keccak256(
      toUtf8Bytes(request.receiptData),
    );

    return await this.vaultClient.payAndWait(
      request.recipient,
      request.amount,
      receiptHash,
    );
  }
}