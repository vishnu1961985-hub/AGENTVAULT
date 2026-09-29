import { network } from "hardhat";

const { ethers } = await network.create();

const VAULT_ADDRESS =
  "0x746392d55268c859cBf16bcc8b7902615D2be8b1";

const TIER = 0;

const TIER0_DAILY_LIMIT =
  ethers.parseEther("5");

async function main() {
  const [owner] = await ethers.getSigners();

  const vault =
    await ethers.getContractAt(
      "AgentVault",
      VAULT_ADDRESS
    );

  console.log("=================================");
  console.log("Configure Tier 0 Daily Limit");
  console.log("=================================");

  console.log("Owner:", owner.address);
  console.log("Vault:", VAULT_ADDRESS);

  console.log(
    "Current Tier 0 limit:",
    (await vault.tierDailyLimit(TIER)).toString()
  );

  console.log(
    "Setting Tier 0 daily limit to:",
    ethers.formatEther(TIER0_DAILY_LIMIT),
    "MSTC"
  );

  const tx =
    await vault
      .connect(owner)
      .setTierDailyLimit(
        TIER,
        TIER0_DAILY_LIMIT
      );

  console.log(
    "Tier 0 configuration TX:",
    tx.hash
  );

  await tx.wait();

  console.log(
    "New Tier 0 limit:",
    (
      await vault.tierDailyLimit(TIER)
    ).toString()
  );

  console.log(
    "New effective daily limit:",
    (
      await vault.getEffectiveDailyLimit()
    ).toString()
  );

  console.log("=================================");
  console.log("TIER 0 CONFIGURATION COMPLETE");
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});