const MEthToken = artifacts.require("MEthToken")
const TokenFarm = artifacts.require("TokenFarm")
const helper = require("../utils/utils.js")
const { time } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");
const { toBN } = require('web3-utils');
const truffleAssert = require('truffle-assertions');


const DAY = 86400;
const ZERO_BN = toBN(0);

require('chai')
	.use(require('chai-as-promised'))
	.should()

function tokens(n) {
	return web3.utils.toWei(n, 'ether')
}

contract('TokenFarm', ([owner, investor, investor2]) => {
	let ethToken, tokenFarm

	before(async () => {
		// load Contrats
		ethToken = await MEthToken.new()
		tokenFarm = await TokenFarm.new(ethToken.address)

		// Transfer all Dai reward tokens to farm (1million)
		await ethToken.transfer(tokenFarm.address, tokens('1000000'))

		// Send tokens to investor
		// await ethToken.transfer(investor, tokens('100'), { from: owner })
	})

	describe("Testing Helper Functions", () => {
		it("should advance the blockchain forward a block", async () =>{
			const originalBlockHash = await web3.eth.getBlock('latest').then(block=>{return block.hash});
			await time.advanceBlock()
			newBlockHash = await web3.eth.getBlock('latest').then(block=>{return block.hash});
			assert.notEqual(originalBlockHash, newBlockHash);
		});
	
		it("should be able to advance time and block together", async () => {
			const advancement = 600;
			const originalBlockTimeStamp = await web3.eth.getBlock('latest').then(block=>{return block.timestamp});
			await time.increase(advancement);
			await time.advanceBlock;
			newBlockTimeStamp = await web3.eth.getBlock('latest').then(block=>{return block.timestamp});
			const timeDiff =  newBlockTimeStamp- originalBlockTimeStamp;
			assert.isTrue(timeDiff >= advancement);
		});
	});


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

	describe('lastTimeRewardApplicable()', () => {
		it('should return 0', async () => {
			assert.equal(await tokenFarm.lastTimeRewardApplicable(), 0);
		});

		describe('when updated', () => {
			it('should equal current timestamp', async () => {
				await tokenFarm.notifyRewardAmount(10);

				const cur = await helper.currentTime();
				const lastTimeReward = await tokenFarm.lastTimeRewardApplicable();

				assert.equal(cur.toString(), lastTimeReward.toString());
			});
		});
	});

	describe('rewardPerToken()', () => {
		it('should return 0', async () => {
			assert.equal(await tokenFarm.rewardPerToken(), 0);
		});

		it('should be > 0', async () => {
			const totalToStake = toUnit('100');
			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			const totalSupply = await tokenFarm.totalSupply();
			assert.isTrue(totalSupply > ZERO_BN);

			const rewardValue = helper.toUnit(5000.0);
			await ethToken.transfer(tokenFarm.address, rewardValue, { from: owner });
			await tokenFarm.notifyRewardAmount(rewardValue);

			await fastForward(DAY);

			const rewardPerToken = await tokenFarm.rewardPerToken();
			assert.isTrue(rewardPerToken> ZERO_BN);
		});
	});

	describe('stake()', () => {
		it('staking increases staking balance', async () => {
			const totalToStake = toUnit('100');
			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });

			const initialStakeBal = await tokenFarm.balanceOf(investor);
			const initialLpBal = await ethToken.balanceOf(investor);

			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			const postStakeBal = await tokenFarm.balanceOf(investor);
			const postLpBal = await ethToken.balanceOf(investor);

			assert.isTrue(postLpBal < initialLpBal);
			assert.isTrue(postStakeBal>initialStakeBal);
		});

	});

	describe('earned()', () => {
		it('should be 0 when not staking', async () => {
			const earned = await tokenFarm.earned(investor2);
			console.log(earned);
			assert.strictEqual(earned.toString(), ZERO_BN.toString());
		});

		it('should be > 0 when staking', async () => {
			const totalToStake = toUnit('100');

			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			const rewardValue = toUnit(5000.0);
			await ethToken.transfer(tokenFarm.address, rewardValue, { from: owner });
			await tokenFarm.notifyRewardAmount(rewardValue);

			await fastForward(DAY);

			const earned = await tokenFarm.earned(investor);

			assert.isTrue(earned > ZERO_BN);
		});

		it('rewardRate should increase if new rewards come before DURATION ends', async () => {
			const totalToDistribute = toUnit('5000');

			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(totalToDistribute);

			const rewardRateInitial = await tokenFarm.rewardRate();

			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(totalToDistribute);

			const rewardRateLater = await tokenFarm.rewardRate();

			assert.isTrue(rewardRateInitial > ZERO_BN);
			assert.isTrue(rewardRateLater > rewardRateInitial);
		});

		it('rewards token balance should rollover after DURATION', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(totalToDistribute);

			await fastForward(DAY * 7);
			const earnedFirst = await tokenFarm.earned(investor);


			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(totalToDistribute);

			await fastForward(DAY * 7);
			const earnedSecond = await tokenFarm.earned(investor);
			// assert.strictEqual(earnedSecond.toString() ,earnedFirst.add(earnedFirst).toString());
			assert.isTrue(earnedSecond > earnedFirst);

		});
	});

	describe('getReward()', () => {
		it('should increase rewards token balance', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(totalToDistribute);

			await fastForward(DAY);

			const initialRewardBal = await ethToken.balanceOf(investor);
			const initialEarnedBal = await tokenFarm.earned(investor);
			await tokenFarm.getReward({ from: investor });
			const postRewardBal = await ethToken.balanceOf(investor);
			const postEarnedBal = await tokenFarm.earned(investor);

			assert.isTrue(postEarnedBal < initialEarnedBal);
			assert.isTrue(postRewardBal > initialRewardBal);
		});
	});

	describe('getRewardForDuration()', () => {
		it('should increase rewards token balance', async () => {
			const totalToDistribute = toUnit('5000');
			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(totalToDistribute);

			const rewardForDuration = await tokenFarm.getRewardForDuration();

			const duration = await tokenFarm.rewardsDuration();
			const rewardRate = await tokenFarm.rewardRate();

			assert.isTrue(rewardForDuration > ZERO_BN);
			assert.strictEqual(rewardForDuration.toString(), duration.mul(rewardRate).toString());
		});
	});

	describe('withdraw()', () => {
		// it('cannot withdraw if nothing staked', async () => {
		// 	await assert.revert(tokenFarm.withdraw(toUnit('100')), 'SafeMath: subtraction overflow');
		// });

		it('should increases lp token balance and decreases staking balance', async () => {
			const totalToStake = toUnit('100');
			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			const initialStakingTokenBal = await ethToken.balanceOf(investor);
			const initialStakeBal = await tokenFarm.balanceOf(investor);

			await tokenFarm.withdraw(totalToStake, { from: investor });

			const postStakingTokenBal = await ethToken.balanceOf(investor);
			const postStakeBal = await tokenFarm.balanceOf(investor);

			assert.strictEqual(postStakeBal.add(toBN(totalToStake)).toString(), initialStakeBal.toString());
			assert.strictEqual(initialStakingTokenBal.add(toBN(totalToStake)).toString(), postStakingTokenBal.toString());
		});

		// it('cannot withdraw 0', async () => {
		// 	await assert.revert(tokenFarm.withdraw('0'), 'Cannot withdraw 0');
		// });
	});

	describe('unstakeTokens()', () => {
		it('should retrieve all earned and increase rewards bal', async () => {
			const totalToStake = toUnit('100');
			const totalToDistribute = toUnit('5000');

			await ethToken.transfer(investor, totalToStake, { from: owner });
			await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
			await tokenFarm.stakeTokens(totalToStake, { from: investor });

			await ethToken.transfer(tokenFarm.address, totalToDistribute, { from: owner });
			await tokenFarm.notifyRewardAmount(toUnit(5000.0));

			await fastForward(DAY);

			const initialRewardBal = await ethToken.balanceOf(investor);
			const initialEarnedBal = await tokenFarm.earned(investor);
			await tokenFarm.unstakeTokens({ from: investor });
			const postRewardBal = await ethToken.balanceOf(investor);
			const postEarnedBal = await tokenFarm.earned(investor);

			assert.isTrue(postEarnedBal < initialEarnedBal);
			assert.isTrue(postRewardBal > initialRewardBal);
			assert.strictEqual(postEarnedBal.toString(), ZERO_BN.toString());
		});
	});

	// describe('Integration Tests', () => {
	// 	// before(async () => {
	// 	// 	// Set rewardDistribution address
	// 	// 	await tokenFarm.setRewardsDistribution(rewardsDistribution.address, {
	// 	// 		from: owner,
	// 	// 	});
	// 	// 	assert.equal(await tokenFarm.rewardsDistribution(), rewardsDistribution.address);

	// 	// 	await setRewardsTokenExchangeRate();
	// 	// });

	// 	it('stake and claim', async () => {
	// 		// Transfer some LP Tokens to user
	// 		const totalToStake = toUnit('500');
	// 		await ethToken.transfer(investor, totalToStake, { from: owner });

	// 		// Stake LP Tokens
	// 		await ethToken.approve(tokenFarm.address, totalToStake, { from: investor });
	// 		await tokenFarm.stakeTokens(totalToStake, { from: investor });

	// 		// Distribute some rewards
	// 		const totalToDistribute = toUnit('35000');
	// 		// assert.equal(await rewardsDistribution.distributionsLength(), 0);
	// 		// await rewardsDistribution.addRewardDistribution(tokenFarm.address, totalToDistribute, {
	// 		// 	from: owner,
	// 		// });
	// 		// assert.equal(await rewardsDistribution.distributionsLength(), 1);

	// 		// // Transfer Rewards to the RewardsDistribution contract address
	// 		// await ethToken.transfer(rewardsDistribution.address, totalToDistribute, { from: owner });

	// 		// // Distribute Rewards called from Synthetix contract as the authority to distribute
	// 		// await rewardsDistribution.distributeRewards(totalToDistribute, {
	// 		// 	from: authority,
	// 		// });

	// 		// Period finish should be ~7 days from now
	// 		const periodFinish = await tokenFarm.periodFinish();
	// 		const curTimestamp = await currentTime();
	// 		// assert.equal(parseInt(periodFinish.toString(), 10), curTimestamp + DAY * 7);

	// 		// Reward duration is 7 days, so we'll
	// 		// Fastforward time by 6 days to prevent expiration
	// 		await fastForward(DAY * 6);

	// 		// Reward rate and reward per token
	// 		const rewardRate = await tokenFarm.rewardRate();
	// 		assert.isTrue(rewardRate == ZERO_BN);

	// 		const rewardPerToken = await tokenFarm.rewardPerToken();
	// 		// assert.isTrue(rewardPerToken > ZERO_BN);

	// 		// Make sure we earned in proportion to reward per token
	// 		const rewardRewardsEarned = await tokenFarm.earned(investor);
	// 		//assert.bnEqual(rewardRewardsEarned, rewardPerToken.mul(totalToStake).div(toUnit(1)));

	// 		// Make sure after withdrawing, we still have the ~amount of rewardRewards
	// 		// The two values will be a bit different as time has "passed"
	// 		const initialWithdraw = toUnit('100');
	// 		await tokenFarm.withdraw(initialWithdraw, { from: investor });
	// 		//assert.bnEqual(initialWithdraw, await ethToken.balanceOf(investor));

	// 		const rewardRewardsEarnedPostWithdraw = await tokenFarm.earned(investor);
	// 		//assert.bnClose(rewardRewardsEarned, rewardRewardsEarnedPostWithdraw, toUnit('0.1'));

	// 		// Get rewards
	// 		const initialRewardBal = await ethToken.balanceOf(investor);
	// 		await tokenFarm.getReward({ from: investor });
	// 		const postRewardRewardBal = await ethToken.balanceOf(investor);

	// 		//assert.isTrue(postRewardRewardBal > initialRewardBal);

	// 		// Exit
	// 		const preExitLPBal = await ethToken.balanceOf(investor);
	// 		await tokenFarm.exit({ from: investor });
	// 		const postExitLPBal = await ethToken.balanceOf(investor);
	// 		//assert.isTrue(postExitLPBal > preExitLPBal);
	// 	});
	// });

	// describe('Farming tokens', async () => {

	// 	it('rewards investors for staking mDai tokens', async() => {
	// 		let result

	// 		// Check investor balance before staking
	// 		result = await ethToken.balanceOf(investor)
	// 		assert.equal(result.toString(), tokens('100'), 'investor Mock DAI wallet balance correct before staking')

	// 		// Stake Mock DAI Tokens
	// 		await ethToken.approve(tokenFarm.address, tokens('100'), { from: investor })
	// 		await tokenFarm.stakeTokens(tokens('100'), { from: investor })

	// 		// Check staking result
	// 		result = await ethToken.balanceOf(investor)
	// 		assert.equal(result.toString(), tokens('0'), 'investor Mock DAI wallet balance correct before staking')

	// 		result = await ethToken.balanceOf(tokenFarm.address)
	// 		assert.equal(result.toString(), tokens('1000100'), 'Token Farm Mock DAI balance correct after staking')

	// 		result = await tokenFarm.stakingBalance(investor)
	// 		assert.equal(result.toString(), tokens('100'), 'investor staking balance is correct after staking')

	// 		result = await tokenFarm.isStaking(investor)
	// 		assert.equal(result.toString(), 'true', 'investor staking status correct after staking')

	// 		// Issue Tokens
	// 		await tokenFarm.issueTokens({ from: owner })

	// 		// Check balances after issuance
	// 		result = await ethToken.balanceOf(investor)
	// 		assert.equal(result.toString(), tokens('100'), 'investor DApp Token wallet balance correct after issuance')

	// 		// Ensure that only owner can issue tokens
	// 		await tokenFarm.issueTokens({ from: investor}).should.be.rejected;

	// 		// Unstake tokens
	// 		await tokenFarm.unstakeTokens({ from: investor });

	// 		// Check results after unstaking
	// 		result = await ethToken.balanceOf(investor)
	// 		assert.equal(result.toString(), tokens('200'), 'investor Mock DAI wallet balance correct after staking')

	// 		result = await ethToken.balanceOf(tokenFarm.address)
	// 		assert.equal(result.toString(), tokens('999900'), 'Token Farm Mock DAI balance correct after staking')

	// 		result = await tokenFarm.stakingBalance(investor)
	// 		assert.equal(result.toString(), tokens('0'), 'investor staking balance correct after staking')

	// 		result = await tokenFarm.isStaking(investor)
	// 		assert.equal(result.toString(), 'false', 'investor staking status correct after staking')

	// 	})
	// })
})