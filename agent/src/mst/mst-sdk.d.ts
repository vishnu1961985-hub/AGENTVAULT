declare module "@mstblockchain/mst-sdk" {
  export class Provider {
    constructor(rpcUrl: string);

    getBlockNumber(): Promise<number>;
    getBalance(address: string): Promise<string>;
    getTransactionReceipt(hash: string): Promise<unknown>;
    waitForTransaction(hash: string): Promise<unknown>;
    estimateGas(transaction: unknown): Promise<unknown>;
  }

  export class Signer {
    constructor(privateKey: string, provider: Provider);

    static createRandom(provider: Provider): Signer;

    getPrivateKey(): string;
    getAddress(): Promise<string>;

    sendTransaction(transaction: unknown): Promise<string>;
    sendNative(
      to: string,
      amount: string
    ): Promise<string>;

    estimateGas(transaction: unknown): Promise<unknown>;
  }

  export const Constants: {
    CHAINS: {
      MAINNET: number;
      TESTNET: number;
    };
    DEFAULT_RPC_URL: string;
    GAS_LIMIT: number;
  };
}