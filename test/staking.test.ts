import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Staking__factory } from "../typechain-types/factories/contracts";
import { USDT } from "../typechain-types/contracts/USDT";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Tests", () => {
  const deploy = async () => {
    const [deployer, user1, user2, user3] = await ethers.getSigners();

    const lizaCoin = await new StandardBEP20__factory(deployer).deploy(
      "LZC",
      "LZC",
      18,
      100000000000000000000000n,
      ethers.ZeroAddress
    );
    await lizaCoin.waitForDeployment();

    const staking = await new Staking__factory(deployer).deploy(
      await lizaCoin.getAddress(),
      await lizaCoin.getAddress()
    );
    await staking.waitForDeployment();

    const lzcAmount = ethers.parseEther("1000");

    await (
      await lizaCoin.transfer(await staking.getAddress(), lzcAmount)
    ).wait();
    await (await lizaCoin.transfer(user1, lzcAmount)).wait();
    await (await lizaCoin.transfer(user2, lzcAmount)).wait();
    await (await lizaCoin.transfer(user3, lzcAmount)).wait();

    return {
      staking,
      deployer,
      user1,
      user2,
      user3,
      lizaCoin,
    };
  };

  it("All deployed correctly and start settings is right", async () => {
    const { deployer, staking, lizaCoin, user1, user2, user3 } =
      await loadFixture(deploy);

    expect(await lizaCoin.balanceOf(await staking.getAddress())).eq(
      ethers.parseEther("1000")
    );
    expect(await lizaCoin.balanceOf(user1.address)).eq(
      ethers.parseEther("1000")
    );
    expect(await lizaCoin.balanceOf(user1.address)).eq(
      ethers.parseEther("1000")
    );
    expect(await lizaCoin.balanceOf(user1.address)).eq(
      ethers.parseEther("1000")
    );
  });

  it("Stake for 30 days", async () => {
    const { deployer, staking, lizaCoin, user1 } = await loadFixture(deploy);

    const stakeAmount = ethers.parseEther("100");

    await lizaCoin
      .connect(user1)
      .approve(await staking.getAddress(), stakeAmount);

    expect(await lizaCoin.allowance(user1, await staking.getAddress())).eq(
      stakeAmount
    );

    await staking.connect(user1).stake(stakeAmount, 30 * 24 * 60 * 60); // Stake for 30 days

    const user1StakesCount = await staking.getStakesCount(user1.address);
    expect(user1StakesCount).to.equal(1);

    const user1Stake = await staking.stakes(user1.address, 0);
    expect(user1Stake.amount).to.equal(stakeAmount);
    expect(user1Stake.stakingDuration).to.equal(30 * 24 * 60 * 60);

    const stakingTokenBalance = await lizaCoin.balanceOf(
      await staking.getAddress()
    );
    expect(stakingTokenBalance).to.equal(ethers.parseEther("1100")); // 1000 + 100

    const user1StakingTokenBalance = await lizaCoin.balanceOf(user1.address);
    expect(user1StakingTokenBalance).to.equal(ethers.parseEther("900")); // 1000 - 100
  });

  it("Stake for 30 days, claim before date", async () => {
    const { deployer, staking, lizaCoin, user1 } = await loadFixture(deploy);

    const stakeAmount = ethers.parseEther("100");

    await lizaCoin
      .connect(user1)
      .approve(await staking.getAddress(), stakeAmount);

    await staking.connect(user1).stake(stakeAmount, 30 * 24 * 60 * 60); // Stake for 30 days
    // Переместим время на 3 дня вперёд
    await time.increase(3 * 24 * 60 * 60);

    const user1StakingBalanceBeforeUnstake = await lizaCoin.balanceOf(
      user1.address
    );
    const stakingTokenBalanceBeforeUnstake = await lizaCoin.balanceOf(
      await staking.getAddress()
    );

    await staking.connect(user1).unstake(0);

    const user1StakingBalanceAfterUnstake = await lizaCoin.balanceOf(
      user1.address
    );
    const stakingTokenBalanceAfterUnstake = await lizaCoin.balanceOf(
      await staking.getAddress()
    );

    // Проверяем, что средства возвращаются без вознаграждения
    expect(user1StakingBalanceAfterUnstake).to.equal(
      user1StakingBalanceBeforeUnstake + stakeAmount
    );
    expect(stakingTokenBalanceAfterUnstake).to.equal(
      stakingTokenBalanceBeforeUnstake - stakeAmount
    );
  });

  it("Stake for 30 days, claim after date", async () => {
    const { deployer, staking, lizaCoin, user1 } = await loadFixture(deploy);

    const stakeAmount = ethers.parseEther("100");

    await lizaCoin
      .connect(user1)
      .approve(await staking.getAddress(), stakeAmount);

    await staking.connect(user1).stake(stakeAmount, 30 * 24 * 60 * 60); // Stake for 30 days
    // Переместим время на 30 дня вперёд
    await time.increase(30 * 24 * 60 * 60 + 1);

    const user1StakingBalanceBeforeUnstake = await lizaCoin.balanceOf(
      user1.address
    );
    const stakingTokenBalanceBeforeUnstake = await lizaCoin.balanceOf(
      await staking.getAddress()
    );

    await staking.connect(user1).unstake(0);

    const user1StakingBalanceAfterUnstake = await lizaCoin.balanceOf(
      user1.address
    );
    const stakingTokenBalanceAfterUnstake = await lizaCoin.balanceOf(
      await staking.getAddress()
    );
    const dailyReward = (stakeAmount * 20n) / 100_000n;
    const reward = dailyReward * 30n;
    // Проверяем, что средства возвращаются c вознаграждением
    expect(user1StakingBalanceAfterUnstake).to.equal(
      user1StakingBalanceBeforeUnstake + stakeAmount + reward
    );
    expect(stakingTokenBalanceAfterUnstake).to.equal(
      stakingTokenBalanceBeforeUnstake - stakeAmount - reward
    );
  });
});
