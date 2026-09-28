import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("AgentVault", function () {
  async function deployVault() {
    const [
      owner,
      agent,
      recipient,
      anotherRecipient,
      stranger,
    ] = await ethers.getSigners();

    const latestBlock = await ethers.provider.getBlock("latest");

    if (!latestBlock) {
      throw new Error("Could not read latest block");
    }

    const expiry =
      BigInt(latestBlock.timestamp) +
      7n * 24n * 60n * 60n;

    const AgentVault =
      await ethers.getContractFactory("AgentVault");

    const vault = await AgentVault.deploy(
      owner.address,
      agent.address,
      expiry
    );

    await vault.waitForDeployment();

    return {
      vault,
      owner,
      agent,
      recipient,
      anotherRecipient,
      stranger,
      expiry,
    };
  }

  async function allowRecipient(
    vault: any,
    owner: any,
    recipient: any
  ) {
    await vault
      .connect(owner)
      .setRecipientApproval(
        recipient.address,
        true
      );
  }

  async function setTierLimit(
    vault: any,
    owner: any,
    limit: bigint
  ) {
    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        limit
      );
  }

  async function fundVault(
    vault: any,
    owner: any,
    amount: bigint
  ) {
    await owner.sendTransaction({
      to: await vault.getAddress(),
      value: amount,
    });
  }

  async function preparePayment(
    vault: any,
    owner: any,
    recipient: any,
    amount: bigint = 1000n
  ) {
    await allowRecipient(
      vault,
      owner,
      recipient
    );

    const tierLimit =
      amount > 1000n
        ? amount
        : 1000n;

    await setTierLimit(
      vault,
      owner,
      tierLimit
    );

    await fundVault(
      vault,
      owner,
      amount
    );
  }

  // -------------------------------------------------------------------------
  // Deployment
  // -------------------------------------------------------------------------

  it("sets the correct owner", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    expect(
      await vault.owner()
    ).to.equal(owner.address);
  });

  it("sets the correct agent", async function () {
    const {
      vault,
      agent,
    } = await deployVault();

    expect(
      await vault.agent()
    ).to.equal(agent.address);
  });

  it("sets the expiry", async function () {
    const {
      vault,
      expiry,
    } = await deployVault();

    expect(
      await vault.expiry()
    ).to.equal(expiry);
  });

  it("starts unpaused", async function () {
    const {
      vault,
    } = await deployVault();

    expect(
      await vault.paused()
    ).to.equal(false);
  });

  it("starts at trust tier zero", async function () {
    const {
      vault,
    } = await deployVault();

    expect(
      await vault.trustTier()
    ).to.equal(0n);
  });

  it("sets the default maximum trust tier", async function () {
    const {
      vault,
    } = await deployVault();

    expect(
      await vault.maxTrustTier()
    ).to.equal(3n);
  });

  // -------------------------------------------------------------------------
  // Active state
  // -------------------------------------------------------------------------

  it("is active after deployment", async function () {
    const {
      vault,
    } = await deployVault();

    expect(
      await vault.isActive()
    ).to.equal(true);
  });

  it("becomes inactive when paused", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .pause();

    expect(
      await vault.isActive()
    ).to.equal(false);
  });

  it("becomes active again after unpause", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .pause();

    await vault
      .connect(owner)
      .unpause();

    expect(
      await vault.isActive()
    ).to.equal(true);
  });

  // -------------------------------------------------------------------------
  // Owner controls
  // -------------------------------------------------------------------------

  it("allows owner to pause", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .pause();

    expect(
      await vault.paused()
    ).to.equal(true);
  });

  it("allows owner to unpause", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .pause();

    await vault
      .connect(owner)
      .unpause();

    expect(
      await vault.paused()
    ).to.equal(false);
  });

  it("prevents non-owner from pausing", async function () {
    const {
      vault,
      stranger,
    } = await deployVault();

    await expect(
      vault
        .connect(stranger)
        .pause()
    ).to.be.revertedWith("Not owner");
  });

  it("allows owner to set per transaction maximum", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setPerTransactionMax(500n);

    expect(
      await vault.perTransactionMax()
    ).to.equal(500n);
  });

  it("allows owner to set daily limit", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setDailyLimit(1000n);

    expect(
      await vault.dailyLimit()
    ).to.equal(1000n);
  });

  it("allows owner to set approval threshold", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setApprovalThreshold(250n);

    expect(
      await vault.approvalThreshold()
    ).to.equal(250n);
  });

  // -------------------------------------------------------------------------
  // Recipient allowlist
  // -------------------------------------------------------------------------

  it("allows owner to approve a recipient", async function () {
    const {
      vault,
      owner,
      recipient,
    } = await deployVault();

    await vault
      .connect(owner)
      .setRecipientApproval(
        recipient.address,
        true
      );

    expect(
      await vault.approvedRecipient(
        recipient.address
      )
    ).to.equal(true);
  });

  it("allows owner to remove a recipient", async function () {
    const {
      vault,
      owner,
      recipient,
    } = await deployVault();

    await vault
      .connect(owner)
      .setRecipientApproval(
        recipient.address,
        true
      );

    await vault
      .connect(owner)
      .setRecipientApproval(
        recipient.address,
        false
      );

    expect(
      await vault.approvedRecipient(
        recipient.address
      )
    ).to.equal(false);
  });

  it("allows owner to configure a recipient cap", async function () {
    const {
      vault,
      owner,
      recipient,
    } = await deployVault();

    await vault
      .connect(owner)
      .setRecipientCap(
        recipient.address,
        500n
      );

    expect(
      await vault.recipientCap(
        recipient.address
      )
    ).to.equal(500n);
  });

  // -------------------------------------------------------------------------
  // Authorization
  // -------------------------------------------------------------------------

  it("rejects payment calls from unauthorized callers", async function () {
    const {
      vault,
      stranger,
      recipient,
    } = await deployVault();

    await expect(
      vault
        .connect(stranger)
        .pay(
          recipient.address,
          10n,
          ethers.keccak256(
            ethers.toUtf8Bytes("receipt")
          )
        )
    ).to.be.revertedWith("Not agent");
  });

  // -------------------------------------------------------------------------
  // Payment blocking
  // -------------------------------------------------------------------------

  it("blocks payment to a non-approved recipient", async function () {
    const {
      vault,
      agent,
      recipient,
    } = await deployVault();

    const receiptHash =
      ethers.keccak256(
        ethers.toUtf8Bytes("blocked")
      );

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          10n,
          receiptHash
        )
    ).to.emit(vault, "Blocked");
  });

  it("blocks payment when the vault is paused", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        1000n
      );

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .pause();

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          10n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Blocked");
  });

  it("blocks payment above the transaction maximum", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    await vault
      .connect(owner)
      .setPerTransactionMax(100n);

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          200n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Blocked");
  });

  it("blocks payment above the daily limit", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      100n
    );

    await fundVault(
      vault,
      owner,
      1000n
    );

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          101n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Blocked");
  });

  it("blocks payment above the recipient cap", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    await vault
      .connect(owner)
      .setRecipientCap(
        recipient.address,
        100n
      );

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          200n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Blocked");
  });

  it("blocks payment when balance is insufficient", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    // Raise the Tier 0 limit so the test reaches
    // the balance check instead of the daily-limit check.
    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        2000n
      );

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          1000n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Blocked");
  });

  // -------------------------------------------------------------------------
  // Allowed payment
  // -------------------------------------------------------------------------

  it("transfers funds to recipient", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    const before =
      await ethers.provider.getBalance(
        recipient.address
      );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        300n,
        ethers.ZeroHash
      );

    const after =
      await ethers.provider.getBalance(
        recipient.address
      );

    expect(
      after - before
    ).to.equal(300n);
  });

  it("records an allowed payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          300n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Allowed");
  });

  it("updates spent today after an allowed payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        300n,
        ethers.ZeroHash
      );

    expect(
      await vault.getSpentToday()
    ).to.equal(300n);
  });

  // -------------------------------------------------------------------------
  // Pending payments
  // -------------------------------------------------------------------------

  it("creates a pending payment above approval threshold", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await expect(
      vault
        .connect(agent)
        .pay(
          recipient.address,
          200n,
          ethers.ZeroHash
        )
    ).to.emit(vault, "Pending");

    const payment =
      await vault.getPayment(0n);

    expect(
      payment.recipient
    ).to.equal(recipient.address);

    expect(
      payment.amount
    ).to.equal(200n);

    expect(
      payment.status
    ).to.equal(2n);
  });

  it("does not transfer funds while payment is pending", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    const before =
      await ethers.provider.getBalance(
        recipient.address
      );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    const after =
      await ethers.provider.getBalance(
        recipient.address
      );

    expect(
      after
    ).to.equal(before);
  });

  // -------------------------------------------------------------------------
  // Pending approval
  // -------------------------------------------------------------------------

  it("allows owner to approve pending payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    await expect(
      vault
        .connect(owner)
        .approvePayment(0n)
    ).to.emit(
      vault,
      "PendingApproved"
    );

    const payment =
      await vault.getPayment(0n);

    expect(
      payment.status
    ).to.equal(0n);
  });

  it("transfers funds when pending payment is approved", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    const before =
      await ethers.provider.getBalance(
        recipient.address
      );

    await vault
      .connect(owner)
      .approvePayment(0n);

    const after =
      await ethers.provider.getBalance(
        recipient.address
      );

    expect(
      after - before
    ).to.equal(200n);
  });

  it("prevents non-owner from approving pending payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
      stranger,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    await expect(
      vault
        .connect(stranger)
        .approvePayment(0n)
    ).to.be.revertedWith(
      "Not owner"
    );
  });

  // -------------------------------------------------------------------------
  // Pending rejection
  // -------------------------------------------------------------------------

  it("allows owner to reject pending payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    await expect(
      vault
        .connect(owner)
        .rejectPayment(0n)
    ).to.emit(
      vault,
      "PendingRejected"
    );

    const payment =
      await vault.getPayment(0n);

    expect(
      payment.status
    ).to.equal(1n);
  });

  it("does not transfer funds when pending payment is rejected", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    const before =
      await ethers.provider.getBalance(
        recipient.address
      );

    await vault
      .connect(owner)
      .rejectPayment(0n);

    const after =
      await ethers.provider.getBalance(
        recipient.address
      );

    expect(
      after
    ).to.equal(before);
  });

  it("prevents non-owner from rejecting pending payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
      stranger,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await setTierLimit(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(owner)
      .setApprovalThreshold(100n);

    await fundVault(
      vault,
      owner,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        200n,
        ethers.ZeroHash
      );

    await expect(
      vault
        .connect(stranger)
        .rejectPayment(0n)
    ).to.be.revertedWith(
      "Not owner"
    );
  });

  it("cannot approve a non-pending payment", async function () {
    const {
      vault,
      owner,
      recipient,
    } = await deployVault();

    await allowRecipient(
      vault,
      owner,
      recipient
    );

    await expect(
      vault
        .connect(owner)
        .approvePayment(0n)
    ).to.be.revertedWith(
      "Not pending"
    );
  });

  it("cannot reject a non-pending payment", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await expect(
      vault
        .connect(owner)
        .rejectPayment(0n)
    ).to.be.revertedWith(
      "Not pending"
    );
  });

  // -------------------------------------------------------------------------
  // Receipt hash
  // -------------------------------------------------------------------------

  it("stores the receipt hash", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    const receiptHash =
      ethers.keccak256(
        ethers.toUtf8Bytes(
          "agent decision receipt"
        )
      );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        100n,
        receiptHash
      );

    const payment =
      await vault.getPayment(0n);

    expect(
      payment.receiptHash
    ).to.equal(receiptHash);
  });

  // -------------------------------------------------------------------------
  // Trust tiers
  // -------------------------------------------------------------------------

  it("starts with zero clean payments", async function () {
    const {
      vault,
    } = await deployVault();

    expect(
      await vault.cleanPayments()
    ).to.equal(0n);
  });

  it("increases trust tier after required clean payments", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        10n,
        ethers.ZeroHash
      );

    expect(
      await vault.trustTier()
    ).to.equal(0n);

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        10n,
        ethers.ZeroHash
      );

    expect(
      await vault.trustTier()
    ).to.equal(0n);

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        10n,
        ethers.ZeroHash
      );

    expect(
      await vault.trustTier()
    ).to.equal(1n);
  });

  it("resets trust tier after a blocked payment", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    // Three clean payments move Tier 0 -> Tier 1.
    await vault
      .connect(agent)
      .pay(
        recipient.address,
        10n,
        ethers.ZeroHash
      );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        10n,
        ethers.ZeroHash
      );

    await vault
      .connect(agent)
      .pay(
        recipient.address,
        10n,
        ethers.ZeroHash
      );

    expect(
      await vault.trustTier()
    ).to.equal(1n);

    // Blocked because recipient is not allowlisted.
    await expect(
      vault
        .connect(agent)
        .pay(
          "0x0000000000000000000000000000000000000001",
          10n,
          ethers.ZeroHash
        )
    ).to.emit(
      vault,
      "Blocked"
    );

    expect(
      await vault.trustTier()
    ).to.equal(0n);

    expect(
      await vault.cleanPayments()
    ).to.equal(0n);
  });

  it("does not exceed the maximum trust tier", async function () {
    const {
      vault,
      owner,
      agent,
      recipient,
    } = await deployVault();

    await preparePayment(
      vault,
      owner,
      recipient,
      1000n
    );

    for (let i = 0; i < 20; i++) {
      await vault
        .connect(agent)
        .pay(
          recipient.address,
          10n,
          ethers.ZeroHash
        );
    }

    expect(
      await vault.trustTier()
    ).to.equal(3n);
  });

  it("allows owner to change maximum trust tier", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setMaxTrustTier(5n);

    expect(
      await vault.maxTrustTier()
    ).to.equal(5n);
  });

  it("allows owner to change payments required for next tier", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setPaymentsToNextTier(5n);

    expect(
      await vault.paymentsToNextTier()
    ).to.equal(5n);
  });

  it("allows owner to configure tier daily limit", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setTierDailyLimit(
        1,
        500n
      );

    expect(
      await vault.tierDailyLimit(1n)
    ).to.equal(500n);
  });

  // -------------------------------------------------------------------------
  // Balance
  // -------------------------------------------------------------------------

  it("reports vault balance", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await fundVault(
      vault,
      owner,
      500n
    );

    expect(
      await vault.getVaultBalance()
    ).to.equal(500n);
  });

  // -------------------------------------------------------------------------
  // Effective daily limit
  // -------------------------------------------------------------------------

  it("uses the tier limit when owner daily limit is zero", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setDailyLimit(0n);

    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        100n
      );

    expect(
      await vault.getEffectiveDailyLimit()
    ).to.equal(100n);
  });

  it("uses the owner limit when tier limit is zero", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setDailyLimit(200n);

    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        0n
      );

    expect(
      await vault.getEffectiveDailyLimit()
    ).to.equal(200n);
  });

  it("uses the lower of owner and tier limits", async function () {
    const {
      vault,
      owner,
    } = await deployVault();

    await vault
      .connect(owner)
      .setDailyLimit(200n);

    await vault
      .connect(owner)
      .setTierDailyLimit(
        0,
        100n
      );

    expect(
      await vault.getEffectiveDailyLimit()
    ).to.equal(100n);
  });
});