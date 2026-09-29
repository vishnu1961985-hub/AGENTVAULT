import { Contract, Interface, isAddress } from "ethers";
import { readFileSync } from "node:fs";

import {
  mstProvider,
  createAgentSigner,
} from "./mst-client.js";

const abi = JSON.parse(
  readFileSync("abi/AgentVault.json", "utf8"),
);

const iface = new Interface(abi);

export type PaymentStatus =
  | "ALLOWED"
  | "BLOCKED"
  | "PENDING"
  | "UNKNOWN";

export interface PaymentResult {
  txHash: string;
  status: PaymentStatus;
  reason: number;
  agent: string;
  recipient: string;
  amount: string;
  receiptHash: string;
  blockNumber: number | null;
}

export class AgentVaultClient {
  private readonly signer;

  constructor(
    private readonly vaultAddress: string,
    private readonly privateKey: string,
  ) {
    this.signer = createAgentSigner(privateKey);
  }

  async getAgentAddress(): Promise<string> {
    return await this.signer.getAddress();
  }

  async getVaultAgent(): Promise<string> {
    const vault = new Contract(this.vaultAddress, abi, this.signer);
    return await vault.agent();
  }

  async getVaultOwner(): Promise<string> {
    const vault = new Contract(
      this.vaultAddress,
      abi,
      this.signer,
    );
    return await vault.owner();
  }

  encodePay(
    recipient: string,
    amount: bigint,
    receiptHash: string,
  ): string {
    return iface.encodeFunctionData("pay", [
      recipient,
      amount,
      receiptHash,
    ]);
  }

  async pay(
    recipient: string,
    amount: bigint,
    receiptHash: string,
  ): Promise<string> {
    if (!isAddress(recipient)) throw new Error("Invalid recipient address");
    const data = this.encodePay(
      recipient,
      amount,
      receiptHash,
    );

    return await this.signer.sendTransaction({
      to: this.vaultAddress,
      data,
    });
  }

  async payAndWait(
    recipient: string,
    amount: bigint,
    receiptHash: string,
  ): Promise<PaymentResult> {
    const txHash = await this.pay(
      recipient,
      amount,
      receiptHash,
    );

    const receipt = await mstProvider.waitForTransaction(
      txHash,
    );

    return this.decodeReceipt(receipt);
  }

  decodeReceipt(receipt: any): PaymentResult {
    let decision: any = null;

    for (const log of receipt.logs ?? []) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsed?.name === "PaymentDecision") {
          decision = parsed;
        }
      } catch {
        // Ignore logs from other contracts.
      }
    }

    if (!decision) {
      throw new Error(
        "PaymentDecision event not found",
      );
    }

    const statusCode = Number(decision.args.status);

    const status: PaymentStatus =
      statusCode === 0
        ? "ALLOWED"
        : statusCode === 1
          ? "BLOCKED"
          : statusCode === 2
            ? "PENDING"
            : "UNKNOWN";

    return {
      txHash: receipt.hash,
      status,
      reason: Number(decision.args.reason),
      agent: decision.args.agent,
      recipient: decision.args.recipient,
      amount: decision.args.amount.toString(),
      receiptHash: decision.args.receiptHash,
      blockNumber: receipt.blockNumber ?? null,
    };
  }
}