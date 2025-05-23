const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const SocialMedia = await hre.ethers.getContractFactory("SocialMedia");
  const socialMedia = await SocialMedia.deploy();
  
  // For newer versions of ethers/Hardhat
  await socialMedia.waitForDeployment();
  const socialMediaAddress = await socialMedia.getAddress();
  
  console.log("SocialMedia contract deployed to:", socialMediaAddress);
  
  // Save the contract address to a file that the frontend can access
  const fs = require("fs");
  const contractAddresses = {
    SocialMedia: socialMediaAddress
  };
  
  fs.writeFileSync(
    "../frontend2/src/contractAddresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });