// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice A 6-decimal faucet ERC-20 standing in for USDC on testnets so the
///         FootballMarket can be exercised end-to-end on Base Sepolia.
/// @dev    DO NOT deploy to mainnet — use the canonical USDC there instead.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 1e6);
    }

    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Public faucet — mint test USDC to any address.
    /// @param to     Recipient.
    /// @param amount Amount in 6-decimal units.
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
