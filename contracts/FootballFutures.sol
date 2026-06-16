// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFootballMarket {
    function getPlayerPrice(address playerToken) external view returns (uint256);
}

/// @title FootballFutures
/// @notice On-chain leveraged long/short positions on FPI player prices, with
///         USDC collateral and liquidation. Mark prices are read from the
///         FootballMarket contract (which the platform oracle keeps updated).
/// @dev    USDC has 6 decimals; player share `size` is 18 decimals; price is
///         USDC (6dp) per ONE whole share (1e18). Winning P&L is paid from the
///         contract's USDC pool (seeded by the platform + losing margins).
contract FootballFutures is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS = 50; // 0.5% open fee
    uint256 public constant BPS = 10_000;
    uint8 public constant MAX_LEVERAGE = 10;

    IERC20 public immutable usdc;
    IFootballMarket public immutable market;
    address public treasury;

    struct Position {
        address owner;
        address playerToken;
        bool isLong;
        uint256 size; // 18-dp shares
        uint8 leverage;
        uint256 entryPrice; // USDC 6dp per whole share
        uint256 margin; // USDC 6dp collateral
        bool open;
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextId = 1;
    mapping(address => uint256[]) private _userPositions;

    event PositionOpened(
        uint256 indexed id,
        address indexed owner,
        address indexed playerToken,
        bool isLong,
        uint256 size,
        uint8 leverage,
        uint256 entryPrice,
        uint256 margin
    );
    event PositionClosed(uint256 indexed id, address indexed owner, uint256 payout, int256 pnl);
    event PositionLiquidated(uint256 indexed id, address indexed owner, address indexed liquidator);

    error ZeroAddress();
    error InvalidLeverage();
    error ZeroSize();
    error NotOwner();
    error NotOpen();
    error NotLiquidatable();
    error InsufficientPool(uint256 needed, uint256 available);

    constructor(address usdc_, address market_, address treasury_) Ownable(msg.sender) {
        if (usdc_ == address(0) || market_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        market = IFootballMarket(market_);
        treasury = treasury_;
    }

    function setTreasury(address t) external onlyOwner {
        if (t == address(0)) revert ZeroAddress();
        treasury = t;
    }

    /// @notice Seed the USDC pool used to pay out winning positions.
    function fundPool(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @dev USDC (6dp) notional for `size` (18dp) shares at `price` (6dp/share).
    function _notional(uint256 price, uint256 size) internal pure returns (uint256) {
        return (price * size) / 1e18;
    }

    /// @notice Open a leveraged position. Pulls margin + fee in USDC.
    /// @param playerToken Player share token to track.
    /// @param isLong      True for long, false for short.
    /// @param size        Position size in 18-dp shares.
    /// @param leverage    1..MAX_LEVERAGE.
    /// @return id         The new position id.
    function openPosition(address playerToken, bool isLong, uint256 size, uint8 leverage)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (leverage == 0 || leverage > MAX_LEVERAGE) revert InvalidLeverage();
        if (size == 0) revert ZeroSize();

        uint256 price = market.getPlayerPrice(playerToken); // reverts if no market
        uint256 notional = _notional(price, size);
        uint256 margin = notional / leverage;
        uint256 fee = (notional * FEE_BPS) / BPS;

        usdc.safeTransferFrom(msg.sender, address(this), margin + fee);
        usdc.safeTransfer(treasury, fee);

        id = nextId++;
        positions[id] = Position({
            owner: msg.sender,
            playerToken: playerToken,
            isLong: isLong,
            size: size,
            leverage: leverage,
            entryPrice: price,
            margin: margin,
            open: true
        });
        _userPositions[msg.sender].push(id);

        emit PositionOpened(id, msg.sender, playerToken, isLong, size, leverage, price, margin);
    }

    /// @dev Signed P&L in USDC (6dp) at the given mark price.
    function _pnl(Position memory p, uint256 mark) internal pure returns (int256) {
        int256 entry = int256(p.entryPrice);
        int256 m = int256(mark);
        int256 delta = p.isLong ? (m - entry) : (entry - m);
        return (delta * int256(p.size)) / 1e18;
    }

    /// @notice Current P&L and whether the position is liquidatable.
    function positionValue(uint256 id) public view returns (int256 pnl, bool liquidatable) {
        Position memory p = positions[id];
        if (!p.open) return (0, false);
        uint256 mark = market.getPlayerPrice(p.playerToken);
        pnl = _pnl(p, mark);
        liquidatable = pnl <= -int256(p.margin);
    }

    /// @notice Close your own position; pays out margin + P&L (floored at 0).
    function closePosition(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        if (!p.open) revert NotOpen();
        if (p.owner != msg.sender) revert NotOwner();

        uint256 mark = market.getPlayerPrice(p.playerToken);
        int256 pnl = _pnl(p, mark);

        uint256 payout;
        if (pnl <= -int256(p.margin)) {
            payout = 0; // wiped out
        } else {
            payout = uint256(int256(p.margin) + pnl);
        }
        p.open = false;

        if (payout > 0) {
            uint256 bal = usdc.balanceOf(address(this));
            if (payout > bal) revert InsufficientPool(payout, bal);
            usdc.safeTransfer(msg.sender, payout);
        }
        emit PositionClosed(id, p.owner, payout, pnl);
    }

    /// @notice Liquidate an underwater position. Margin is retained by the pool.
    function liquidate(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        if (!p.open) revert NotOpen();
        uint256 mark = market.getPlayerPrice(p.playerToken);
        if (_pnl(p, mark) > -int256(p.margin)) revert NotLiquidatable();
        p.open = false;
        emit PositionLiquidated(id, p.owner, msg.sender);
    }

    /// @notice All position ids ever opened by a user (filter by `open`).
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return _userPositions[user];
    }
}
