import hre, { ethers } from "hardhat";
import "dotenv/config";
import { Staking__factory } from "../typechain-types/factories/contracts";
import { StandardBEP20__factory } from "../typechain-types/factories/contracts/StandardBEP20.sol";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  //Деплой стейкинга в тестнет
  //деплой скриптом npx hardhat run --network testnetBSC  .\scripts\deployStaking.ts
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

  const staking = await new Staking__factory(deployer).deploy(
    await lizaCoin.getAddress(),
    await lizaCoin.getAddress()
  );
  await staking.waitForDeployment();

  const lzcAmount = ethers.parseEther("1000");

  await (await lizaCoin.transfer(await staking.getAddress(), lzcAmount)).wait();
  await (
    await lizaCoin.transfer(
      "0x78E4cc313C7ECdD2f86C0A3ac9AbeD26FCcFfF70",
      lzcAmount
    )
  ).wait();

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
      address: await staking.getAddress(),
      contract: "contracts/Staking.sol:Staking",
      constructorArguments: [
        await lizaCoin.getAddress(),
        await lizaCoin.getAddress(),
      ],
    });
  } catch (e) {
    //console.log(e);
  }

  console.log("Liza Token deployed to:", lizaAddress);
  console.log("Staking deployed to:", await staking.getAddress());
  console.log("All deployed.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
