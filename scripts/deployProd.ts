import hre, { ethers } from "hardhat";
import "dotenv/config";
import {
  Crowdsale__factory,
} from "../typechain-types/factories/contracts";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой краудсейла в mainnet
  //деплой скриптом npx hardhat run --network mainnetBSC .\scripts\deployProd.ts
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS!
  );

  const recepient = process.env.RECEPIENT_ADDRESS!;

  let usdtAddress = process.env.ADDRESS_USDT!;
  let usdcAddress = process.env.ADDRESS_USDC!;
  let busdAddress = process.env.ADDRESS_BUSD!;
  let lizaAddress = process.env.LIZACOIN_ADDRESS!;
  let oracleAddress = process.env.ADDRESS_BNBUSD_ORACLE!;
  let crowdsaleAddress = "";

  const crowdsale = await new Crowdsale__factory(deployer).deploy(
    lizaAddress,
    usdtAddress,
    usdcAddress,
    busdAddress,
    oracleAddress,
    recepient
  );
  await crowdsale.waitForDeployment();
  crowdsaleAddress = await crowdsale.getAddress();

  const lzcAmount = ethers.parseEther("30000");
  const priceInUsd = ethers.parseEther("7");

  const lizaCoin = StandardBEP20__factory.connect(lizaAddress, deployer);

  await (
    await lizaCoin.approve(await crowdsale.getAddress(), lzcAmount)
  ).wait();

  await crowdsale.init(lzcAmount, priceInUsd);

  await sleep(5 * 1000);

  try {
    await hre.run("verify:verify", {
      address: crowdsaleAddress,
      contract: "contracts/Crowdsale.sol:Crowdsale",
      constructorArguments: [
        await lizaCoin.getAddress(),
        usdtAddress,
        usdcAddress,
        busdAddress,
        oracleAddress,
        recepient,
      ],
    });
  } catch (e) {
    //console.log(e);
  }

  console.log("Crowdsale deployed to:", crowdsaleAddress);
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
