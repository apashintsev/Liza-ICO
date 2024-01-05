// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title Crowdsale
/// @notice Crowdsale contract to spend project tokens
contract StakingGD is Ownable {
    ERC20 rewardToken;
    ERC20 stakingToken;

    uint public rewardRate = 10;

    uint public lastUpdateTime; //когда последний раз обновляли информацию о награде которую должен получить юзер

    uint public rewardPerTokenStored; //сколько награды платить за токен который лежит на этом контракте

    mapping(address => uint) public userRewardPerTokenPaid; //сколько оплатили польз за каждый токен
    mapping(address => uint) public rewards; //сколько вознаграждения юзер должен получить
    mapping(address => uint) private _balances;

    uint private _totalSupply;

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = ERC20(_stakingToken);
        rewardToken = ERC20(_rewardToken);
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        rewards[_account] = earned(_account);
        userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        _;
    }

    function rewardPerToken() public view returns (uint) {
        if (_totalSupply == 0) return 0;
        return
            rewardPerTokenStored +
            ((rewardRate * (block.timestamp - lastUpdateTime)) * 1e18) /
            _totalSupply;
    }

    function earned(address _account) public view returns (uint) {
        return
            ((_balances[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    function stake(uint amount) external {
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint amount) external {
        _totalSupply -= amount;
        _balances[msg.sender] -= amount; // todo balance not minus
        stakingToken.transfer(msg.sender, amount);
    }

    function getRewards() external {
        uint reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        rewardToken.transfer(msg.sender, reward);
    }
}
