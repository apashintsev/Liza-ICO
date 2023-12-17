import hre, { ethers } from "hardhat";
import "dotenv/config";
import {
  AggregatorV3Fake__factory,
  Crowdsale__factory,
  USDT__factory,
} from "../typechain-types/factories/contracts";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой краудсейла в тестнет
  //деплой скриптом npx hardhat run --network testnetBSC  .\scripts\deploy.ts
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS!
  );

  const recepient = process.env.RECEPIENT_ADDRESS!;

  let usdtAddress = "";
  let lizaAddress = "";
  let crowdsaleAddress = "";

  const bnbusd = await new AggregatorV3Fake__factory(deployer).deploy();
  await bnbusd.waitForDeployment();

  await(await bnbusd.setCost(24613374000)).wait(); //246,13374000

  const usdt = await new USDT__factory(deployer).deploy();
  await usdt.waitForDeployment();
  usdtAddress = await usdt.getAddress();

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
  lizaAddress = await lizaCoin.getAddress();

  const crowdsale = await new Crowdsale__factory(deployer).deploy(
    await lizaCoin.getAddress(),
    await usdt.getAddress(),
    await usdc.getAddress(),
    await busd.getAddress(),
    await bnbusd.getAddress(),
    recepient
  );
  await crowdsale.waitForDeployment();
  crowdsaleAddress = await crowdsale.getAddress();

  const lzcAmount = ethers.parseEther("30000");
  const priceInUsd = ethers.parseEther("7");

  await(await lizaCoin.approve(await crowdsale.getAddress(), lzcAmount)).wait();

  await crowdsale.init(lzcAmount, priceInUsd);

  await sleep(5 * 1000);

  try {
    await hre.run("verify:verify", {
      address: lizaAddress,
      contract: "contracts/StandardBEP20.sol:StandardBEP20",
      constructorArguments: [
        "LZC",
        "LZC",
        18,
        100000000000000000000000n,
        ethers.ZeroAddress,
      ],
    });
  } catch (e) {
    //console.log(e);
  }

  try {
    await hre.run("verify:verify", {
      address: crowdsaleAddress,
      contract: "contracts/Crowdsale.sol:Crowdsale",
      constructorArguments: [
        await lizaCoin.getAddress(),
        await usdt.getAddress(),
        await usdc.getAddress(),
        await busd.getAddress(),
        await bnbusd.getAddress(),
        recepient,
      ],
    });
  } catch (e) {
    //console.log(e);
  }

  try {
    await hre.run("verify:verify", {
      address: usdtAddress,
      contract: "contracts/USDT.sol:USDT",
      constructorArguments: [],
    });
  } catch (e) {
    //console.log(e);
  }
  try {
    await hre.run("verify:verify", {
      address: await usdc.getAddress(),
      contract: "contracts/USDT.sol:USDT",
      constructorArguments: [],
    });
  } catch (e) {
    //console.log(e);
  }
  try {
    await hre.run("verify:verify", {
      address: await busd.getAddress(),
      contract: "contracts/USDT.sol:USDT",
      constructorArguments: [],
    });
  } catch (e) {
    //console.log(e);
  }
  console.log("Liza Token deployed to:", lizaAddress);
  console.log("Crowdsale deployed to:", crowdsaleAddress);
  console.log("USDT deplyed to: " + usdtAddress);
  console.log("USDC deplyed to: " + (await usdc.getAddress()));
  console.log("BUSD deplyed to: " + (await busd.getAddress()));
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
