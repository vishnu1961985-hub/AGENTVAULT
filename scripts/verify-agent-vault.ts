import { network } from "hardhat";

const { ethers } = await network.create();

const VAULT_ADDRESS =
  "0x3112eFAdca90b8feb1F55d8602542B6F6517e088";

async function main() {
  console.log("=================================");
  console.log("AgentVault MST On-Chain Verification");
  console.log("=================================");

  console.log("Vault:", VAULT_ADDRESS);

  // -------------------------------------------------------------------------
  // Verify contract code exists
  // -------------------------------------------------------------------------

  const code =
    await ethers.provider.getCode(VAULT_ADDRESS);

  if (code === "0x") {
    throw new Error(
      "No contract code found at the deployed address."
    );
  }

  console.log("Contract code: PRESENT");
  console.log(
    "Code size:",
    (code.length - 2) / 2,
    "bytes"
  );

  // -------------------------------------------------------------------------
  // Connect to deployed contract
  // -------------------------------------------------------------------------

  const AgentVault =
    await ethers.getContractFactory("AgentVault");

  const vault =
    AgentVault.attach(VAULT_ADDRESS);

  // -------------------------------------------------------------------------
  // Read core configuration
  // -------------------------------------------------------------------------

  const owner =
    await vault.owner();

  const agent =
    await vault.agent();

  const expiry =
    await vault.expiry();

  const paused =
    await vault.paused();

  const trustTier =
    await vault.trustTier();

  const maxTrustTier =
    await vault.maxTrustTier();

  const paymentsToNextTier =
    await vault.paymentsToNextTier();

  const balance =
    await vault.getVaultBalance();

  // -------------------------------------------------------------------------
  // Print results
  // -------------------------------------------------------------------------

  console.log("");
  console.log("Owner:", owner);
  console.log("Agent:", agent);
  console.log(
    "Expiry:",
    expiry.toString()
  );
  console.log("Paused:", paused);
  console.log(
    "Trust tier:",
    trustTier.toString()
  );
  console.log(
    "Maximum trust tier:",
    maxTrustTier.toString()
  );
  console.log(
    "Payments to next tier:",
    paymentsToNextTier.toString()
  );
  console.log(
    "Vault balance:",
    balance.toString()
  );

  // -------------------------------------------------------------------------
  // Assertions
  // -------------------------------------------------------------------------

  const expectedOwner =
    "0x45776f032ccf3B37aeE679D4fb1301196F954781";

  const expectedAgent =
    "0x158803c33E417c241e002280Acd6d4c90D7656dF";

  if (
    owner.toLowerCase() !==
    expectedOwner.toLowerCase()
  ) {
    throw new Error(
      `Owner mismatch. Expected ${expectedOwner}, got ${owner}`
    );
  }

  if (
    agent.toLowerCase() !==
    expectedAgent.toLowerCase()
  ) {
    throw new Error(
      `Agent mismatch. Expected ${expectedAgent}, got ${agent}`
    );
  }

  if (paused) {
    throw new Error(
      "Vault is unexpectedly paused."
    );
  }

  if (maxTrustTier !== 3n) {
    throw new Error(
      `Unexpected max trust tier: ${maxTrustTier}`
    );
  }

  if (trustTier !== 0n) {
    throw new Error(
      `Unexpected initial trust tier: ${trustTier}`
    );
  }

  console.log("");
  console.log("=================================");
  console.log("ON-CHAIN VERIFICATION PASSED");
  console.log("=================================");
}

main().catch((error) => {
  console.error("");
  console.error("Verification failed:");
  console.error(error);
  process.exitCode = 1;
});