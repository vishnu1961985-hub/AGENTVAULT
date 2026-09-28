import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=================================");
  console.log("AgentVault MST Testnet Deployment");
  console.log("=================================");

  console.log("Deployer / Owner:", deployer.address);

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

  if (
    agentAddress === ethers.ZeroAddress
  ) {
    throw new Error(
      "AGENT_ADDRESS cannot be zero address"
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

  // -----------------------------------------------------------------------
  // Deploy Factory
  // -----------------------------------------------------------------------

  const AgentVaultFactory =
    await ethers.getContractFactory(
      "AgentVaultFactory"
    );

  console.log(
    "Deploying AgentVaultFactory..."
  );

  const factory =
    await AgentVaultFactory.deploy();

  const factoryDeploymentTx =
    factory.deploymentTransaction();

  if (factoryDeploymentTx) {
    console.log(
      "Factory deployment transaction:",
      factoryDeploymentTx.hash
    );
  }

  await factory.waitForDeployment();

  const factoryAddress =
    await factory.getAddress();

  console.log(
    "AgentVaultFactory address:",
    factoryAddress
  );

  // -----------------------------------------------------------------------
  // Create AgentVault through Factory
  // -----------------------------------------------------------------------

  console.log(
    "Creating AgentVault through Factory..."
  );

  const createTx =
    await factory.createVault(
      agentAddress,
      expiry
    );

  console.log(
    "Vault creation transaction:",
    createTx.hash
  );

  await createTx.wait();

  // -----------------------------------------------------------------------
  // Read created vault
  // -----------------------------------------------------------------------

  const vaultAddress =
    await factory.getVault(
      deployer.address
    );

  if (
    vaultAddress === ethers.ZeroAddress
  ) {
    throw new Error(
      "Factory did not create a vault for the owner"
    );
  }

  console.log(
    "AgentVault address:",
    vaultAddress
  );

  // -----------------------------------------------------------------------
  // Connect to created vault
  // -----------------------------------------------------------------------

  const vault =
    await ethers.getContractAt(
      "AgentVault",
      vaultAddress
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
    "Vault registered in factory:",
    await factory.getVault(
      deployer.address
    )
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

  console.log("");
  console.log("FINAL DEPLOYMENT INFORMATION");
  console.log("---------------------------------");
  console.log(
    "AgentVaultFactory:",
    factoryAddress
  );
  console.log(
    "AgentVault:",
    vaultAddress
  );
  console.log(
    "Owner:",
    deployer.address
  );
  console.log(
    "Agent:",
    agentAddress
  );
  console.log(
    "Vault creation TX:",
    createTx.hash
  );
  console.log("---------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});