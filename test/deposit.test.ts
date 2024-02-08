import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  Payment__factory,
  Staking__factory,
} from "../typechain-types/factories/contracts";
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

    const payment = await new Payment__factory(deployer).deploy(
      await lizaCoin.getAddress(),
      deployer.address
    );
    await payment.waitForDeployment();

    const lzcAmount = ethers.parseEther("1000");

    return {
      payment,
      deployer,
      user1,
      user2,
      user3,
      lizaCoin,
    };
  };

  it("All deployed correctly and start settings is right", async () => {
    const { deployer, payment, lizaCoin, user1, user2, user3 } =
      await loadFixture(deploy);

    await lizaCoin.approve(await payment.getAddress(), ethers.MaxUint256);

    await payment.deposit(100);
  });
});
