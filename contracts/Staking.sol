// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking {
    uint256 private constant DAYS30 = 30 days;
    uint256 private constant DAYS60 = 60 days;
    uint256 private constant DAYS90 = 90 days;
    uint256 private constant DAY = 1 days;

    using SafeERC20 for ERC20;
    ERC20 public stakingToken;
    ERC20 public rewardToken;

    uint256 public totalStaked;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 stakingDuration;
        uint256 dailyInterestRate;
    }

    mapping(address => Stake[]) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = ERC20(_stakingToken);
        rewardToken = ERC20(_rewardToken);
    }

    function getDailyInterestRate(
        uint256 durationInDays
    ) private pure returns (uint256) {
        if (durationInDays == DAYS30) {
            return 20;
        }
        if (durationInDays == DAYS60) {
            return 25;
        }
        return 30;
    }

    function stake(uint256 amount, uint256 durationDaysInSeconds) external {
        require(
            amount > 50 * 1e18 && amount < 1000 * 1e18,
            "Min 50 and max 1000 LZC"
        );
        require(
            durationDaysInSeconds == DAYS30 ||
                durationDaysInSeconds == DAYS60 ||
                durationDaysInSeconds == DAYS90,
            "Not allowed duration"
        );
        require(amount > 0, "Amount must be greater than 0");
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].push(
            Stake({
                amount: amount,
                startTime: block.timestamp,
                stakingDuration: durationDaysInSeconds,
                dailyInterestRate: getDailyInterestRate(durationDaysInSeconds)
            })
        );
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 stakeIndex) external {
        require(stakeIndex < stakes[msg.sender].length, "Invalid stake index");
        Stake memory stakeItem = stakes[msg.sender][stakeIndex];
        uint256 reward = 0;
        if (
            block.timestamp >= stakeItem.startTime + stakeItem.stakingDuration
        ) {
            uint256 dailyReward = (stakeItem.amount *
                stakeItem.dailyInterestRate) / 100_000;
            reward = dailyReward * (stakeItem.stakingDuration / DAY);
            rewardToken.safeTransfer(msg.sender, reward);
        }

        stakingToken.safeTransfer(msg.sender, stakeItem.amount);
        totalStaked -= stakeItem.amount;
        stakes[msg.sender][stakeIndex].amount = 0;
        emit Unstaked(msg.sender, stakeItem.amount, reward);
    }

    function getStakesCount(address user) external view returns (uint256) {
        return stakes[user].length;
    }
}
