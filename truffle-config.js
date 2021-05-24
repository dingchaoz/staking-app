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
          ["c0656b37fdecad0bb16e4dd389dd2ef1e8d27327645ef211f9bb6b9d77a4b1b6","9b71f1f349f96925c59cbb0e91308198fc6746110b8f43e8d3d77beee9464b19"],
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
  contracts_build_directory: './src/abis/',
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
