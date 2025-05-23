require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200  // Lower value (like 200) optimizes for contract size
      }
    }
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true  
    }
  },
  paths: {
    artifacts: "../frontend2/src/artifacts",
  }
};