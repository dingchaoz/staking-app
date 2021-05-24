import { BigInt } from "@graphprotocol/graph-ts"
import {
  TokenFarm,
  OwnershipTransferred,
  Recovered,
  RewardAdded,
  RewardPaid,
  RewardsDurationUpdated,
  Staked,
  Withdrawn
} from "../generated/TokenFarm/TokenFarm"
import { ExampleEntity,Token,StakeBalance,RewardBalance,Stakers } from "../generated/schema"

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.ethToken(...)
  // - contract.hasStaked(...)
  // - contract.isStaking(...)
  // - contract.lastUpdateTime(...)
  // - contract.name(...)
  // - contract.owner(...)
  // - contract.periodFinish(...)
  // - contract.rewardPerTokenStored(...)
  // - contract.rewardRate(...)
  // - contract.rewards(...)
  // - contract.rewardsDuration(...)
  // - contract.stakers(...)
  // - contract.stakingBalance(...)
  // - contract.totalRewards(...)
  // - contract.totalStaked(...)
  // - contract.userRewardPerTokenPaid(...)
  // - contract.totalSupply(...)
  // - contract.balanceOf(...)
  // - contract.lastTimeRewardApplicable(...)
  // - contract.rewardPerToken(...)
  // - contract.earned(...)
  // - contract.getRewardForDuration(...)
}

export function handleRewardAdded(event: RewardAdded): void {
  let contract = TokenFarm.bind(event.address)
  let id = contract.ethToken().toHex()
  let token = Token.load(id)
  if (token == null) {
    token = new Token(id)
  }
  let rewardBalance = RewardBalance.load(id)
  if (rewardBalance == null) {
    rewardBalance = new RewardBalance(id)
    rewardBalance.amount = event.params.reward.toString()
  }
  else {
    let newRewardBalance = parseInt(rewardBalance.amount) + parseInt(event.params.reward.toString())
    rewardBalance.amount = newRewardBalance.toString()
  }
  token.save()
  rewardBalance.save()



}

export function handleRewardPaid(event: RewardPaid): void {
  let userId = event.params.user.toHex()
  let staker = Stakers.load(userId)
  let newRewardAmount = parseInt(staker.rewardedAmount) + parseInt(event.params.reward.toString())
  staker.rewardedAmount = newRewardAmount.toString()

  let contract = TokenFarm.bind(event.address)
  let id = contract.ethToken().toHex()
  let rewardBalance = RewardBalance.load(id)
  let newAmount = parseInt(rewardBalance.amount) - parseInt(event.params.reward.toString())
  rewardBalance.amount = newAmount.toString()

  staker.save()
  rewardBalance.save()

}


export function handleStaked(event: Staked): void {
  let contract = TokenFarm.bind(event.address)
  let id = contract.ethToken().toHex()
  let token = Token.load(id)
  if (token == null) {
    token = new Token(id)
  }
  let stakeBalance = StakeBalance.load(id)
  if (stakeBalance == null) {
    stakeBalance = new StakeBalance(id)
    stakeBalance.amount = event.params.amount.toString()
  }
  else {
    let newStakeAmount = parseInt(stakeBalance.amount) + parseInt(event.params.amount.toString())
    stakeBalance.amount = newStakeAmount.toString()
  }

  let userId = event.params.user.toHex()
  let staker = Stakers.load(userId)
  if (staker == null) {
    staker = new Stakers(userId)
    staker.address = event.params.user
    staker.stakedAmount = event.params.amount.toString()
  }
  else {
    let newStakerAmount = parseInt(staker.stakedAmount) + parseInt(event.params.amount.toString())
    staker.stakedAmount = newStakerAmount.toString()
  }

  token.save()
  staker.save()
  stakeBalance.save()
}

export function handleWithdrawn(event: Withdrawn): void {
  let userId = event.params.user.toHex()
  let staker = Stakers.load(userId)
  let newStakeAmount = parseInt(staker.stakedAmount) - parseInt(event.params.amount.toString())
  staker.stakedAmount = newStakeAmount.toString()

  let contract = TokenFarm.bind(event.address)
  let id = contract.ethToken().toHex()
  let stakeBalance = StakeBalance.load(id)
  let newStakeBlance = parseInt(stakeBalance.amount) - parseInt(event.params.amount.toString())
  stakeBalance.amount = newStakeBlance.toString()

  staker.save()
  stakeBalance.save()
}

export function handleRecovered(event: Recovered): void {}

export function handleRewardsDurationUpdated(
  event: RewardsDurationUpdated
): void {}

