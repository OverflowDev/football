// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FootballIPO
/// @notice On-chain presale ("Initial Player Offering") for a player's share
///         token, run as a proportional fair launch. A fixed pool of shares is
///         offered; buyers deposit USDC; the **price/token is set collectively**
///         by total demand (clearing price = total raised ÷ shares for sale).
///         After the sale closes, each buyer claims a pro-rata allocation.
/// @dev    USDC has 6 decimals; player share amounts have 18 decimals. The
///         clearing price is USDC (6dp) per ONE whole share.
contract FootballIPO is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public treasury;

    struct Sale {
        IERC20 playerToken;
        uint256 sharesForSale; // 18-dp shares in the pool
        uint64 endsAt;
        uint256 totalRaised; // USDC 6dp
        bool finalized;
    }

    mapping(uint256 => Sale) public sales;
    uint256 public nextSaleId = 1;
    mapping(uint256 => mapping(address => uint256)) public contributions; // saleId => user => USDC
    mapping(uint256 => mapping(address => bool)) public claimed;

    event SaleCreated(uint256 indexed saleId, address indexed playerToken, uint256 sharesForSale, uint64 endsAt);
    event Deposited(uint256 indexed saleId, address indexed user, uint256 amount);
    event Finalized(uint256 indexed saleId, uint256 totalRaised, uint256 clearingPrice);
    event Claimed(uint256 indexed saleId, address indexed user, uint256 shares);

    error ZeroAddress();
    error ZeroAmount();
    error SaleClosed();
    error SaleNotEnded();
    error AlreadyFinalized();
    error NotFinalized();
    error NothingToClaim();
    error AlreadyClaimed();

    constructor(address usdc_, address treasury_) Ownable(msg.sender) {
        if (usdc_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        treasury = treasury_;
    }

    function setTreasury(address t) external onlyOwner {
        if (t == address(0)) revert ZeroAddress();
        treasury = t;
    }

    /// @notice Open a presale. Pulls `sharesForSale` player tokens from the owner
    ///         into the contract (owner must approve first).
    function createSale(address playerToken, uint256 sharesForSale, uint64 endsAt)
        external
        onlyOwner
        returns (uint256 saleId)
    {
        if (playerToken == address(0)) revert ZeroAddress();
        if (sharesForSale == 0) revert ZeroAmount();
        IERC20(playerToken).safeTransferFrom(msg.sender, address(this), sharesForSale);

        saleId = nextSaleId++;
        sales[saleId] = Sale({
            playerToken: IERC20(playerToken),
            sharesForSale: sharesForSale,
            endsAt: endsAt,
            totalRaised: 0,
            finalized: false
        });
        emit SaleCreated(saleId, playerToken, sharesForSale, endsAt);
    }

    /// @notice Deposit USDC into an open sale. The more deposited, the higher the
    ///         clearing price everyone is discovering.
    function deposit(uint256 saleId, uint256 amount) external nonReentrant {
        Sale storage s = sales[saleId];
        if (amount == 0) revert ZeroAmount();
        if (s.finalized || block.timestamp >= s.endsAt) revert SaleClosed();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        contributions[saleId][msg.sender] += amount;
        s.totalRaised += amount;
        emit Deposited(saleId, msg.sender, amount);
    }

    /// @notice Clearing price = total raised ÷ shares for sale (USDC 6dp / whole share).
    function clearingPrice(uint256 saleId) public view returns (uint256) {
        Sale storage s = sales[saleId];
        if (s.totalRaised == 0 || s.sharesForSale == 0) return 0;
        return (s.totalRaised * 1e18) / s.sharesForSale;
    }

    /// @notice A user's pro-rata share allocation (18-dp shares).
    function allocationOf(uint256 saleId, address user) public view returns (uint256) {
        Sale storage s = sales[saleId];
        if (s.totalRaised == 0) return 0;
        return (contributions[saleId][user] * s.sharesForSale) / s.totalRaised;
    }

    /// @notice Close the sale after its deadline and send raised USDC to treasury.
    function finalize(uint256 saleId) external {
        Sale storage s = sales[saleId];
        if (block.timestamp < s.endsAt) revert SaleNotEnded();
        if (s.finalized) revert AlreadyFinalized();
        s.finalized = true;
        if (s.totalRaised > 0) usdc.safeTransfer(treasury, s.totalRaised);
        emit Finalized(saleId, s.totalRaised, clearingPrice(saleId));
    }

    /// @notice Claim your allocated player shares after the sale is finalized.
    function claim(uint256 saleId) external nonReentrant {
        Sale storage s = sales[saleId];
        if (!s.finalized) revert NotFinalized();
        if (claimed[saleId][msg.sender]) revert AlreadyClaimed();
        uint256 shares = allocationOf(saleId, msg.sender);
        if (shares == 0) revert NothingToClaim();
        claimed[saleId][msg.sender] = true;
        s.playerToken.safeTransfer(msg.sender, shares);
        emit Claimed(saleId, msg.sender, shares);
    }
}
