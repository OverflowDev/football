// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PlayerToken
/// @notice ERC-20 share token representing fractional ownership of a single
///         football player on the FPI platform (e.g. $YAMAL, $BELLINGHAM).
/// @dev    Each player gets its own PlayerToken with a fixed max supply of
///         10,000,000 shares. The platform (FootballMarket contract) is the
///         owner and the only minter; holders may burn their own shares.
contract PlayerToken is ERC20, ERC20Burnable, Ownable {
    /// @notice Maximum number of shares that can ever exist for this player.
    uint256 public constant MAX_SUPPLY = 10_000_000 * 1e18;

    /// @notice The off-chain player identifier this token represents.
    uint256 public immutable playerId;

    /// @notice Emitted when the platform mints new shares into circulation.
    /// @param to     Recipient of the minted shares.
    /// @param amount Amount of shares minted (18 decimals).
    event SharesMinted(address indexed to, uint256 amount);

    error MaxSupplyExceeded(uint256 attempted, uint256 cap);

    /// @param name_     Human readable token name, e.g. "Lamine Yamal Shares".
    /// @param symbol_   Ticker symbol, e.g. "$YAMAL".
    /// @param playerId_ Off-chain player id this token maps to.
    /// @param owner_    Platform address that owns/controls minting.
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 playerId_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        playerId = playerId_;
    }

    /// @notice Mint new player shares. Only the owning platform contract may call.
    /// @dev    Reverts if minting would push total supply beyond MAX_SUPPLY.
    /// @param to     Address receiving the freshly minted shares.
    /// @param amount Amount of shares to mint (18 decimals).
    function mint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert MaxSupplyExceeded(totalSupply() + amount, MAX_SUPPLY);
        }
        _mint(to, amount);
        emit SharesMinted(to, amount);
    }

    /// @notice Remaining shares that can still be minted before hitting the cap.
    /// @return The mintable headroom in 18-decimal units.
    function mintableRemaining() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
