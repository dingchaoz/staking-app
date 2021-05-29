require('babel-register');
require('babel-polyfill');
require ('dotenv').config();

const HDWalletProvider = require('@truffle/hdwallet-provider')
module.exports = {
  networks: {
    ropsten:{
      provider: function(){
        return new HDWalletProvider (
          // process.env.PRIVATEKEYs,
          process.env.PRIVATEKEYs,
          `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,0,2
        )
      },
      gasPrice: 25000000000,
      network_id: 3
    },
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
  },
  contracts_directory: './src/contracts/',
  // contracts_build_directory: './src/abis/',
  contracts_build_directory: './build/contracts/',
  plugins: ["solidity-coverage"],
  compilers: {
    solc: {
      version: "^0.8.0",
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "petersburg"
    }
  }
}
