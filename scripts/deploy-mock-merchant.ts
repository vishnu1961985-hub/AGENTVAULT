import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=================================");
  console.log("MockMerchant MST Testnet Deployment");
  console.log("=================================");

  console.log("Deployer:", deployer.address);

  const MockMerchant =
    await ethers.getContractFactory("MockMerchant");

  console.log("Deploying MockMerchant...");

  const merchant =
    await MockMerchant.deploy();

  const deploymentTx =
    merchant.deploymentTransaction();

  if (deploymentTx) {
    console.log(
      "Deployment transaction:",
      deploymentTx.hash
    );
  }

  await merchant.waitForDeployment();

  const merchantAddress =
    await merchant.getAddress();

  console.log(
    "MockMerchant address:",
    merchantAddress
  );

  console.log(
    "Merchant balance:",
    (
      await ethers.provider.getBalance(
        merchantAddress
      )
    ).toString()
  );

  console.log("=================================");
  console.log("Deployment completed successfully.");
  console.log("=================================");

  console.log("");
  console.log("FINAL MOCK MERCHANT INFORMATION");
  console.log("---------------------------------");
  console.log(
    "MockMerchant:",
    merchantAddress
  );
  console.log(
    "Deployment TX:",
    deploymentTx?.hash ?? "unknown"
  );
  console.log(
    "Deployer:",
    deployer.address
  );
  console.log("---------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});