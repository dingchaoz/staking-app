//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MEthToken.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenFarm is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    string public name = "Eth Staking Farm";
    MEthToken public ethToken;

    // total Rewards to be distributed
    uint256 public totalRewards;

    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public rewardsDuration = 7 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    address[] public stakers;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakingBalance;
    mapping(address => bool) public hasStaked;
    mapping(address => bool) public isStaking;

    /* ========== CONSTRUCTOR ========== */

    constructor(MEthToken _ethToken) {
        ethToken = _ethToken;
        //owner = msg.sender;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    // 1. Stakes Tokens (Deposit): An investor will deposit the Token into the smart contracts to starting earning rewards
    function stakeTokens(uint256 _amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(_amount > 0, "Cannot stake 0");

        //Update total staked balance
        totalStaked = totalStaked.add(_amount);

        // Update staking balance
        stakingBalance[msg.sender] = stakingBalance[msg.sender] + _amount;

        // Add user to stakers array *only* if they haven't staked already
        if (!hasStaked[msg.sender]) {
            stakers.push(msg.sender);
        }

        // update stakng status
        isStaking[msg.sender] = true;
        hasStaked[msg.sender] = true;

        // Transfer Mock Eth tokens to this contract for staking
        ethToken.transferFrom(msg.sender, address(this), _amount);

        // emit staked event
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount)
        public
        nonReentrant
        updateReward(msg.sender)
    {
        require(_amount > 0, "Cannot withdraw 0");
        totalStaked = totalStaked.sub(_amount);
        stakingBalance[msg.sender] = stakingBalance[msg.sender].sub(_amount);
        ethToken.transfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            ethToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // Unstaking Tokens (Withdraw): Withdraw money from Dapp
    function unstakeTokens() public {
        // Update staking status
        isStaking[msg.sender] = false;

        withdraw(stakingBalance[msg.sender]);

        getReward();
    }

    // Issuing Tokens: Earning interest (issuing tokens for people who stake them, distribute dap tokens as interes and also allow the investor to unstake their tokens from the app, give them intereset using the app)
    function issueTokens() public onlyOwner {
        // Issue tokens to all stakers
        for (uint256 i = 0; i < stakers.length; i++) {
            address recipient = stakers[i];
            uint256 balance = stakingBalance[recipient];
            if (balance > 0) {
                ethToken.transfer(recipient, balance);
            }
        }
    }

    // owner call this function to add reward amount to the total rewards
    function notifyRewardAmount(uint256 reward)
        external
        updateReward(address(0))
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(rewardsDuration);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(rewardsDuration);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = ethToken.balanceOf(address(this));
        require(
            rewardRate <= balance.div(rewardsDuration),
            "Provided reward too high"
        );

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit RewardAdded(reward);
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return totalStaked;
    }

    function balanceOf(address account) external view returns (uint256) {
        return stakingBalance[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable()
                    .sub(lastUpdateTime)
                    .mul(rewardRate)
                    .mul(1e18)
                    .div(totalStaked)
            );
    }

    function earned(address account) public view returns (uint256) {
        return
            stakingBalance[account]
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    function getRewardForDuration() external view returns (uint256) {
        return rewardRate.mul(rewardsDuration);
    }
}
