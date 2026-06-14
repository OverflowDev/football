// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PriceOracle
/// @notice Receives off-chain FPI price feeds from the platform backend and
///         stores the latest price (denominated in USDC, 6 decimals) for each
///         player token. The FootballMarket contract reads prices from here.
/// @dev    Writes are gated behind ORACLE_ROLE. The deployer is the admin and
///         can grant/revoke the oracle role to backend signer addresses.
contract PriceOracle is AccessControl {
    /// @notice Role permitted to push price updates (held by the backend signer).
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct PriceData {
        uint256 price; // USDC price per share, 6 decimals
        uint256 updatedAt; // block timestamp of last update
    }

    /// @notice Latest price data keyed by player token address.
    mapping(address => PriceData) private _prices;

    /// @notice Emitted whenever a player's price is updated by the oracle.
    /// @param playerToken Address of the player's ERC-20 token.
    /// @param oldPrice    Previous stored price (6 decimals).
    /// @param newPrice    New stored price (6 decimals).
    /// @param updatedAt   Timestamp the price was written.
    event PriceUpdated(
        address indexed playerToken,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 updatedAt
    );

    error PriceNotSet(address playerToken);
    error ZeroPrice();
    error LengthMismatch();

    /// @param admin Address granted DEFAULT_ADMIN_ROLE and ORACLE_ROLE initially.
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
    }

    /// @notice Push a single price update for a player token.
    /// @dev    Callable only by ORACLE_ROLE. Reverts on zero price.
    /// @param playerToken Address of the player's ERC-20 token.
    /// @param newPrice    New price per share in USDC (6 decimals).
    function setPrice(address playerToken, uint256 newPrice)
        external
        onlyRole(ORACLE_ROLE)
    {
        if (newPrice == 0) revert ZeroPrice();
        uint256 oldPrice = _prices[playerToken].price;
        _prices[playerToken] = PriceData({price: newPrice, updatedAt: block.timestamp});
        emit PriceUpdated(playerToken, oldPrice, newPrice, block.timestamp);
    }

    /// @notice Batch-update prices for many player tokens in one transaction.
    /// @dev    Gas-efficient path for the cron job updating all players at once.
    /// @param playerTokens Array of player token addresses.
    /// @param newPrices    Parallel array of new prices (6 decimals).
    function setPrices(
        address[] calldata playerTokens,
        uint256[] calldata newPrices
    ) external onlyRole(ORACLE_ROLE) {
        if (playerTokens.length != newPrices.length) revert LengthMismatch();
        for (uint256 i = 0; i < playerTokens.length; i++) {
            if (newPrices[i] == 0) revert ZeroPrice();
            uint256 oldPrice = _prices[playerTokens[i]].price;
            _prices[playerTokens[i]] =
                PriceData({price: newPrices[i], updatedAt: block.timestamp});
            emit PriceUpdated(playerTokens[i], oldPrice, newPrices[i], block.timestamp);
        }
    }

    /// @notice Read the latest price for a player token.
    /// @param playerToken Address of the player's ERC-20 token.
    /// @return price     Latest price per share in USDC (6 decimals).
    /// @return updatedAt Timestamp the price was last written.
    function getPrice(address playerToken)
        external
        view
        returns (uint256 price, uint256 updatedAt)
    {
        PriceData memory data = _prices[playerToken];
        if (data.updatedAt == 0) revert PriceNotSet(playerToken);
        return (data.price, data.updatedAt);
    }

    /// @notice Convenience read returning only the price value.
    /// @param playerToken Address of the player's ERC-20 token.
    /// @return Latest price per share in USDC (6 decimals).
    function latestPrice(address playerToken) external view returns (uint256) {
        PriceData memory data = _prices[playerToken];
        if (data.updatedAt == 0) revert PriceNotSet(playerToken);
        return data.price;
    }
}
