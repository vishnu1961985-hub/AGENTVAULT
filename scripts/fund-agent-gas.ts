import { network } from "hardhat";

const { ethers } = await network.create();

const AGENT_ADDRESS =
  "0x2D839D4A1c471A7FC3458bBBA020B53b3Bc4BD92";

const GAS_AMOUNT =
  ethers.parseEther("0.01");

async function main() {
  const [owner] = await ethers.getSigners();

  console.log("=================================");
  console.log("Fund Agent Wallet for Gas");
  console.log("=================================");

  console.log("Sender:", owner.address);
  console.log("Agent:", AGENT_ADDRESS);
  console.log(
    "Amount:",
    ethers.formatEther(GAS_AMOUNT),
    "MST"
  );

  const balanceBefore =
    await ethers.provider.getBalance(
      AGENT_ADDRESS
    );

  console.log(
    "Agent balance before:",
    ethers.formatEther(balanceBefore),
    "MST"
  );

  const tx =
    await owner.sendTransaction({
      to: AGENT_ADDRESS,
      value: GAS_AMOUNT,
    });

  console.log(
    "Gas funding TX:",
    tx.hash
  );

  await tx.wait();

  const balanceAfter =
    await ethers.provider.getBalance(
      AGENT_ADDRESS
    );

  console.log(
    "Agent balance after:",
    ethers.formatEther(balanceAfter),
    "MST"
  );

  console.log("=================================");
  console.log("AGENT GAS FUNDING COMPLETE");
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});