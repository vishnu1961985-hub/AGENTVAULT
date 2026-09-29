// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract MockMerchant {
    event PaymentReceived(
        address indexed from,
        uint256 amount
    );

    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    function getBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }
}