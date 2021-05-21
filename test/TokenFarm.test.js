const MEthToken = artifacts.require("MEthToken")
const TokenFarm = artifacts.require("TokenFarm")

require('chai')
	.use(require('chai-as-promised'))
	.should()

function tokens(n) {
	return web3.utils.toWei(n, 'ether')
}

contract('TokenFarm', ([owner, investor]) => {
	let ethToken, tokenFarm

	before(async () => {
		// load Contrats
		ethToken = await MEthToken.new()
		tokenFarm = await TokenFarm.new(ethToken.address)

		// Transfer all Dai reward tokens to farm (1million)
		await ethToken.transfer(tokenFarm.address, tokens('1000000'))

		// Send tokens to investor
		await ethToken.transfer(investor, tokens('100'), { from: owner })
	})

	describe('Mock ETH deployment', async () => {
		it('has a name', async () => {			
			const name = await ethToken.name()
			assert.equal(name, 'MEthToken')
		})
	})

	describe('Token Farm deployment', async () => {
		it('has a name', async () => {			
			const name = await tokenFarm.name()
			assert.equal(name, 'Eth Staking Farm')
		})
	})

	it('contract has tokens', async () => {
		let balance = await ethToken.balanceOf(tokenFarm.address)
		assert.equal(balance.toString(), tokens('1000000'))
	})

	describe('Farming tokens', async () => {

		it('rewards investors for staking mDai tokens', async() => {
			let result

			// Check investor balance before staking
			result = await ethToken.balanceOf(investor)
			assert.equal(result.toString(), tokens('100'), 'investor Mock DAI wallet balance correct before staking')

			// Stake Mock DAI Tokens
			await ethToken.approve(tokenFarm.address, tokens('100'), { from: investor })
			await tokenFarm.stakeTokens(tokens('100'), { from: investor })

			// Check staking result
			result = await ethToken.balanceOf(investor)
			assert.equal(result.toString(), tokens('0'), 'investor Mock DAI wallet balance correct before staking')

			result = await ethToken.balanceOf(tokenFarm.address)
			assert.equal(result.toString(), tokens('1000100'), 'Token Farm Mock DAI balance correct after staking')

			result = await tokenFarm.stakingBalance(investor)
			assert.equal(result.toString(), tokens('100'), 'investor staking balance is correct after staking')

			result = await tokenFarm.isStaking(investor)
			assert.equal(result.toString(), 'true', 'investor staking status correct after staking')

			// Issue Tokens
			await tokenFarm.issueTokens({ from: owner })

			// Check balances after issuance
			result = await ethToken.balanceOf(investor)
			assert.equal(result.toString(), tokens('100'), 'investor DApp Token wallet balance correct after issuance')

			// Ensure that only owner can issue tokens
			await tokenFarm.issueTokens({ from: investor}).should.be.rejected;

			// Unstake tokens
			await tokenFarm.unstakeTokens({ from: investor });

			// Check results after unstaking
			result = await ethToken.balanceOf(investor)
			assert.equal(result.toString(), tokens('200'), 'investor Mock DAI wallet balance correct after staking')

			result = await ethToken.balanceOf(tokenFarm.address)
			assert.equal(result.toString(), tokens('999900'), 'Token Farm Mock DAI balance correct after staking')

			result = await tokenFarm.stakingBalance(investor)
			assert.equal(result.toString(), tokens('0'), 'investor staking balance correct after staking')

			result = await tokenFarm.isStaking(investor)
			assert.equal(result.toString(), 'false', 'investor staking status correct after staking')

		})
	})
})