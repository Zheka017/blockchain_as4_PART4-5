const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Task 6: Mini DeFi Lending Pool", function () {
  let pool, token;
  let owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy token with 1M supply
    const TokenFactory = await ethers.getContractFactory("TestToken");
    token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy lending pool
    const PoolFactory = await ethers.getContractFactory("MiniLendingPool");
    pool = await PoolFactory.deploy(await token.getAddress());
    await pool.waitForDeployment();

    // Distribute tokens
    const userSupply = ethers.parseEther("10000");
    await token.transfer(alice.address, userSupply);
    await token.transfer(bob.address, userSupply);
    await token.transfer(charlie.address, userSupply);

    // Approve pool to spend tokens
    await token.connect(alice).approve(await pool.getAddress(), ethers.MaxUint256);
    await token.connect(bob).approve(await pool.getAddress(), ethers.MaxUint256);
    await token.connect(charlie).approve(await pool.getAddress(), ethers.MaxUint256);
  });

  describe("Deposit Functionality", function () {
    it("Should allow user to deposit tokens", async function () {
      const amount = ethers.parseEther("100");
      const tx = await pool.connect(alice).deposit(amount);
      const receipt = await tx.wait();
      console.log("✅ Deposit tx hash:", receipt.hash);


      const balance = await pool.deposited(alice.address);
      expect(balance).to.equal(amount);
    });

    it("Should track multiple deposits", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");

      await pool.connect(alice).deposit(amount1);
      await pool.connect(alice).deposit(amount2);

      const balance = await pool.deposited(alice.address);
      expect(balance).to.equal(amount1 + amount2);
    });

    it("Should update pool token balance", async function () {
      const amount = ethers.parseEther("100");
      await pool.connect(alice).deposit(amount);

      const poolBalance = await token.balanceOf(await pool.getAddress());
      expect(poolBalance).to.equal(amount);
    });

    it("Should reject zero deposit", async function () {
      await expect(pool.connect(alice).deposit(0)).to.be.reverted;
    });
  });

  describe("Withdrawal Functionality", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      await pool.connect(alice).deposit(amount);
    });

    it("Should allow user to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("30");
      await pool.connect(alice).withdraw(withdrawAmount);

      const balance = await pool.deposited(alice.address);
      expect(balance).to.equal(ethers.parseEther("70"));
    });

    it("Should revert on insufficient balance", async function () {
      const withdrawAmount = ethers.parseEther("150");
      await expect(pool.connect(alice).withdraw(withdrawAmount)).to.be.reverted;
    });

    it("Should reject zero withdrawal", async function () {
      await expect(pool.connect(alice).withdraw(0)).to.be.reverted;
    });

    it("Should allow full withdrawal", async function () {
      const fullAmount = ethers.parseEther("100");
      await pool.connect(alice).withdraw(fullAmount);

      const balance = await pool.deposited(alice.address);
      expect(balance).to.equal(0);
    });
  });

  describe("Multiple Users", function () {
    it("Should handle multiple user deposits correctly", async function () {
      const aliceAmount = ethers.parseEther("100");
      const bobAmount = ethers.parseEther("200");
      const charlieAmount = ethers.parseEther("150");

      await pool.connect(alice).deposit(aliceAmount);
      await pool.connect(bob).deposit(bobAmount);
      await pool.connect(charlie).deposit(charlieAmount);

      expect(await pool.deposited(alice.address)).to.equal(aliceAmount);
      expect(await pool.deposited(bob.address)).to.equal(bobAmount);
      expect(await pool.deposited(charlie.address)).to.equal(charlieAmount);
    });

    it("Should track total deposited correctly", async function () {
      const aliceAmount = ethers.parseEther("100");
      const bobAmount = ethers.parseEther("200");

      await pool.connect(alice).deposit(aliceAmount);
      await pool.connect(bob).deposit(bobAmount);

      const total = await pool.totalDeposited();
      expect(total).to.equal(aliceAmount + bobAmount);
    });

    it("Should handle mixed deposits and withdrawals", async function () {
      await pool.connect(alice).deposit(ethers.parseEther("100"));
      await pool.connect(bob).deposit(ethers.parseEther("200"));
      await pool.connect(alice).withdraw(ethers.parseEther("30"));
      await pool.connect(bob).withdraw(ethers.parseEther("50"));

      const aliceBalance = await pool.deposited(alice.address);
      const bobBalance = await pool.deposited(bob.address);
      const total = await pool.totalDeposited();

      expect(aliceBalance).to.equal(ethers.parseEther("70"));
      expect(bobBalance).to.equal(ethers.parseEther("150"));
      expect(total).to.equal(ethers.parseEther("220"));
    });
  });

  describe("Pool Consistency", function () {
    it("Should maintain token balance consistency", async function () {
      const amount = ethers.parseEther("100");
      await pool.connect(alice).deposit(amount);

      const poolTokenBalance = await token.balanceOf(await pool.getAddress());
      const trackedTotal = await pool.totalDeposited();

      expect(poolTokenBalance).to.equal(trackedTotal);
    });

    it("Should maintain consistency after withdrawals", async function () {
      await pool.connect(alice).deposit(ethers.parseEther("100"));
      await pool.connect(bob).deposit(ethers.parseEther("200"));
      
      await pool.connect(alice).withdraw(ethers.parseEther("30"));
      await pool.connect(bob).withdraw(ethers.parseEther("50"));

      const poolTokenBalance = await token.balanceOf(await pool.getAddress());
      const trackedTotal = await pool.totalDeposited();

      expect(poolTokenBalance).to.equal(trackedTotal);
      expect(trackedTotal).to.equal(ethers.parseEther("220"));
    });
  });

  describe("Events", function () {
    it("Should function without revert on deposit", async function () {
      const amount = ethers.parseEther("100");
      await expect(pool.connect(alice).deposit(amount)).not.to.be.reverted;
    });

    it("Should function without revert on withdrawal", async function () {
      await pool.connect(alice).deposit(ethers.parseEther("100"));
      const withdrawAmount = ethers.parseEther("30");
      await expect(pool.connect(alice).withdraw(withdrawAmount)).not.to.be.reverted;
    });
  });
});
