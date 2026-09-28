// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./AgentVault.sol";

contract AgentVaultFactory {
    mapping(address => address) public vaultByOwner;

    event VaultCreated(
        address indexed owner,
        address indexed agent,
        address indexed vault,
        uint256 expiry
    );

    function createVault(
        address agent,
        uint256 expiry
    )
        external
        returns (address vaultAddress)
    {
        require(
            vaultByOwner[msg.sender] == address(0),
            "Vault already exists"
        );

        AgentVault vault =
            new AgentVault(
                msg.sender,
                agent,
                expiry
            );

        vaultAddress =
            address(vault);

        vaultByOwner[msg.sender] =
            vaultAddress;

        emit VaultCreated(
            msg.sender,
            agent,
            vaultAddress,
            expiry
        );
    }

    function getVault(
        address owner
    )
        external
        view
        returns (address)
    {
        return vaultByOwner[owner];
    }
}