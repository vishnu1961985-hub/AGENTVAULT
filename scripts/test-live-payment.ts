import { network } from "hardhat";

const { ethers } = await network.create();

const VAULT_ADDRESS =
  "0x3112eFAdca90b8feb1F55d8602542B6F6517e088";

async function main() {
  console.log("=================================");
  console.log("AgentVault Live Payment Test");
  console.log("=================================");

  // -------------------------------------------------------------------------
  // Signers
  // -------------------------------------------------------------------------

  const [owner] = await ethers.getSigners();

  const agentPrivateKey =
    process.env.AGENT_PRIVATE_KEY;

  if (!agentPrivateKey) {
    throw new Error(
      "AGENT_PRIVATE_KEY environment variable is required"
    );
  }

  const agent =
    new ethers.Wallet(
      agentPrivateKey,
      ethers.provider
    );

  console.log("Vault:", VAULT_ADDRESS);
  console.log("Owner:", owner.address);
  console.log("Agent:", agent.address);

  // -------------------------------------------------------------------------
  // Connect to deployed vault
  // -------------------------------------------------------------------------

  const AgentVault =
    await ethers.getContractFactory("AgentVault");

  const vault =
    AgentVault.attach(VAULT_ADDRESS);

  // -------------------------------------------------------------------------
  // Check configured agent
  // -------------------------------------------------------------------------

  const configuredAgent =
    await vault.agent();

  if (
    configuredAgent.toLowerCase() !==
    agent.address.toLowerCase()
  ) {
    throw new Error(
      `Agent mismatch.\nConfigured: ${configuredAgent}\nSigner: ${agent.address}`
    );
  }

  console.log("Agent configuration: OK");

  // -------------------------------------------------------------------------
  // Check balances
  // -------------------------------------------------------------------------

  const ownerBalanceBefore =
    await ethers.provider.getBalance(
      owner.address
    );

  const agentBalance =
    await ethers.provider.getBalance(
      agent.address
    );

  const vaultBalanceBefore =
    await vault.getVaultBalance();

  console.log(
    "Owner balance:",
    ownerBalanceBefore.toString()
  );

  console.log(
    "Agent balance:",
    agentBalance.toString()
  );

  console.log(
    "Vault balance:",
    vaultBalanceBefore.toString()
  );

  // -------------------------------------------------------------------------
  // Use owner as the recipient for this smoke test.
  //
  // This avoids needing another private key just to verify the payment path.
  // -------------------------------------------------------------------------

  const recipient =
    owner.address;

  console.log(
    "Recipient:",
    recipient
  );

  // -------------------------------------------------------------------------
  // Configure recipient
  // -------------------------------------------------------------------------

  console.log(
    "Approving recipient..."
  );

  const approvalTx =
    await vault
      .connect(owner)
      .setRecipientApproval(
        recipient,
        true
      );

  await approvalTx.wait();

  console.log(
    "Recipient approved:",
    approvalTx.hash
  );

  // -------------------------------------------------------------------------
  // Configure Tier 0 limit
  // -------------------------------------------------------------------------

  const paymentAmount =
    ethers.parseEther("1");

  await (
    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        paymentAmount
      )
  ).wait();

  console.log(
    "Tier 0 daily limit configured."
  );

  // -------------------------------------------------------------------------
  // Fund vault
  // -------------------------------------------------------------------------

  const requiredVaultBalance =
    paymentAmount;

  const vaultBalance =
    await vault.getVaultBalance();

  if (
    vaultBalance <
    requiredVaultBalance
  ) {
    const amountToFund =
      requiredVaultBalance -
      vaultBalance;

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
  }

  // -------------------------------------------------------------------------
  // Final vault balance
  // -------------------------------------------------------------------------

  const finalVaultBalanceBefore =
    await vault.getVaultBalance();

  console.log(
    "Vault balance before payment:",
    finalVaultBalanceBefore.toString()
  );

  if (
    finalVaultBalanceBefore <
    paymentAmount
  ) {
    throw new Error(
      "Vault does not have enough balance for payment."
    );
  }

  // -------------------------------------------------------------------------
  // Recipient balance before
  // -------------------------------------------------------------------------

  const recipientBefore =
    await ethers.provider.getBalance(
      recipient
    );

  // -------------------------------------------------------------------------
  // Receipt hash
  // -------------------------------------------------------------------------

  const receiptHash =
    ethers.keccak256(
      ethers.toUtf8Bytes(
        `AgentVault live test ${Date.now()}`
      )
    );

  console.log(
    "Receipt hash:",
    receiptHash
  );

  // -------------------------------------------------------------------------
  // Agent executes payment
  // -------------------------------------------------------------------------

  console.log("");
  console.log(
    "Executing live agent payment..."
  );

  const paymentTx =
    await vault
      .connect(agent)
      .pay(
        recipient,
        paymentAmount,
        receiptHash
      );

  console.log(
    "Payment TX:",
    paymentTx.hash
  );

  const receipt =
    await paymentTx.wait();

  console.log(
    "Payment block:",
    receipt?.blockNumber
  );

  // -------------------------------------------------------------------------
  // Read payment record
  // -------------------------------------------------------------------------

  const payment =
    await vault.getPayment(0n);

  console.log("");
  console.log(
    "Payment ID: 0"
  );

  console.log(
    "Payment recipient:",
    payment.recipient
  );

  console.log(
    "Payment amount:",
    payment.amount.toString()
  );

  console.log(
    "Payment receipt hash:",
    payment.receiptHash
  );

  console.log(
    "Payment status:",
    payment.status.toString()
  );

  // Status 0 = Allowed
  if (payment.status !== 0n) {
    throw new Error(
      `Expected Allowed (0), got ${payment.status}`
    );
  }

  // -------------------------------------------------------------------------
  // Recipient balance after
  // -------------------------------------------------------------------------

  const recipientAfter =
    await ethers.provider.getBalance(
      recipient
    );

  console.log("");
  console.log(
    "Recipient balance before:",
    recipientBefore.toString()
  );

  console.log(
    "Recipient balance after:",
    recipientAfter.toString()
  );

  // -------------------------------------------------------------------------
  // Final vault balance
  // -------------------------------------------------------------------------

  const finalVaultBalance =
    await vault.getVaultBalance();

  console.log(
    "Vault balance after:",
    finalVaultBalance.toString()
  );

  // -------------------------------------------------------------------------
  // Verify accounting
  // -------------------------------------------------------------------------

  const spentToday =
    await vault.getSpentToday();

  console.log(
    "Spent today:",
    spentToday.toString()
  );

  if (
    spentToday <
    paymentAmount
  ) {
    throw new Error(
      "Vault spending accounting was not updated."
    );
  }

  console.log("");
  console.log("=================================");
  console.log("LIVE PAYMENT TEST PASSED");
  console.log("=================================");
}

main().catch((error) => {
  console.error("");
  console.error("Live payment test failed:");
  console.error(error);
  process.exitCode = 1;
});
