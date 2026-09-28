import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("AgentVaultFactory", function () {
  async function deployFactory() {
    const Factory =
      await ethers.getContractFactory(
        "AgentVaultFactory"
      );

    const factory =
      await Factory.deploy();

    await factory.waitForDeployment();

    return factory;
  }

  async function getFutureExpiry() {
    const latestBlock =
      await ethers.provider.getBlock(
        "latest"
      );

    if (!latestBlock) {
      throw new Error(
        "Could not read latest block"
      );
    }

    return (
      BigInt(latestBlock.timestamp) +
      7n * 24n * 60n * 60n
    );
  }

  // -------------------------------------------------------------------------
  // Deployment
  // -------------------------------------------------------------------------

  it("deploys successfully", async function () {
    const factory =
      await deployFactory();

    expect(
      await factory.getAddress()
    ).to.not.equal(
      ethers.ZeroAddress
    );
  });

  // -------------------------------------------------------------------------
  // Vault creation
  // -------------------------------------------------------------------------

  it("creates a vault for the caller", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner)
      .createVault(
        agent.address,
        expiry
      );

    const vaultAddress =
      await factory.vaultByOwner(
        owner.address
      );

    expect(vaultAddress).to.not.equal(
      ethers.ZeroAddress
    );
  });

  it("returns the created vault through getVault", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner)
      .createVault(
        agent.address,
        expiry
      );

    const vaultFromMapping =
      await factory.vaultByOwner(
        owner.address
      );

    const vaultFromGetter =
      await factory.getVault(
        owner.address
      );

    expect(
      vaultFromGetter
    ).to.equal(
      vaultFromMapping
    );
  });

  it("sets the vault owner to the caller", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner)
      .createVault(
        agent.address,
        expiry
      );

    const vaultAddress =
      await factory.getVault(
        owner.address
      );

    const AgentVault =
      await ethers.getContractFactory(
        "AgentVault"
      );

    const vault =
      AgentVault.attach(
        vaultAddress
      );

    expect(
      await vault.owner()
    ).to.equal(
      owner.address
    );
  });

  it("sets the vault agent correctly", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner)
      .createVault(
        agent.address,
        expiry
      );

    const vaultAddress =
      await factory.getVault(
        owner.address
      );

    const AgentVault =
      await ethers.getContractFactory(
        "AgentVault"
      );

    const vault =
      AgentVault.attach(
        vaultAddress
      );

    expect(
      await vault.agent()
    ).to.equal(
      agent.address
    );
  });

  it("sets the vault expiry correctly", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner)
      .createVault(
        agent.address,
        expiry
      );

    const vaultAddress =
      await factory.getVault(
        owner.address
      );

    const AgentVault =
      await ethers.getContractFactory(
        "AgentVault"
      );

    const vault =
      AgentVault.attach(
        vaultAddress
      );

    expect(
      await vault.expiry()
    ).to.equal(
      expiry
    );
  });

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  it("emits VaultCreated", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await expect(
      factory
        .connect(owner)
        .createVault(
          agent.address,
          expiry
        )
    ).to.emit(
      factory,
      "VaultCreated"
    );
  });

  // -------------------------------------------------------------------------
  // Multiple owners
  // -------------------------------------------------------------------------

  it("allows different owners to create different vaults", async function () {
    const [
      owner1,
      owner2,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner1)
      .createVault(
        agent.address,
        expiry
      );

    await factory
      .connect(owner2)
      .createVault(
        agent.address,
        expiry
      );

    const vault1 =
      await factory.getVault(
        owner1.address
      );

    const vault2 =
      await factory.getVault(
        owner2.address
      );

    expect(vault1).to.not.equal(
      ethers.ZeroAddress
    );

    expect(vault2).to.not.equal(
      ethers.ZeroAddress
    );

    expect(vault1).to.not.equal(
      vault2
    );
  });

  // -------------------------------------------------------------------------
  // One vault per owner
  // -------------------------------------------------------------------------

  it("prevents the same owner from creating a second vault", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await factory
      .connect(owner)
      .createVault(
        agent.address,
        expiry
      );

    await expect(
      factory
        .connect(owner)
        .createVault(
          agent.address,
          expiry
        )
    ).to.be.revertedWith(
      "Vault already exists"
    );
  });

  // -------------------------------------------------------------------------
  // Unknown owner
  // -------------------------------------------------------------------------

  it("returns zero address for an owner without a vault", async function () {
    const [
      owner,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    expect(
      await factory.getVault(
        owner.address
      )
    ).to.equal(
      ethers.ZeroAddress
    );
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it("rejects the zero agent address", async function () {
    const [
      owner,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const expiry =
      await getFutureExpiry();

    await expect(
      factory
        .connect(owner)
        .createVault(
          ethers.ZeroAddress,
          expiry
        )
    ).to.be.revertedWith(
      "Invalid agent"
    );
  });

  it("rejects an expired vault", async function () {
    const [
      owner,
      agent,
    ] = await ethers.getSigners();

    const factory =
      await deployFactory();

    const latestBlock =
      await ethers.provider.getBlock(
        "latest"
      );

    if (!latestBlock) {
      throw new Error(
        "Could not read latest block"
      );
    }

    const expired =
      BigInt(latestBlock.timestamp) - 1n;

    await expect(
      factory
        .connect(owner)
        .createVault(
          agent.address,
          expired
        )
    ).to.be.revertedWith(
      "Invalid expiry"
    );
  });
});