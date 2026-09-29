import { network } from "hardhat";

const { ethers } = await network.create();

const VAULT_ADDRESS = "0x746392d55268c859cBf16bcc8b7902615D2be8b1";
const MOCK_MERCHANT = "0xD141f9dB830C3733F62aB09dECB41EA893B6418F";

async function main() {
  const provider = ethers.provider;
  const networkInfo = await provider.getNetwork();
  const vault = await ethers.getContractAt("AgentVault", VAULT_ADDRESS);

  const [
    owner, agent, paused, active, balance, dailyLimit, effectiveDailyLimit,
    spentToday, perTransactionMax, approvalThreshold, trustTier, maxTrustTier,
    cleanPayments, paymentsToNextTier, merchantApproved, merchantCap, nextPaymentId
  ] = await Promise.all([
    vault.owner(), vault.agent(), vault.paused(), vault.isActive(),
    vault.getVaultBalance(), vault.dailyLimit(), vault.getEffectiveDailyLimit(),
    vault.getSpentToday(), vault.perTransactionMax(), vault.approvalThreshold(),
    vault.trustTier(), vault.maxTrustTier(), vault.cleanPayments(),
    vault.paymentsToNextTier(), vault.approvedRecipient(MOCK_MERCHANT),
    vault.recipientCap(MOCK_MERCHANT), vault.nextPaymentId()
  ]);

  console.log("=== LIVE AGENTVAULT READ-ONLY CHECK ===");
  console.log("Chain ID:", networkInfo.chainId.toString());
  console.log("Vault:", VAULT_ADDRESS);
  console.log("Owner:", owner);
  console.log("Agent:", agent);
  console.log("Paused:", paused);
  console.log("Active:", active);
  console.log("Balance:", ethers.formatEther(balance), "MSTC");
  console.log("Owner daily cap:", ethers.formatEther(dailyLimit), "MSTC");
  console.log("Effective daily limit:", ethers.formatEther(effectiveDailyLimit), "MSTC");
  console.log("Spent today:", ethers.formatEther(spentToday), "MSTC");
  console.log("Per-tx maximum:", ethers.formatEther(perTransactionMax), "MSTC");
  console.log("Approval threshold:", ethers.formatEther(approvalThreshold), "MSTC");
  console.log("Trust tier:", trustTier.toString());
  console.log("Max trust tier:", maxTrustTier.toString());
  console.log("Clean payments:", cleanPayments.toString());
  console.log("Payments to next tier:", paymentsToNextTier.toString());
  console.log("MockMerchant approved:", merchantApproved);
  console.log("MockMerchant cap:", ethers.formatEther(merchantCap), "MSTC");
  console.log("Next payment id:", nextPaymentId.toString());

  if (networkInfo.chainId !== 91562037n) throw new Error("Wrong network: expected MST Testnet chain 91562037.");
  if (!active) throw new Error("Vault is inactive.");
  if (owner === ethers.ZeroAddress || agent === ethers.ZeroAddress) throw new Error("Vault owner/agent is not configured.");

  console.log("READ-ONLY CHECK: PASS");
}

main().catch((error) => {
  console.error("READ-ONLY CHECK: FAIL");
  console.error(error);
  process.exitCode = 1;
});
