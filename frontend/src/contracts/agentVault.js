import AgentVaultABI from "../../../abi/AgentVault.json";
import { ethers } from "ethers";

export const AGENT_VAULT_ADDRESS =
  "0x02e67C833C626506a86a750111a19a66140D8468";

export const MST_TESTNET_CHAIN_ID = 91562037;

export const MST_TESTNET_RPC =
  "https://testnetrpc.mstblockchain.com";

export const AGENT_VAULT_ABI = AgentVaultABI;

export const MSTSCAN_TX_BASE_URL =
  "https://testnet.mstscan.com/tx/";

export const AGENT_VAULT_CREATION_TX =
  "0x22373da87d8c1606a86e4319f045cc1d30ec43a31b5bb1af810bcc3fe35a068d";

export const PAYMENT_STATUS = {
  ALLOWED: 0,
  BLOCKED: 1,
  PENDING: 2,
};

export function getReadOnlyProvider() {
  return new ethers.JsonRpcProvider(MST_TESTNET_RPC);
}

export function getAgentVaultContract() {
  const provider = getReadOnlyProvider();

  return new ethers.Contract(
    AGENT_VAULT_ADDRESS,
    AGENT_VAULT_ABI,
    provider
  );
}