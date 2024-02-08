import hre, { ethers } from "hardhat";
import "dotenv/config";
import {
  Payment__factory,
  Staking__factory,
} from "../typechain-types/factories/contracts";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой стейкинга в тестнет
  //деплой скриптом npx hardhat run --network mainnetBSC .\scripts\deployPaymentProd.ts
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS!
  );
  const recepient = process.env.RECEPIENT_ADDRESS!;

  let usdtAddress = process.env.ADDRESS_USDT!;
  let usdcAddress = process.env.ADDRESS_USDC!;
  let busdAddress = process.env.ADDRESS_BUSD!;
  let lizaAddress = process.env.LIZACOIN_ADDRESS!;

  const payment = await new Payment__factory(deployer).deploy(
    lizaAddress,
    "0x195Fd94c0cC5Bdfdaed4253066A7257281cFFA43",
    usdtAddress,
    usdcAddress,
    busdAddress,
    recepient
  );
  await payment.waitForDeployment();

  await sleep(5 * 1000);

  const paymentAddress = await payment.getAddress();
  try {
    await hre.run("verify:verify", {
      address: paymentAddress,
      contract: "contracts/Payment.sol:Payment",
      constructorArguments: [
        lizaAddress,
        "0x195Fd94c0cC5Bdfdaed4253066A7257281cFFA43",
        usdtAddress,
        usdcAddress,
        busdAddress,
        recepient,
      ],
    });
  } catch (e) {
    console.log(e);
  }

  console.log("Payment deployed to:", paymentAddress);
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
