import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("AgentVault", function () {
  it("sets the owner and authorized agent when deployed", async function () {
    const [owner, agent] = await ethers.getSigners();

    const AgentVault = await ethers.getContractFactory("AgentVault");
    const vault = await AgentVault.deploy(agent.address, 2000000000n);

    expect(await vault.owner()).to.equal(owner.address);
    expect(await vault.agent()).to.equal(agent.address);
    expect(await vault.expiry()).to.equal(2000000000n);
    expect(await vault.paused()).to.equal(false);
  });

  it("allows only the owner to pause and unpause the vault", async function () {
    const [owner, agent, other] = await ethers.getSigners();

    const AgentVault = await ethers.getContractFactory("AgentVault");
    const vault = await AgentVault.deploy(agent.address, 2000000000n);

    expect(await vault.paused()).to.equal(false);

    await vault.connect(owner).pause();
    expect(await vault.paused()).to.equal(true);

    await vault.connect(owner).unpause();
    expect(await vault.paused()).to.equal(false);

    await expect(
      vault.connect(agent).pause()
    ).to.be.revertedWith("Not owner");

    await expect(
      vault.connect(other).pause()
    ).to.be.revertedWith("Not owner");
  });
});