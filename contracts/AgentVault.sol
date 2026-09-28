// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract AgentVault {
    enum Status {
        Allowed,
        Blocked,
        Pending
    }

    enum Reason {
        None,
        NotAuthorized,
        VaultPaused,
        VaultExpired,
        RecipientNotAllowed,
        ExceedsTransactionMaximum,
        ExceedsDailyLimit,
        ExceedsRecipientCap
    }

    address public owner;
    address public agent;

    bool public paused;
    uint256 public expiry;

    constructor(address _agent, uint256 _expiry) {
        owner = msg.sender;
        agent = _agent;
        expiry = _expiry;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "Not agent");
        _;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }
}