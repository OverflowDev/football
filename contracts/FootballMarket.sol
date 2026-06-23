// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PlayerToken} from "./PlayerToken.sol";

/// @title FootballMarket
/// @notice Core platform contract for the Football Performance Index (FPI).
///         Deploys per-player ERC-20 share tokens, runs a USDC-denominated
///         buy/sell market with a 0.5% trading fee, accepts oracle-pushed
///         price updates, and distributes a share of fees to holders.
/// @dev    USDC is assumed to have 6 decimals; player tokens have 18 decimals.
///         Price is quoted as USDC (6 decimals) per ONE whole share (1e18).
contract FootballMarket is Ownable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role allowed to push price updates (the backend oracle signer).
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    /// @notice Trading fee in basis points (50 = 0.5%).
    uint256 public constant FEE_BPS = 50;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Portion of collected fees reserved for holder dividends (10%).
    uint256 public constant DIVIDEND_SHARE_BPS = 1_000;

    /// @notice USDC token used for settlement.
    IERC20 public immutable usdc;

    /// @notice Treasury address that receives the platform's fee share.
    address public treasury;

    struct PlayerMarket {
        PlayerToken token; // ERC-20 share token
        uint256 price; // USDC (6dp) per whole share
        bool exists;
    }

    /// @notice Market data keyed by player token address.
    mapping(address => PlayerMarket) public markets;

    /// @notice All deployed player token addresses (for enumeration).
    address[] public allPlayerTokens;

    /// @notice Per-user list of player tokens they have ever held.
    mapping(address => address[]) private _userTokens;
    mapping(address => mapping(address => bool)) private _userHasToken;

    /// @notice USDC accrued to the dividend pool from fees, awaiting distribution.
    uint256 public dividendPool;

    /// @notice Claimable dividend amount per user for the current epoch.
    mapping(address => uint256) public dividendsClaimable;

    // ───────────────────────────── Events ─────────────────────────────

    /// @notice Emitted when a new player share token is deployed.
    event PlayerTokenDeployed(
        address indexed playerToken,
        string name,
        string symbol,
        uint256 initialPrice
    );

    /// @notice Emitted when an existing (e.g. IPO) token is listed on the market.
    event ExternalTokenListed(
        address indexed playerToken,
        uint256 initialPrice,
        uint256 inventory
    );

    /// @notice Emitted when a user buys shares.
    event SharesBought(
        address indexed user,
        address indexed playerToken,
        uint256 amount,
        uint256 price
    );

    /// @notice Emitted when a user sells shares.
    event SharesSold(
        address indexed user,
        address indexed playerToken,
        uint256 amount,
        uint256 price
    );

    /// @notice Emitted when a player's price is updated by the oracle.
    event PriceUpdated(address indexed playerToken, uint256 oldPrice, uint256 newPrice);

    /// @notice Emitted when a user claims their accrued dividends.
    event DividendsClaimed(address indexed user, uint256 amount);

    /// @notice Emitted when the owner allocates dividends to a holder.
    event DividendsAllocated(address indexed user, uint256 amount);

    // ───────────────────────────── Errors ─────────────────────────────

    error MarketNotFound(address playerToken);
    error MarketAlreadyExists(string symbol);
    error ZeroAmount();
    error ZeroPrice();
    error InsufficientShares(uint256 requested, uint256 available);
    error NothingToClaim();
    error InsufficientDividendPool(uint256 requested, uint256 available);
    error ZeroAddress();

    /// @param usdc_     Address of the USDC token (6 decimals).
    /// @param treasury_ Address receiving platform fees.
    constructor(address usdc_, address treasury_) Ownable(msg.sender) {
        if (usdc_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    // ──────────────────────────── Admin ───────────────────────────────

    /// @notice Update the treasury address that receives platform fees.
    /// @param newTreasury The new treasury address.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
    }

    /// @notice Deploy a brand-new player share token and open its market.
    /// @dev    The platform mints the full supply to itself so it can sell
    ///         shares into the market. Only the owner can deploy markets.
    /// @param name        Token name, e.g. "Lamine Yamal Shares".
    /// @param symbol      Ticker, e.g. "$YAMAL".
    /// @param initialPrice Opening price per whole share in USDC (6 decimals).
    /// @return playerTokenAddr Address of the newly deployed PlayerToken.
    function deployPlayerToken(
        string calldata name,
        string calldata symbol,
        uint256 initialPrice
    ) external onlyOwner returns (address playerTokenAddr) {
        if (initialPrice == 0) revert ZeroPrice();

        PlayerToken token = new PlayerToken(name, symbol, allPlayerTokens.length + 1, address(this));
        // Mint the full max supply to the platform as the market maker.
        token.mint(address(this), token.MAX_SUPPLY());

        playerTokenAddr = address(token);
        markets[playerTokenAddr] = PlayerMarket({token: token, price: initialPrice, exists: true});
        allPlayerTokens.push(playerTokenAddr);

        emit PlayerTokenDeployed(playerTokenAddr, name, symbol, initialPrice);
    }

    /// @notice List an ALREADY-deployed player token (e.g. one distributed by an
    ///         IPO) on the spot market and optionally seed sell-side inventory.
    /// @dev    Pulls `inventory` tokens from the owner into the market as the
    ///         market maker's stock (approve this contract first). USDC for
    ///         buybacks is shared market-wide — fund the market separately.
    /// @param playerToken Address of the existing PlayerToken to list.
    /// @param initialPrice Opening price per whole share in USDC (6 decimals).
    /// @param inventory   Shares (18dp) to pull from the owner as sell inventory.
    function listExternalToken(
        address playerToken,
        uint256 initialPrice,
        uint256 inventory
    ) external onlyOwner {
        if (playerToken == address(0)) revert ZeroAddress();
        if (initialPrice == 0) revert ZeroPrice();
        if (markets[playerToken].exists) revert MarketAlreadyExists("");

        markets[playerToken] = PlayerMarket({
            token: PlayerToken(playerToken),
            price: initialPrice,
            exists: true
        });
        allPlayerTokens.push(playerToken);

        if (inventory > 0) {
            IERC20(playerToken).safeTransferFrom(msg.sender, address(this), inventory);
        }
        emit ExternalTokenListed(playerToken, initialPrice, inventory);
    }

    // ──────────────────────────── Trading ─────────────────────────────

    /// @notice Buy `amount` player shares with USDC at the current price.
    /// @dev    Pulls (cost + fee) USDC from the buyer, sends the fee split to
    ///         treasury + dividend pool, and transfers shares from the
    ///         platform's inventory to the buyer. Reverts if inventory is low.
    /// @param playerToken Address of the player's share token.
    /// @param amount      Number of shares to buy (18 decimals).
    function buyShares(address playerToken, uint256 amount)
        external
        nonReentrant
    {
        PlayerMarket storage market = markets[playerToken];
        if (!market.exists) revert MarketNotFound(playerToken);
        if (amount == 0) revert ZeroAmount();

        uint256 cost = _quote(market.price, amount);
        uint256 fee = (cost * FEE_BPS) / BPS_DENOMINATOR;
        uint256 total = cost + fee;

        // Pull funds from buyer.
        usdc.safeTransferFrom(msg.sender, address(this), total);

        // Distribute fee: 10% to dividend pool, remainder to treasury.
        uint256 dividendCut = (fee * DIVIDEND_SHARE_BPS) / BPS_DENOMINATOR;
        dividendPool += dividendCut;
        usdc.safeTransfer(treasury, fee - dividendCut);

        // Deliver shares from platform inventory.
        uint256 inventory = market.token.balanceOf(address(this));
        if (inventory < amount) revert InsufficientShares(amount, inventory);
        market.token.transfer(msg.sender, amount);

        _trackUserToken(msg.sender, playerToken);
        emit SharesBought(msg.sender, playerToken, amount, market.price);
    }

    /// @notice Sell `amount` player shares back to the platform for USDC.
    /// @dev    Pulls shares from the seller, returns (proceeds − fee) USDC.
    ///         The fee is split between treasury and the dividend pool.
    /// @param playerToken Address of the player's share token.
    /// @param amount      Number of shares to sell (18 decimals).
    function sellShares(address playerToken, uint256 amount)
        external
        nonReentrant
    {
        PlayerMarket storage market = markets[playerToken];
        if (!market.exists) revert MarketNotFound(playerToken);
        if (amount == 0) revert ZeroAmount();

        uint256 sellerBalance = market.token.balanceOf(msg.sender);
        if (sellerBalance < amount) revert InsufficientShares(amount, sellerBalance);

        uint256 proceeds = _quote(market.price, amount);
        uint256 fee = (proceeds * FEE_BPS) / BPS_DENOMINATOR;
        uint256 payout = proceeds - fee;

        // Pull shares back into platform inventory.
        market.token.transferFrom(msg.sender, address(this), amount);

        // Fee split.
        uint256 dividendCut = (fee * DIVIDEND_SHARE_BPS) / BPS_DENOMINATOR;
        dividendPool += dividendCut;
        usdc.safeTransfer(treasury, fee - dividendCut);

        // Pay the seller.
        usdc.safeTransfer(msg.sender, payout);

        emit SharesSold(msg.sender, playerToken, amount, market.price);
    }

    /// @dev USDC cost for `amount` (18dp) shares at `price` (6dp per whole share).
    function _quote(uint256 price, uint256 amount) internal pure returns (uint256) {
        return (price * amount) / 1e18;
    }

    // ──────────────────────────── Oracle ──────────────────────────────

    /// @notice Update a player's market price. Only the backend oracle role.
    /// @param playerToken Address of the player's share token.
    /// @param newPrice    New price per whole share in USDC (6 decimals).
    function updatePrice(address playerToken, uint256 newPrice)
        external
        onlyRole(ORACLE_ROLE)
    {
        PlayerMarket storage market = markets[playerToken];
        if (!market.exists) revert MarketNotFound(playerToken);
        if (newPrice == 0) revert ZeroPrice();
        uint256 oldPrice = market.price;
        market.price = newPrice;
        emit PriceUpdated(playerToken, oldPrice, newPrice);
    }

    /// @notice Batch price update for many players (cron job efficiency).
    /// @param playerTokens Array of player token addresses.
    /// @param newPrices    Parallel array of new prices (6 decimals).
    function updatePrices(
        address[] calldata playerTokens,
        uint256[] calldata newPrices
    ) external onlyRole(ORACLE_ROLE) {
        require(playerTokens.length == newPrices.length, "length mismatch");
        for (uint256 i = 0; i < playerTokens.length; i++) {
            PlayerMarket storage market = markets[playerTokens[i]];
            if (!market.exists || newPrices[i] == 0) continue;
            uint256 oldPrice = market.price;
            market.price = newPrices[i];
            emit PriceUpdated(playerTokens[i], oldPrice, newPrices[i]);
        }
    }

    /// @notice Get the current market price for a player token.
    /// @param playerToken Address of the player's share token.
    /// @return Current price per whole share in USDC (6 decimals).
    function getPlayerPrice(address playerToken) external view returns (uint256) {
        PlayerMarket storage market = markets[playerToken];
        if (!market.exists) revert MarketNotFound(playerToken);
        return market.price;
    }

    // ─────────────────────────── Portfolio ────────────────────────────

    /// @notice Return all player tokens a user holds along with balances.
    /// @param user The user to query.
    /// @return tokens   Array of player token addresses the user has held.
    /// @return balances Parallel array of the user's current balances.
    function getUserPortfolio(address user)
        external
        view
        returns (address[] memory tokens, uint256[] memory balances)
    {
        address[] memory held = _userTokens[user];
        tokens = held;
        balances = new uint256[](held.length);
        for (uint256 i = 0; i < held.length; i++) {
            balances[i] = PlayerToken(held[i]).balanceOf(user);
        }
    }

    function _trackUserToken(address user, address playerToken) internal {
        if (!_userHasToken[user][playerToken]) {
            _userHasToken[user][playerToken] = true;
            _userTokens[user].push(playerToken);
        }
    }

    /// @notice Number of player markets currently deployed.
    function totalMarkets() external view returns (uint256) {
        return allPlayerTokens.length;
    }

    // ─────────────────────────── Dividends ────────────────────────────

    /// @notice Allocate dividend amounts to holders for the current epoch.
    /// @dev    Called monthly by the platform owner with the top holders and
    ///         their pro-rata share of the dividend pool. Pulls from
    ///         `dividendPool`. Users then call {claimDividends}.
    /// @param holders Addresses eligible for dividends.
    /// @param amounts Parallel array of USDC amounts (6 decimals) to allocate.
    function allocateDividends(
        address[] calldata holders,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(holders.length == amounts.length, "length mismatch");
        uint256 sum;
        for (uint256 i = 0; i < amounts.length; i++) sum += amounts[i];
        if (sum > dividendPool) revert InsufficientDividendPool(sum, dividendPool);
        dividendPool -= sum;
        for (uint256 i = 0; i < holders.length; i++) {
            dividendsClaimable[holders[i]] += amounts[i];
            emit DividendsAllocated(holders[i], amounts[i]);
        }
    }

    /// @notice Claim any dividends allocated to the caller.
    /// @dev    Transfers the caller's full claimable balance in USDC and resets
    ///         it to zero. Protected against reentrancy.
    function claimDividends() external nonReentrant {
        uint256 amount = dividendsClaimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        dividendsClaimable[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit DividendsClaimed(msg.sender, amount);
    }
}
