const TokenFarm = artifacts.require("./contracts/TokenFarm.sol")

module.exports = async function(callback) {
	let tokenFarm = await TokenFarm.deployed()
	await tokenFarm.issueTokens()
	// Code goes here...
	console.log("Tokens issued!")
	callback()
}