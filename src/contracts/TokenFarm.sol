//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MEthToken.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Token Staking Farm contract
 */
contract TokenFarm is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public token;
    MEthToken public mToken;

    // contrac name
    bytes32 public constant NAME = "Staking Farm";

    // time when current reward period finishes
    uint256 public periodFinish = 0;

    // reward rate: reward rate * reward remaining time = reward remained
    uint256 public rewardRate = 0;

    // rewards duration every 7 days
    uint256 constant REWARDSDURATION = 7 days;

    // last time reward rate is updated
    uint256 public lastUpdateTime;

    // reward per token staked: rewardPerTokenStored * token staked = reward 
    uint256 public rewardPerTokenStored;

    // total staked token amount
    uint256 public totalStaked;

    // record if an user staked or not
    mapping(address => bool) public hasStaked;

    // mapping record each user's reward per token, storing rewardPerTokenStored per user account
    mapping(address => uint256) public userRewardPerTokenPaid;

    // mapping record each user's reward
    mapping(address => uint256) public rewards;

    // mapping record each user's staking balance
    mapping(address => uint256) public stakingBalance;

    // stakers array
    // Improvement idea: replace array with struct
    address[] public stakers;


    /* ========== CONSTRUCTOR ========== */

    constructor(MEthToken _ethToken) {
        mToken = _ethToken;

        // Safe ERC20 wrapped to make safe interaction with otehr ERC20 
        // such as using safeTransfer that throws on failure
        token = IERC20(mToken);
    }

    /* ========== EVENTS ========== */

    /**
     * @dev Emitted when reward `amount` is added to the pool.
     */
    event RewardAdded(uint256 amount);

    /**
     * @dev Emitted when `user` staked token `amount`.
     */
    event Staked(address indexed user, uint256 amount);

    /**
     * @dev Emitted when `user` withdrawn token `amount`.
     */
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @dev Emitted when reward `amount` is distribtued to `user`.
     */
    event RewardPaid(address indexed user, uint256 amount);


    /* ========== MODIFIERS ========== */

    /**
     * @dev Update reward per token, rewards balance for each user
     * @param account user account address
     */

     // Improvement ideas: make it as a function instead, since Modifier code is usually executed
     // before function body, so any state chagnes or external calls violate the Checks-Effects-Interactions pattern
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

   
    /**
     * @dev stake tokens into contract
     * @param amount token amount staked
     */
    function stakeTokens(uint256 amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(amount > 0, "Cannot stake 0");

        //Update total staked balance
        totalStaked = totalStaked.add(amount);

        // Update staking balance
        stakingBalance[msg.sender] = stakingBalance[msg.sender] + amount;

        // Add user to stakers array *only* if they haven't staked already
        if (!hasStaked[msg.sender]) {
            stakers.push(msg.sender);
        }

        // safeTransferFrom from user to contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        // emit staked event
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev withdraw tokens out from contract
     * @param amount token amount withdrawn
     */
    function withdraw(uint256 amount)
        public
        nonReentrant
        updateReward(msg.sender)
    {
        require(amount > 0, "Cannot withdraw 0");
        totalStaked = totalStaked.sub(amount);
        stakingBalance[msg.sender] = stakingBalance[msg.sender].sub(amount);
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev distribute reward
     */
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 amount = rewards[msg.sender];
        if (amount > 0) {
            rewards[msg.sender] = 0;
            token.safeTransfer(msg.sender, amount);
            emit RewardPaid(msg.sender, amount);
        }
    }

    /**
     * @dev unstake tokens, all deposited will be withdrawn and reward will also be distributed
     */
    function unstakeTokens() external {

        getReward();

        withdraw(stakingBalance[msg.sender]);

        
    }


    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @dev add reward tokens to the contract by owner
     * @param amount reward token amount
     */
    function notifyRewardAmount(uint256 amount)
        external
        onlyOwner
        updateReward(address(0))
    {

        // if stil in the current reward period, update reward rate by adding reward amount evenly spreaded across remaining time
        if (block.timestamp < periodFinish) {
            uint256 remaining = periodFinish.sub(block.timestamp);

            // amount/rewards duration is reward rate
            // considering solidity integer division might truncate, performing multiplication before division 
            uint256 leftover = remaining.mul(amount).div(REWARDSDURATION);
            rewardRate = amount.add(leftover).div(REWARDSDURATION);
            
        } else {
            rewardRate = amount.div(REWARDSDURATION);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = token.balanceOf(address(this));
        require(
            rewardRate <= balance.div(REWARDSDURATION),
            "Provided reward too high"
        );


        // update reward period starting time and finishing time
        // reward calculation can arguably maintain integrity if timestamp varies by 15 seconds
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(REWARDSDURATION);
        emit RewardAdded(amount);
    }

    /**
     * @dev refund tokens to users, all deposited will be withdrawn
     */
    // Improvement ideas: remove this function as Pull is better than Push
    // We should shift the transfering risk: fallback function call, running out of gas, etc to user
    function refundTokens() external onlyOwner {
        // Issue tokens to all stakers
        for (uint256 i = 0; i < stakers.length; i++) {
            address recipient = stakers[i];
            uint256 balance = stakingBalance[recipient];
            if (balance > 0) {
                stakingBalance[msg.sender] = 0;
                token.safeTransfer(recipient, balance);
            }
        }
    }


    /* ========== VIEWS ========== */

    /**
     * @dev get rewards duration
     */
    function rewardsDuration() public pure returns (uint256) {
        return REWARDSDURATION;
    }

    /**
     * @dev get last time the reward applicable
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    /**
     * @dev get total staked supply
     */
    function totalSupply() external view returns (uint256) {
        return totalStaked;
    }

    /**
     * @dev get stake balance 
     * @param account user account
     */
    function balanceOf(address account) external view returns (uint256) {
        return stakingBalance[account];
    }

    /**
     * @dev compute reward per token staked 10^18fixed-point multiplication to ensure accuracy
     */
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

    /**
     * @dev return reward earned per user account
     * @param account user address 10^18fixed-point division to ensure accuracy
     */
    function earned(address account) public view returns (uint256) {
        return
            stakingBalance[account]
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    /**
     * @dev return reward for a given duration
     */
    function getRewardForDuration() external view returns (uint256) {
        return rewardRate.mul(REWARDSDURATION);
    }

    /**
     * @dev get name of the contract 
     */
    function name() public pure returns (bytes32) {
        return NAME;
    }
}

