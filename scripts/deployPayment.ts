import hre, { ethers } from "hardhat";
import "dotenv/config";
import { Payment__factory, Staking__factory } from "../typechain-types/factories/contracts";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой стейкинга в тестнет
  //деплой скриптом npx hardhat run --network mumbai  .\scripts\deployPayment.ts
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS!
  );

  let lizaAddress = "";

  const lizaCoin = await new StandardBEP20__factory(deployer).deploy(
    "LZC",
    "LZC",
    18,
    100000000000000000000000n,
    ethers.ZeroAddress
  );
  await lizaCoin.waitForDeployment();
  lizaAddress = await lizaCoin.getAddress();

  const payment = await new Payment__factory(deployer).deploy(
    await lizaCoin.getAddress(),
    deployer?.address!
  );
  await payment.waitForDeployment();

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
      address: await payment.getAddress(),
      contract: "contracts/Payment.sol:Payment",
      constructorArguments: [
        await lizaCoin.getAddress(),
        deployer?.address!
      ],
    });
  } catch (e) {
    //console.log(e);
  }

  console.log("Liza Token deployed to:", lizaAddress);
  console.log("Payment deployed to:", await payment.getAddress());
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
