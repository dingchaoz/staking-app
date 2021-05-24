const TokenFarm = artifacts.require("TokenFarm")

module.exports = function(){
    async function getStakedValue() {

        tokenFarm = await TokenFarm.deployed();
        const value = await tokenFarm.totalSupply();
        console.log(value.toString());

    }
    getStakedValue();
}
