# DeFi Yield Farming

---
This repository presents practices about:
- Setup a blockchain.
- Develop Ethereum smart contracts.
- Write tests for the developed Ethereum smart contracts. 
- Develop a client-side website so people can actually use this application.
---

## Installation

### Setup

- **Node.js**

      sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
      nvm install 12.18.3
      node -v

- **Truffle**

      sudo npm install -g truffle@5.1.39 --unsafe-perm=true

- **Ganache** installation guide can be found in [here](https://www.trufflesuite.com/ganache).

- **MetaMask** installation guide can be found in [here](https://metamask.io/).

### Commands

- Install necessarily Node.js packages

      npm install

- Deploy smart contracts to the Ethereum blockchain

      truffle migrate --reset
      
- Deploy and run the front-end application

      npm start run
      
- Run the scripts to issue tokens

      truffle exec scripts/issue-tokens.js

## Citation
If you use this code for your publications, please cite it as:

    @ONLINE{vdtct,
        author = "Dingchao Zhang",
        title  = "Eth Yield Farming App",
        year   = "2021",
    }

## Author
Dingchao Zhang

## License
This system is available under the MIT license. See the LICENSE file for more info.

