import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=================================");
  console.log("AgentVault MST Testnet Deployment");
  console.log("=================================");

  console.log("Owner:", deployer.address);

  const agentAddress = process.env.AGENT_ADDRESS;

  if (!agentAddress) {
    throw new Error(
      "AGENT_ADDRESS environment variable is required"
    );
  }

  if (!ethers.isAddress(agentAddress)) {
    throw new Error(
      `Invalid AGENT_ADDRESS: ${agentAddress}`
    );
  }

  console.log("Agent:", agentAddress);

  const latestBlock =
    await ethers.provider.getBlock("latest");

  if (!latestBlock) {
    throw new Error(
      "Could not read latest block"
    );
  }

  // Vault expires 7 days after deployment.
  const expiry =
    BigInt(latestBlock.timestamp) +
    7n * 24n * 60n * 60n;

  console.log(
    "Latest block:",
    latestBlock.number
  );

  console.log(
    "Expiry:",
    expiry.toString()
  );

  const AgentVault =
    await ethers.getContractFactory(
      "AgentVault"
    );

  console.log("Deploying AgentVault...");

  const vault =
    await AgentVault.deploy(
      agentAddress,
      expiry
    );

  const deploymentTx =
    vault.deploymentTransaction();

  if (deploymentTx) {
    console.log(
      "Deployment transaction:",
      deploymentTx.hash
    );
  }

  await vault.waitForDeployment();

  const address =
    await vault.getAddress();

  console.log(
    "AgentVault address:",
    address
  );

  console.log(
    "Owner:",
    await vault.owner()
  );

  console.log(
    "Agent:",
    await vault.agent()
  );

  console.log(
    "Expiry:",
    (await vault.expiry()).toString()
  );

  console.log(
    "Trust tier:",
    (await vault.trustTier()).toString()
  );

  console.log(
    "Maximum trust tier:",
    (await vault.maxTrustTier()).toString()
  );

  console.log(
    "================================="
  );
  console.log(
    "Deployment completed successfully."
  );
  console.log(
    "================================="
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});