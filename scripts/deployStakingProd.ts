import hre, { ethers } from "hardhat";
import "dotenv/config";
import { Staking__factory } from "../typechain-types/factories/contracts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой стейкинга в mainnet
  //деплой скриптом npx hardhat run --network mainnetBSC  .\scripts\deployStakingProd.ts
  const accounts = await ethers.getSigners();
  const deployer = accounts.find(
    (x) => x.address == process.env.DEPLOYER_ADDRESS!
  );

  let lizaAddress = process.env.LIZACOIN_ADDRESS!;

  const staking = await new Staking__factory(deployer).deploy(
    lizaAddress,
    lizaAddress
  );
  await staking.waitForDeployment();

  await sleep(5 * 1000);

  try {
    await hre.run("verify:verify", {
      address: await staking.getAddress(),
      contract: "contracts/Staking.sol:Staking",
      constructorArguments: [lizaAddress, lizaAddress],
    });
  } catch (e) {
    //console.log(e);
  }

  console.log("Staking deployed to:", await staking.getAddress());
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
