const MEthToken = artifacts.require("MEthToken")
const TokenFarm = artifacts.require("TokenFarm")

module.exports = async function(deployer, network, accounts) {
	// Deploy Mock DAI Token
	await deployer.deploy(MEthToken) 
	const ethToken = await MEthToken.deployed()

	// Deploy TokenFarm
	await deployer.deploy(TokenFarm, ethToken.address) 
	const tokenFarm = await TokenFarm.deployed()

	// Transfer all tokens to TokenFarm (1 million)
	await ethToken.transfer(tokenFarm.address, '1000000')

	// Transfer 100 Mock Eth tokens to investor
	await ethToken.transfer(accounts[1], '100')
	// await daiToken.transfer(accounts[1], '100')

}
