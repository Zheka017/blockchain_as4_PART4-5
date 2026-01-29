// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Like {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address user) external view returns (uint256);
}

contract MiniLendingPool {
    IERC20Like public token;

    mapping(address => uint256) public deposited;
    uint256 public totalDeposited;

    constructor(address tokenAddress) {
        token = IERC20Like(tokenAddress);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "amount=0");
        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");

        deposited[msg.sender] += amount;
        totalDeposited += amount;
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "amount=0");
        require(deposited[msg.sender] >= amount, "not enough deposited");

        deposited[msg.sender] -= amount;
        totalDeposited -= amount;

        require(token.transfer(msg.sender, amount), "transfer failed");
    }

    function poolBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
