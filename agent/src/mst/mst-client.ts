import { Provider, Signer, Constants } from "@mstblockchain/mst-sdk";

const rpcUrl =
  process.env.MST_RPC_URL ?? Constants.DEFAULT_RPC_URL;

export const mstProvider = new Provider(rpcUrl);

export function createAgentSigner(privateKey: string) {
  return new Signer(privateKey, mstProvider);
}