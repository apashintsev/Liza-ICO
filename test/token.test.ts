import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AggregatorV3Fake__factory,
  Crowdsale__factory,
  USDT__factory,
} from "../typechain-types/factories/contracts";
import { USDT } from "../typechain-types/contracts/USDT";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

enum Asset {
  USDT,
  USDC,
  BUSD,
  BNB,
}

describe("Tests", () => {
  const deploy = async () => {
    const [deployer, user1, user2, user3, feeReceiver, recepient] =
      await ethers.getSigners();

    const bnbusd = await new AggregatorV3Fake__factory(deployer).deploy();
    await bnbusd.waitForDeployment();

    await (await bnbusd.setCost(24613374000)).wait(); //246,13374000

    const usdt = await new USDT__factory(deployer).deploy();
    await usdt.waitForDeployment();

    const usdc = await new USDT__factory(deployer).deploy();
    await usdc.waitForDeployment();

    const busd = await new USDT__factory(deployer).deploy();
    await busd.waitForDeployment();

    const lizaCoin = await new StandardBEP20__factory(deployer).deploy(
      "LZC",
      "LZC",
      18,
      100000000000000000000000n,
      ethers.ZeroAddress
    );
    await lizaCoin.waitForDeployment();

    const crowdsale = await new Crowdsale__factory(deployer).deploy(
      await lizaCoin.getAddress(),
      await usdt.getAddress(),
      await usdc.getAddress(),
      await busd.getAddress(),
      await bnbusd.getAddress(),
      recepient
    );
    await crowdsale.waitForDeployment();

    const lzcAmount = ethers.parseEther("30000");
    const priceInUsd = ethers.parseEther("7");

    await (
      await lizaCoin.approve(await crowdsale.getAddress(), lzcAmount)
    ).wait();

    await crowdsale.init(lzcAmount, priceInUsd);

    return {
      usdt,
      usdc,
      busd,
      bnbusd,
      crowdsale,
      deployer,
      user1,
      user2,
      user3,
      recepient,
      lizaCoin,
    };
  };
  
  it("All deployed correctly and start settings is right", async () => {
    const { deployer, crowdsale, lizaCoin } = await loadFixture(deploy);

    expect(await crowdsale.owner()).eq(deployer.address);
    expect(await crowdsale.currentPriceInUsd()).eq(ethers.parseEther("7"));
    expect(await lizaCoin.balanceOf(await crowdsale.getAddress())).eq(
      ethers.parseEther("30000")
    );
  });

  it("Peview LZC amount correct", async () => {
    const { deployer, crowdsale, lizaCoin } = await loadFixture(deploy);

    const usdtCount7 = ethers.parseEther("7");
    const usdtCount14 = ethers.parseEther("14");
    const usdtCount17 = ethers.parseEther("17");

    const bnbAmount1 = ethers.parseEther("1");
    const bnbAmount05 = ethers.parseEther("0.5");

    expect(await crowdsale.getLzcAmount(usdtCount7, Asset.USDT)).eq(
      ethers.parseEther("1")
    );
    expect(await crowdsale.getLzcAmount(usdtCount14, Asset.USDT)).eq(
      ethers.parseEther("2")
    );
    expect(await crowdsale.getLzcAmount(usdtCount17, Asset.USDT)).eq(
      ethers.parseEther("2")
    );

    expect(await crowdsale.getLzcAmount(bnbAmount1, Asset.BNB)).eq(
      ethers.parseEther("35")
    );
    expect(await crowdsale.getLzcAmount(bnbAmount05, Asset.BNB)).eq(
      ethers.parseEther("17")
    );

    expect(await crowdsale.getLzcPriceInBnb()).eq(28439823000292442n);

    expect(await crowdsale.getLzcAmount(28439823000292443n, Asset.BNB)).eq(
      ethers.parseEther("1")
    );
  });

  it("Buy LZC for token", async () => {
    const { deployer, crowdsale, lizaCoin, user1, usdt, recepient } =
      await loadFixture(deploy);
    const amount500 = ethers.parseEther("500");
    await mintToUser(usdt, user1.address, amount500);

    await incAllowance(usdt, user1, await crowdsale.getAddress(), amount500);

    await crowdsale.connect(user1).buy(ethers.parseEther("35"), Asset.USDT);

    expect(await crowdsale.balances(user1)).eq(ethers.parseEther("5"));
    expect(await usdt.balanceOf(recepient)).eq(ethers.parseEther("35"));
  });

  it("Buy LZC for token with return", async () => {
    const { deployer, crowdsale, lizaCoin, user1, usdt, recepient } =
      await loadFixture(deploy);
    const amount500 = ethers.parseEther("500");
    await mintToUser(usdt, user1.address, amount500);

    await incAllowance(usdt, user1, await crowdsale.getAddress(), amount500);

    await crowdsale.connect(user1).buy(ethers.parseEther("40"), Asset.USDT);

    expect(await crowdsale.balances(user1)).eq(ethers.parseEther("5"));
    expect(await usdt.balanceOf(recepient)).eq(ethers.parseEther("35"));
    expect(await usdt.balanceOf(user1)).eq(ethers.parseEther("465"));
  });

  it("Buy all LZC for token", async () => {
    const { deployer, crowdsale, lizaCoin, user1, user2, usdt, recepient } =
      await loadFixture(deploy);
    const amount500 = ethers.parseEther("500000000000000");
    await mintToUser(usdt, user1.address, amount500);
    await incAllowance(usdt, user1, await crowdsale.getAddress(), amount500);
    const amount5000 = ethers.parseEther("7") * 5000n;

    for (let i = 0; i < 5; i++) {
      await crowdsale.connect(user1).buy(amount5000, Asset.USDT);
    }

    await crowdsale
      .connect(user1)
      .buy(ethers.parseEther("7") * 4999n, Asset.USDT);

    expect(await crowdsale.balances(user1)).eq(ethers.parseEther("29999"));
    expect(await lizaCoin.balanceOf(recepient)).eq(ethers.parseEther("1"));
    expect(await crowdsale.isFinished()).eq(true);
  });

  it("Claim", async () => {
    const { deployer, crowdsale, lizaCoin, user1, user2, usdt, recepient } =
      await loadFixture(deploy);
    const amount500 = ethers.parseEther("500000000000000");
    await mintToUser(usdt, user1.address, amount500);
    await incAllowance(usdt, user1, await crowdsale.getAddress(), amount500);
    const amount5000 = ethers.parseEther("7") * 5000n;

    for (let i = 0; i < 5; i++) {
      await crowdsale.connect(user1).buy(amount5000, Asset.USDT);
    }

    await crowdsale
      .connect(user1)
      .buy(ethers.parseEther("7") * 4999n, Asset.USDT);

    await crowdsale.connect(user1).claim();

    expect(await lizaCoin.balanceOf(user1)).eq(ethers.parseEther("29999"));
  });
  it("Buy LZC for bnb", async () => {
    const { deployer, crowdsale, lizaCoin, user1, usdt, recepient } =
      await loadFixture(deploy);
    const amount = 28439823000292443n * 5n;
    const balanceOfRecepientBefore = await ethers.provider.getBalance(
      recepient
    );
    await crowdsale.connect(user1).buy(amount, Asset.BNB, { value: amount });

    expect(await crowdsale.balances(user1)).eq(ethers.parseEther("5"));
    expect(await ethers.provider.getBalance(recepient)).eq(
      balanceOfRecepientBefore + amount - 5n
    );
  });
});
async function incAllowance(
  usdt: USDT,
  player: HardhatEthersSigner,
  pool: string,
  betAmount: bigint
) {
  const allowToPool = await usdt.connect(player).approve(pool, betAmount);
  await allowToPool.wait();
}

async function mintToUser(usdt: USDT, address: string, amount: bigint) {
  const mintTx = await usdt.mint(address, amount);
  const mintTxGasUsed = await mintTx.wait();
}
