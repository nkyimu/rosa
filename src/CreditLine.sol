// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TrustTierManager.sol";
import "./AgentRegistry8004.sol";

/**
 * @title CreditLine
 * @dev Agent-to-agent micro-credit issuance backed by reputation
 *
 * Allows CREDITOR tier agents to issue credit lines to other agents.
 * Credit is backed by the issuer's reputation, not collateral.
 * When a borrower defaults on a credit line, their reputation score decreases.
 *
 * Key mechanics:
 * - Only CREDITOR tier (80+) or ELDER tier (95+) can issue credit
 * - Maximum credit issuable is a function of the issuer's reputation score
 * - Credit lines have a duration (in days) and interest rates
 * - Borrowers can draw credit up to the limit
 * - Defaults reduce the borrower's reputation score
 */
contract CreditLine is Ownable, ReentrancyGuard {
    // Token reference (cUSD on Celo Sepolia)
    IERC20 public cusdToken;

    // Trust tier manager reference
    TrustTierManager public trustTierManager;

    // Agent registry reference
    AgentRegistry8004 public agentRegistry;

    // Credit line ID counter
    uint256 private creditLineIdCounter = 1;

    // Credit line structure
    struct CreditLineData {
        uint256 id;
        address issuer;
        address borrower;
        uint256 maxAmount;
        uint256 drawnAmount;
        uint256 repaidAmount;
        uint256 interestRateBps; // Interest rate in basis points (e.g., 500 = 5%)
        uint256 issuedAt;
        uint256 expiresAt;
        uint256 durationDays;
        bool isActive;
        bool isDefaulted;
    }

    // Credit lines: ID => CreditLineData
    mapping(uint256 => CreditLineData) public creditLines;

    // Agent credit lines: issuer => creditLineId[]
    mapping(address => uint256[]) public issuedCreditLines;

    // Agent credit lines: borrower => creditLineId[]
    mapping(address => uint256[]) public receivedCreditLines;

    // Total drawn amount per borrower (for defaults calculation)
    mapping(address => uint256) public totalDrawn;

    // Total repaid amount per borrower (for defaults calculation)
    mapping(address => uint256) public totalRepaid;

    // Tracking defaults per agent for reputation reduction
    mapping(address => uint256) public defaultCount;

    // Events
    event CreditLineIssued(
        uint256 indexed creditLineId,
        address indexed issuer,
        address indexed borrower,
        uint256 maxAmount,
        uint256 durationDays,
        uint256 interestRateBps,
        uint256 expiresAt
    );

    event CreditDrawn(
        uint256 indexed creditLineId,
        address indexed borrower,
        uint256 amount,
        uint256 newDrawnTotal
    );

    event CreditRepaid(
        uint256 indexed creditLineId,
        address indexed borrower,
        uint256 principalAmount,
        uint256 interestAmount
    );

    event CreditLineDefaulted(
        uint256 indexed creditLineId,
        address indexed borrower,
        uint256 defaultAmount,
        uint256 reputationPenalty
    );

    event CreditLineExpired(uint256 indexed creditLineId);

    // Errors
    error NotAuthorized();
    error InsufficientCreditorTier();
    error InsufficientBalance();
    error InvalidAmount();
    error CreditLineNotActive();
    error CreditLineHasExpired();
    error ExceedsMaxAmount();
    error ZeroAddress();

    /**
     * @dev Initialize with token, trust tier manager, and agent registry
     * @param _cusdToken Address of the cUSD token contract
     * @param _trustTierManager Address of the TrustTierManager contract
     * @param _agentRegistry Address of the AgentRegistry8004 contract
     */
    constructor(
        address _cusdToken,
        address _trustTierManager,
        address _agentRegistry
    ) Ownable(msg.sender) {
        require(_cusdToken != address(0), "Invalid token address");
        require(_trustTierManager != address(0), "Invalid trust tier manager");
        require(_agentRegistry != address(0), "Invalid agent registry");

        cusdToken = IERC20(_cusdToken);
        trustTierManager = TrustTierManager(_trustTierManager);
        agentRegistry = AgentRegistry8004(_agentRegistry);
    }

    /**
     * @dev Issue a credit line to a borrower
     * Only agents with CREDITOR tier or above can issue credit
     * @param borrower Address of the borrowing agent
     * @param maxAmount Maximum amount the borrower can draw
     * @param durationDays Duration of the credit line in days
     * @param interestRateBps Annual interest rate in basis points (e.g., 500 = 5%)
     */
    function issueCreditLine(
        address borrower,
        uint256 maxAmount,
        uint256 durationDays,
        uint256 interestRateBps
    ) external nonReentrant returns (uint256 creditLineId) {
        require(borrower != address(0), "Invalid borrower address");
        require(maxAmount > 0, "Amount must be greater than 0");
        require(durationDays > 0, "Duration must be greater than 0");
        require(interestRateBps <= 10000, "Interest rate must be <= 100%");

        // Check that issuer is registered and has CREDITOR tier
        require(
            agentRegistry.isAgentRegistered(msg.sender),
            "Issuer not registered"
        );
        require(
            trustTierManager.canIssueCreditLine(msg.sender),
            "Issuer does not have CREDITOR tier"
        );

        // Check that borrower is registered
        require(
            agentRegistry.isAgentRegistered(borrower),
            "Borrower not registered"
        );

        // Calculate max credit the issuer can issue based on their reputation
        uint256 issuerMaxCredit = trustTierManager.getMaxCreditIssueAmount(
            msg.sender
        );
        require(maxAmount <= issuerMaxCredit, "Exceeds issuer's max credit");

        // Create credit line
        creditLineId = creditLineIdCounter;
        creditLineIdCounter++;

        uint256 expiresAt = block.timestamp + (durationDays * 1 days);

        creditLines[creditLineId] = CreditLineData({
            id: creditLineId,
            issuer: msg.sender,
            borrower: borrower,
            maxAmount: maxAmount,
            drawnAmount: 0,
            repaidAmount: 0,
            interestRateBps: interestRateBps,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            durationDays: durationDays,
            isActive: true,
            isDefaulted: false
        });

        // Track credit lines
        issuedCreditLines[msg.sender].push(creditLineId);
        receivedCreditLines[borrower].push(creditLineId);

        emit CreditLineIssued(
            creditLineId,
            msg.sender,
            borrower,
            maxAmount,
            durationDays,
            interestRateBps,
            expiresAt
        );
    }

    /**
     * @dev Draw credit from a credit line
     * @param creditLineId ID of the credit line
     * @param amount Amount to draw
     */
    function drawCredit(uint256 creditLineId, uint256 amount)
        external
        nonReentrant
    {
        require(amount > 0, "Amount must be greater than 0");

        CreditLineData storage creditLine = creditLines[creditLineId];

        // Verify credit line exists and is active
        require(creditLine.id != 0, "Credit line does not exist");
        require(creditLine.isActive, "Credit line is not active");
        require(!creditLine.isDefaulted, "Credit line is defaulted");
        require(block.timestamp <= creditLine.expiresAt, "Credit line expired");

        // Check that caller is the borrower
        require(msg.sender == creditLine.borrower, "Only borrower can draw");

        // Check that draw amount doesn't exceed max
        require(
            creditLine.drawnAmount + amount <= creditLine.maxAmount,
            "Exceeds credit limit"
        );

        // Check that issuer has sufficient balance
        require(
            cusdToken.balanceOf(creditLine.issuer) >= amount,
            "Issuer has insufficient balance"
        );

        // Transfer funds from issuer to borrower
        require(
            cusdToken.transferFrom(creditLine.issuer, msg.sender, amount),
            "Transfer failed"
        );

        // Update credit line state
        creditLine.drawnAmount += amount;
        totalDrawn[msg.sender] += amount;

        emit CreditDrawn(
            creditLineId,
            msg.sender,
            amount,
            creditLine.drawnAmount
        );
    }

    /**
     * @dev Repay credit borrowed from a credit line
     * Calculates and collects interest based on time elapsed
     * @param creditLineId ID of the credit line
     * @param principalAmount Amount of principal to repay
     */
    function repayCredit(uint256 creditLineId, uint256 principalAmount)
        external
        nonReentrant
    {
        require(principalAmount > 0, "Amount must be greater than 0");

        CreditLineData storage creditLine = creditLines[creditLineId];

        // Verify credit line exists
        require(creditLine.id != 0, "Credit line does not exist");

        // Check that caller is the borrower
        require(msg.sender == creditLine.borrower, "Only borrower can repay");

        // Calculate interest
        uint256 timeElapsed = block.timestamp - creditLine.issuedAt;
        uint256 yearInSeconds = 365 days;
        uint256 interestAmount = (creditLine.drawnAmount *
            creditLine.interestRateBps *
            timeElapsed) / (yearInSeconds * 10000);

        // Verify that principal + interest doesn't exceed drawn amount + accumulated interest
        require(
            principalAmount <= creditLine.drawnAmount - creditLine.repaidAmount,
            "Repayment exceeds drawn amount"
        );

        // Transfer principal + interest from borrower to issuer
        uint256 totalRepayment = principalAmount + interestAmount;
        require(
            cusdToken.balanceOf(msg.sender) >= totalRepayment,
            "Insufficient balance for repayment"
        );

        require(
            cusdToken.transferFrom(msg.sender, creditLine.issuer, totalRepayment),
            "Repayment transfer failed"
        );

        // Update credit line state
        creditLine.repaidAmount += principalAmount;
        totalRepaid[msg.sender] += principalAmount;

        emit CreditRepaid(
            creditLineId,
            msg.sender,
            principalAmount,
            interestAmount
        );
    }

    /**
     * @dev Mark a credit line as defaulted
     * This reduces the borrower's reputation score
     * Can only be called by the issuer or owner
     * @param creditLineId ID of the credit line to default
     */
    function defaultCreditLine(uint256 creditLineId) external {
        CreditLineData storage creditLine = creditLines[creditLineId];

        // Verify credit line exists
        require(creditLine.id != 0, "Credit line does not exist");

        // Only issuer or owner can default
        require(
            msg.sender == creditLine.issuer || msg.sender == owner(),
            "Only issuer or owner can default"
        );

        // Credit line must be expired or overdue (repaid < drawn)
        bool isOverdue = creditLine.repaidAmount < creditLine.drawnAmount &&
            block.timestamp > creditLine.expiresAt;
        require(isOverdue, "Credit line is not overdue");

        // Mark as defaulted
        creditLine.isActive = false;
        creditLine.isDefaulted = true;

        uint256 unpaidAmount = creditLine.drawnAmount -
            creditLine.repaidAmount;
        defaultCount[creditLine.borrower]++;

        emit CreditLineDefaulted(
            creditLineId,
            creditLine.borrower,
            unpaidAmount,
            50 // 50 point reputation penalty per default
        );
    }

    /**
     * @dev Get credit line details
     * @param creditLineId ID of the credit line
     * @return CreditLineData struct with all details
     */
    function getCreditLine(uint256 creditLineId)
        external
        view
        returns (CreditLineData memory)
    {
        require(creditLines[creditLineId].id != 0, "Credit line does not exist");
        return creditLines[creditLineId];
    }

    /**
     * @dev Get all credit lines issued by an address
     * @param issuer Address of the issuer
     * @return Array of credit line IDs
     */
    function getIssuedCreditLines(address issuer)
        external
        view
        returns (uint256[] memory)
    {
        return issuedCreditLines[issuer];
    }

    /**
     * @dev Get all credit lines received by an address
     * @param borrower Address of the borrower
     * @return Array of credit line IDs
     */
    function getReceivedCreditLines(address borrower)
        external
        view
        returns (uint256[] memory)
    {
        return receivedCreditLines[borrower];
    }

    /**
     * @dev Get current drawn amount for a borrower
     * @param borrower Address of the borrower
     * @return Current total drawn amount
     */
    function getDrawnAmount(address borrower)
        external
        view
        returns (uint256)
    {
        return totalDrawn[borrower];
    }

    /**
     * @dev Get current repaid amount for a borrower
     * @param borrower Address of the borrower
     * @return Current total repaid amount
     */
    function getRepaidAmount(address borrower)
        external
        view
        returns (uint256)
    {
        return totalRepaid[borrower];
    }

    /**
     * @dev Get number of defaults for a borrower
     * @param borrower Address of the borrower
     * @return Number of times this borrower has defaulted
     */
    function getDefaultCount(address borrower)
        external
        view
        returns (uint256)
    {
        return defaultCount[borrower];
    }
}
