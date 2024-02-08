// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IBEP20} from "./IBEP20.sol";

contract Payment {
    IBEP20 public immutable tokenLZC;
    address private immutable admin;

    enum Asset {
        USDT,
        USDC,
        BUSD,
        BNB
    }
    //the address to which user funds are received
    address public immutable recepient;

    IBEP20 public immutable usdt;
    IBEP20 public immutable usdc;
    IBEP20 public immutable busd;

    event Deposited(address indexed from, uint256 amount);
    event SwapRequestCreated(address indexed from, Asset asset, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not an admin");
        _;
    }

    constructor(address _liza, 
        address _admin,         
        address _usdt,
        address _usdc,
        address _busd,
        address _recepient) {
        tokenLZC = IBEP20(_liza);
        admin = _admin;
        usdt = IBEP20(_usdt);
        usdc = IBEP20(_usdc);
        busd = IBEP20(_busd);
        recepient = _recepient;
    }

    function deposit(uint256 amount) public {
        tokenLZC.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function getBalanceLZC() public view returns (uint256) {
        return tokenLZC.balanceOf(address(this));
    }
    //get token
    function getUsd(Asset asset) private view returns (IBEP20) {
        if (asset == Asset.USDT) {
            return usdt;
        }
        if (asset == Asset.USDC) {
            return usdc;
        }
        return busd;
    }
    
    function swap(uint256 value, Asset asset) external payable{  
        if (asset == Asset.BNB) {
            payable(recepient).transfer(msg.value);
        } else {
            getUsd(asset).transferFrom(msg.sender, address(this), value);
        }
        emit SwapRequestCreated(msg.sender, asset, (asset==Asset.BNB?msg.value:value));
    }

    function withdrawTo(address to, uint256 amount) public onlyAdmin {
        require(
            tokenLZC.balanceOf(address(this)) >= amount,
            "Not enought balance"
        );
        tokenLZC.transfer(to, amount);
    }
}
