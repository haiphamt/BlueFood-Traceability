import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");

  const Factory = await ethers.getContractFactory("BatchRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("BatchRegistry deployed to:", address);
  console.log("\nCập nhật .env.local:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
