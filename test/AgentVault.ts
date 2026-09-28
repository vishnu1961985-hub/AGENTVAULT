import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("AgentVault", function () {
  async function deployVault() {
    const [owner, agent, recipient, other] =
      await ethers.getSigners();

    const AgentVault =
      await ethers.getContractFactory("AgentVault");

    const latestBlock =
      await ethers.provider.getBlock("latest");

    const currentTime = latestBlock!.timestamp;

    const expiry =
      currentTime + 7 * 24 * 60 * 60;

    const vault = await AgentVault.deploy(
      agent.address,
      expiry
    );

    await vault.waitForDeployment();

    return {
      vault,
      owner,
      agent,
      recipient,
      other,
      expiry,
    };
  }

  // ============================================================
  // DEPLOYMENT
  // ============================================================

  describe("Deployment", function () {
    it("sets owner, agent, expiry and initial state", async function () {
      const {
        vault,
        owner,
        agent,
        expiry,
      } = await deployVault();

      expect(await vault.owner())
        .to.equal(owner.address);

      expect(await vault.agent())
        .to.equal(agent.address);

      expect(await vault.expiry())
        .to.equal(expiry);

      expect(await vault.paused())
        .to.equal(false);

      expect(await vault.spentToday())
        .to.equal(0);

      expect(await vault.getSpentToday())
        .to.equal(0);

      expect(await vault.nextPaymentId())
        .to.equal(0);
    });
  });

  // ============================================================
  // OWNER CONTROLS
  // ============================================================

  describe("Owner controls", function () {
    it("allows owner to pause and unpause", async function () {
      const { vault, owner } =
        await deployVault();

      await vault
        .connect(owner)
        .pause();

      expect(await vault.paused())
        .to.equal(true);

      await vault
        .connect(owner)
        .unpause();

      expect(await vault.paused())
        .to.equal(false);
    });

    it("prevents non-owner from pausing", async function () {
      const { vault, other } =
        await deployVault();

      await expect(
        vault.connect(other).pause()
      ).to.be.revertedWith("Not owner");
    });

    it("prevents non-owner from unpausing", async function () {
      const {
        vault,
        owner,
        other,
      } = await deployVault();

      await vault
        .connect(owner)
        .pause();

      await expect(
        vault.connect(other).unpause()
      ).to.be.revertedWith("Not owner");
    });

    it("allows owner to set per-transaction maximum", async function () {
      const { vault, owner } =
        await deployVault();

      await vault
        .connect(owner)
        .setPerTransactionMax(100);

      expect(
        await vault.perTransactionMax()
      ).to.equal(100);
    });

    it("prevents non-owner from setting per-transaction maximum", async function () {
      const { vault, other } =
        await deployVault();

      await expect(
        vault
          .connect(other)
          .setPerTransactionMax(100)
      ).to.be.revertedWith("Not owner");
    });

    it("allows owner to set daily limit", async function () {
      const { vault, owner } =
        await deployVault();

      await vault
        .connect(owner)
        .setDailyLimit(500);

      expect(
        await vault.dailyLimit()
      ).to.equal(500);
    });

    it("prevents non-owner from setting daily limit", async function () {
      const { vault, other } =
        await deployVault();

      await expect(
        vault
          .connect(other)
          .setDailyLimit(500)
      ).to.be.revertedWith("Not owner");
    });

    it("allows owner to configure recipient approval", async function () {
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

    it("prevents non-owner from configuring recipient approval", async function () {
      const {
        vault,
        other,
        recipient,
      } = await deployVault();

      await expect(
        vault
          .connect(other)
          .setRecipientApproval(
            recipient.address,
            true
          )
      ).to.be.revertedWith("Not owner");
    });

    it("allows owner to configure recipient cap", async function () {
      const {
        vault,
        owner,
        recipient,
      } = await deployVault();

      await vault
        .connect(owner)
        .setRecipientCap(
          recipient.address,
          250
        );

      expect(
        await vault.recipientCap(
          recipient.address
        )
      ).to.equal(250);
    });

    it("prevents non-owner from configuring recipient cap", async function () {
      const {
        vault,
        other,
        recipient,
      } = await deployVault();

      await expect(
        vault
          .connect(other)
          .setRecipientCap(
            recipient.address,
            250
          )
      ).to.be.revertedWith("Not owner");
    });

    it("allows owner to set approval threshold", async function () {
      const { vault, owner } =
        await deployVault();

      await vault
        .connect(owner)
        .setApprovalThreshold(100);

      expect(
        await vault.approvalThreshold()
      ).to.equal(100);
    });

    it("prevents non-owner from setting approval threshold", async function () {
      const { vault, other } =
        await deployVault();

      await expect(
        vault
          .connect(other)
          .setApprovalThreshold(100)
      ).to.be.revertedWith("Not owner");
    });
  });

  // ============================================================
  // VAULT ACTIVITY
  // ============================================================

  describe("Vault activity", function () {
    it("is active after deployment", async function () {
      const { vault } =
        await deployVault();

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

    it("becomes inactive after expiry", async function () {
      const { vault } =
        await deployVault();

      await ethers.provider.send(
        "evm_increaseTime",
        [7 * 24 * 60 * 60 + 1]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      expect(
        await vault.isActive()
      ).to.equal(false);
    });
  });

  // ============================================================
  // PAYMENT AUTHORIZATION
  // ============================================================

  describe("Payment authorization", function () {
    it("blocks unauthorized caller", async function () {
      const {
        vault,
        other,
        recipient,
      } = await deployVault();

      const receiptHash =
        ethers.id("unauthorized-payment");

      await expect(
        vault
          .connect(other)
          .pay(
            recipient.address,
            10,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          other.address,
          recipient.address,
          10,
          1,
          1,
          receiptHash
        );

      expect(
        await vault.nextPaymentId()
      ).to.equal(1);
    });

    it("allows authorized agent to continue through payment checks", async function () {
      const {
        vault,
        agent,
        recipient,
      } = await deployVault();

      const receiptHash =
        ethers.id("agent-payment");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            10,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          10,
          1,
          4,
          receiptHash
        );
    });
  });

  // ============================================================
  // VAULT STATE CHECKS
  // ============================================================

  describe("Vault state checks", function () {
    it("blocks payment when paused", async function () {
      const {
        vault,
        owner,
        agent,
        recipient,
      } = await deployVault();

      await vault
        .connect(owner)
        .pause();

      const receiptHash =
        ethers.id("paused-payment");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            10,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          10,
          1,
          2,
          receiptHash
        );
    });

    it("blocks payment after expiry", async function () {
      const {
        vault,
        agent,
        recipient,
      } = await deployVault();

      await ethers.provider.send(
        "evm_increaseTime",
        [7 * 24 * 60 * 60 + 1]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      const receiptHash =
        ethers.id("expired-payment");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            10,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          10,
          1,
          3,
          receiptHash
        );
    });
  });

  // ============================================================
  // RECIPIENT ALLOWLIST
  // ============================================================

  describe("Recipient allowlist", function () {
    it("blocks unapproved recipient", async function () {
      const {
        vault,
        agent,
        recipient,
      } = await deployVault();

      const receiptHash =
        ethers.id("unapproved-recipient");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            10,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          10,
          1,
          4,
          receiptHash
        );
    });

    it("allows payment to approved recipient", async function () {
      const {
        vault,
        owner,
        agent,
        recipient,
      } = await deployVault();

      await vault
        .connect(owner)
        .setRecipientApproval(
          recipient.address,
          true
        );

      const receiptHash =
        ethers.id("approved-recipient");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            10,
            receiptHash
          )
      )
        .to.emit(vault, "Allowed")
        .withArgs(
          0,
          recipient.address,
          10,
          receiptHash
        );
    });
  });

  // ============================================================
  // PER TRANSACTION MAXIMUM
  // ============================================================

  describe("Per-transaction maximum", function () {
    it("blocks payment exceeding transaction maximum", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setPerTransactionMax(100);

      const receiptHash =
        ethers.id("transaction-too-large");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            101,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          101,
          1,
          5,
          receiptHash
        );

      expect(
        await vault.spentToday()
      ).to.equal(0);
    });
  });

  // ============================================================
  // DAILY LIMIT
  // ============================================================

  describe("Daily spending limit", function () {
    it("initializes daily spending correctly", async function () {
      const { vault } =
        await deployVault();

      expect(
        await vault.spentToday()
      ).to.equal(0);

      expect(
        await vault.getSpentToday()
      ).to.equal(0);
    });

    it("accumulates spending on same day", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setDailyLimit(1000);

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          100,
          ethers.id("payment-1")
        );

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          200,
          ethers.id("payment-2")
        );

      expect(
        await vault.getSpentToday()
      ).to.equal(300);
    });

    it("blocks payment exceeding daily limit", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setDailyLimit(250);

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          200,
          ethers.id("payment-1")
        );

      const receiptHash =
        ethers.id("daily-limit-exceeded");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            100,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          100,
          1,
          6,
          receiptHash
        );

      expect(
        await vault.getSpentToday()
      ).to.equal(200);
    });

    it("returns zero after a new day", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setDailyLimit(1000);

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          200,
          ethers.id("payment")
        );

      expect(
        await vault.getSpentToday()
      ).to.equal(200);

      await ethers.provider.send(
        "evm_increaseTime",
        [24 * 60 * 60]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      expect(
        await vault.getSpentToday()
      ).to.equal(0);
    });
  });

  // ============================================================
  // RECIPIENT CAP
  // ============================================================

  describe("Recipient cap", function () {
    it("blocks payment exceeding recipient cap", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setRecipientCap(
          recipient.address,
          50
        );

      const receiptHash =
        ethers.id("recipient-cap-exceeded");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            100,
            receiptHash
          )
      )
        .to.emit(vault, "PaymentDecision")
        .withArgs(
          agent.address,
          recipient.address,
          100,
          1,
          7,
          receiptHash
        );

      expect(
        await vault.getSpentToday()
      ).to.equal(0);
    });
  });

  // ============================================================
  // APPROVAL THRESHOLD
  // ============================================================

  describe("Approval threshold", function () {
    it("stores approval threshold", async function () {
      const {
        vault,
        owner,
      } = await deployVault();

      await vault
        .connect(owner)
        .setApprovalThreshold(100);

      expect(
        await vault.approvalThreshold()
      ).to.equal(100);
    });

    it("marks payment as pending above approval threshold", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setApprovalThreshold(100);

      const receiptHash =
        ethers.id("pending-payment");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            200,
            receiptHash
          )
      )
        .to.emit(vault, "Pending")
        .withArgs(
          0,
          recipient.address,
          200,
          receiptHash
        );

      const payment =
        await vault.getPayment(0);

      expect(payment[0])
        .to.equal(recipient.address);

      expect(payment[1])
        .to.equal(200);

      expect(payment[2])
        .to.equal(receiptHash);

      expect(payment[3])
        .to.equal(2);

      expect(
        await vault.getSpentToday()
      ).to.equal(0);
    });

    it("emits Pending for payment above threshold", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setApprovalThreshold(100);

      const receiptHash =
        ethers.id("pending-result");

      await expect(
        vault
          .connect(agent)
          .pay(
            recipient.address,
            200,
            receiptHash
          )
      )
        .to.emit(vault, "Pending")
        .withArgs(
          0,
          recipient.address,
          200,
          receiptHash
        );
    });

    it("does not spend daily limit while pending", async function () {
      const {
        vault,
        owner,
        agent,
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
        .setApprovalThreshold(100);

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          200,
          ethers.id("pending")
        );

      expect(
        await vault.getSpentToday()
      ).to.equal(0);
    });
  });

  // ============================================================
  // PENDING APPROVAL
  // ============================================================

  describe("Pending approval", function () {
    async function createPendingPayment() {
      const {
        vault,
        owner,
        agent,
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
        .setApprovalThreshold(100);

      const receiptHash =
        ethers.id("pending-approval");

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          200,
          receiptHash
        );

      return {
        vault,
        owner,
        agent,
        recipient,
        receiptHash,
      };
    }

    it("allows owner to approve pending payment", async function () {
      const {
        vault,
        owner,
      } = await createPendingPayment();

      await expect(
        vault
          .connect(owner)
          .approvePayment(0)
      )
        .to.emit(vault, "PendingApproved")
        .withArgs(0);

      const payment =
        await vault.getPayment(0);

      expect(payment[3])
        .to.equal(0);

      expect(
        await vault.getSpentToday()
      ).to.equal(200);

      await expect(
        vault
          .connect(owner)
          .approvePayment(0)
      )
        .to.be.revertedWith("Not pending");
    });

    it("prevents non-owner from approving pending payment", async function () {
      const {
        vault,
        agent,
      } = await createPendingPayment();

      await expect(
        vault
          .connect(agent)
          .approvePayment(0)
      )
        .to.be.revertedWith("Not owner");
    });

    it("emits Allowed when owner approves pending payment", async function () {
      const {
        vault,
        owner,
        recipient,
        receiptHash,
      } = await createPendingPayment();

      await expect(
        vault
          .connect(owner)
          .approvePayment(0)
      )
        .to.emit(vault, "Allowed")
        .withArgs(
          0,
          recipient.address,
          200,
          receiptHash
        );
    });
  });

  // ============================================================
  // PENDING REJECTION
  // ============================================================

  describe("Pending rejection", function () {
    async function createPendingPayment() {
      const {
        vault,
        owner,
        agent,
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
        .setApprovalThreshold(100);

      const receiptHash =
        ethers.id("pending-rejection");

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          200,
          receiptHash
        );

      return {
        vault,
        owner,
        agent,
        recipient,
        receiptHash,
      };
    }

    it("allows owner to reject pending payment", async function () {
      const {
        vault,
        owner,
      } = await createPendingPayment();

      await expect(
        vault
          .connect(owner)
          .rejectPayment(0)
      )
        .to.emit(vault, "PendingRejected")
        .withArgs(0);

      const payment =
        await vault.getPayment(0);

      expect(payment[3])
        .to.equal(1);

      expect(
        await vault.getSpentToday()
      ).to.equal(0);
    });

    it("prevents non-owner from rejecting pending payment", async function () {
      const {
        vault,
        agent,
      } = await createPendingPayment();

      await expect(
        vault
          .connect(agent)
          .rejectPayment(0)
      )
        .to.be.revertedWith("Not owner");
    });

    it("emits Blocked when owner rejects pending payment", async function () {
      const {
        vault,
        owner,
        recipient,
        receiptHash,
      } = await createPendingPayment();

      await expect(
        vault
          .connect(owner)
          .rejectPayment(0)
      )
        .to.emit(vault, "Blocked")
        .withArgs(
          0,
          recipient.address,
          200,
          0,
          receiptHash
        );
    });

    it("cannot reject an already rejected payment", async function () {
      const {
        vault,
        owner,
      } = await createPendingPayment();

      await vault
        .connect(owner)
        .rejectPayment(0);

      await expect(
        vault
          .connect(owner)
          .rejectPayment(0)
      )
        .to.be.revertedWith("Not pending");
    });
  });

  // ============================================================
  // PAYMENT RECORDS
  // ============================================================

  describe("Payment records", function () {
    it("stores an allowed payment", async function () {
      const {
        vault,
        owner,
        agent,
        recipient,
      } = await deployVault();

      await vault
        .connect(owner)
        .setRecipientApproval(
          recipient.address,
          true
        );

      const receiptHash =
        ethers.id("allowed-payment");

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          50,
          receiptHash
        );

      const payment =
        await vault.getPayment(0);

      expect(payment[0])
        .to.equal(recipient.address);

      expect(payment[1])
        .to.equal(50);

      expect(payment[2])
        .to.equal(receiptHash);

      expect(payment[3])
        .to.equal(0);
    });

    it("increments payment IDs", async function () {
      const {
        vault,
        owner,
        agent,
        recipient,
      } = await deployVault();

      await vault
        .connect(owner)
        .setRecipientApproval(
          recipient.address,
          true
        );

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          10,
          ethers.id("payment-1")
        );

      await vault
        .connect(agent)
        .pay(
          recipient.address,
          20,
          ethers.id("payment-2")
        );

      expect(
        await vault.nextPaymentId()
      ).to.equal(2);

      expect(
        (await vault.getPayment(0))[1]
      ).to.equal(10);

      expect(
        (await vault.getPayment(1))[1]
      ).to.equal(20);
    });
  });
});