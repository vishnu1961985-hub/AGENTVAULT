import { network } from "hardhat";

const { ethers } = await network.create();

const VAULT_ADDRESS =
  "0x746392d55268c859cBf16bcc8b7902615D2be8b1";

const MOCK_MERCHANT_ADDRESS =
  "0xD141f9dB830C3733F62aB09dECB41EA893B6418F";

const DAILY_LIMIT =
  ethers.parseEther("5");

const PER_TRANSACTION_MAX =
  ethers.parseEther("1");

const FUNDING_AMOUNT =
  ethers.parseEther("5");

async function main() {
  console.log("=================================");
  console.log("AgentVault Live Demo Setup");
  console.log("=================================");

  const [owner] =
    await ethers.getSigners();

  console.log(
    "Owner:",
    owner.address
  );

  console.log(
    "Vault:",
    VAULT_ADDRESS
  );

  console.log(
    "MockMerchant:",
    MOCK_MERCHANT_ADDRESS
  );

  const vault =
    await ethers.getContractAt(
      "AgentVault",
      VAULT_ADDRESS
    );

  // -----------------------------------------------------------------------
  // Verify ownership
  // -----------------------------------------------------------------------

  const vaultOwner =
    await vault.owner();

  if (
    vaultOwner.toLowerCase() !==
    owner.address.toLowerCase()
  ) {
    throw new Error(
      `Owner mismatch.\nVault owner: ${vaultOwner}\nSigner: ${owner.address}`
    );
  }

  console.log("Owner verification: OK");

  // -----------------------------------------------------------------------
  // Verify configured agent
  // -----------------------------------------------------------------------

  console.log(
    "Configured agent:",
    await vault.agent()
  );

  // -----------------------------------------------------------------------
  // Set daily limit
  // -----------------------------------------------------------------------

  console.log("");
  console.log(
    "Setting daily limit to 5 MSTC..."
  );

  const dailyLimitTx =
    await vault
      .connect(owner)
      .setDailyLimit(
        DAILY_LIMIT
      );

  await dailyLimitTx.wait();

  console.log(
    "Daily-limit configuration TX:",
    dailyLimitTx.hash
  );

  // -----------------------------------------------------------------------
  // Set per-transaction maximum
  // -----------------------------------------------------------------------

  console.log("");
  console.log(
    "Setting per-transaction maximum to 1 MSTC..."
  );

  const perTransactionTx =
    await vault
      .connect(owner)
      .setPerTransactionMax(
        PER_TRANSACTION_MAX
      );

  await perTransactionTx.wait();

  console.log(
    "Per-transaction-limit configuration TX:",
    perTransactionTx.hash
  );

  // -----------------------------------------------------------------------
  // Approve MockMerchant
  // -----------------------------------------------------------------------

  console.log("");
  console.log(
    "Approving MockMerchant..."
  );

  const approvalTx =
    await vault
      .connect(owner)
      .setRecipientApproval(
        MOCK_MERCHANT_ADDRESS,
        true
      );

  await approvalTx.wait();

  console.log(
    "Recipient-approval TX:",
    approvalTx.hash
  );

  // -----------------------------------------------------------------------
  // Fund vault
  // -----------------------------------------------------------------------

  const currentBalance =
    await vault.getVaultBalance();

  console.log("");
  console.log(
    "Current vault balance:",
    currentBalance.toString()
  );

  if (
    currentBalance <
    FUNDING_AMOUNT
  ) {
    const amountToFund =
      FUNDING_AMOUNT -
      currentBalance;

    console.log(
      "Funding vault with:",
      amountToFund.toString()
    );

    const fundingTx =
      await owner.sendTransaction({
        to: VAULT_ADDRESS,
        value: amountToFund,
      });

    await fundingTx.wait();

    console.log(
      "Vault funding TX:",
      fundingTx.hash
    );
  } else {
    console.log(
      "Vault already has sufficient balance."
    );
  }

  // -----------------------------------------------------------------------
  // Read final configuration
  // -----------------------------------------------------------------------

  console.log("");
  console.log(
    "FINAL LIVE DEMO CONFIGURATION"
  );
  console.log("---------------------------------");

  console.log(
    "Vault:",
    VAULT_ADDRESS
  );

  console.log(
    "Agent:",
    await vault.agent()
  );

  console.log(
    "Daily limit:",
    (
      await vault.dailyLimit()
    ).toString()
  );

  console.log(
    "Per-transaction max:",
    (
      await vault.perTransactionMax()
    ).toString()
  );

  console.log(
    "MockMerchant approved:",
    await vault.approvedRecipient(
      MOCK_MERCHANT_ADDRESS
    )
  );

  console.log(
    "Vault balance:",
    (
      await vault.getVaultBalance()
    ).toString()
  );

  console.log("---------------------------------");

  console.log("");
  console.log(
    "================================="
  );
  console.log(
    "LIVE DEMO SETUP COMPLETE"
  );
  console.log(
    "================================="
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "Live demo setup failed:"
  );
  console.error(error);
  process.exitCode = 1;
});