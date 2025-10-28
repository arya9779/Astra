import hre from "hardhat";

async function main() {
  console.log("Available in hre:", Object.keys(hre));
  console.log("Available in hre.viem:", hre.viem ? Object.keys(hre.viem) : "viem not available");
  
  try {
    const accounts = await hre.ethers.getSigners();
    console.log("Ethers signers available:", accounts.length);
  } catch (error) {
    console.log("Ethers not available:", error.message);
  }
}

main();