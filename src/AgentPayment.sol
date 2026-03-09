// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentPayment
 * @dev x402 payment collection contract for IntentCircles agent
 *
 * Implements HTTP 402 Payment Required protocol for agent fee collection.
 * Agents can collect cUSD fees for intent processing (matching, circle keeping, etc.)
 */
contract AgentPayment is Ownable, ReentrancyGuard {
    /// @dev cUSD token address on Celo Sepolia
    IERC20 public immutable cUSD;

    /// @dev Chain ID (Celo Sepolia = 44787, Celo Mainnet = 42220)
    uint256 public immutable chainId;

    /// @dev Agent fee amount (in cUSD wei)
    uint256 public fee;

    /// @dev Track payments per intent (intentId => payer => amount paid)
    mapping(uint256 => mapping(address => uint256)) public intentPayments;

    /// @dev Track if an intent has been paid for (intentId => hasPaid)
    mapping(uint256 => bool) public paidIntents;

    /// @dev Total collected fees
    uint256 public totalCollected;

    event FeeSet(uint256 indexed newFee, uint256 timestamp);
    event PaymentReceived(
        uint256 indexed intentId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );
    event Withdrawn(address indexed recipient, uint256 amount, uint256 timestamp);

    /**
     * @dev Initialize with cUSD token address
     * @param _cUSD cUSD token address
     * @param _initialFee Initial fee amount (default 0.01 cUSD = 10^16 wei)
     */
    constructor(address _cUSD, uint256 _initialFee) Ownable(msg.sender) {
        require(_cUSD != address(0), "Invalid cUSD address");

        cUSD = IERC20(_cUSD);
        fee = _initialFee;

        // Set chain ID based on block.chainid (Celo Sepolia = 44787)
        chainId = block.chainid;

        emit FeeSet(_initialFee, block.timestamp);
    }

    /**
     * @dev Pay for a service (intent processing)
     * @param intentId The intent being processed
     * @notice Caller must approve this contract to spend fee amount of cUSD
     */
    function payForService(uint256 intentId) external nonReentrant {
        require(fee > 0, "Fee must be greater than zero");
        require(!paidIntents[intentId], "Intent already paid");

        // Transfer cUSD from caller to this contract
        bool success = cUSD.transferFrom(msg.sender, address(this), fee);
        require(success, "cUSD transfer failed");

        // Mark intent as paid
        paidIntents[intentId] = true;
        intentPayments[intentId][msg.sender] = fee;
        totalCollected += fee;

        emit PaymentReceived(intentId, msg.sender, fee, block.timestamp);
    }

    /**
     * @dev Set the fee amount (only owner)
     * @param newFee New fee amount in cUSD wei
     */
    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
        emit FeeSet(newFee, block.timestamp);
    }

    /**
     * @dev Get current fee
     * @return Current fee in cUSD wei
     */
    function getFee() external view returns (uint256) {
        return fee;
    }

    /**
     * @dev Check if an intent has been paid
     * @param intentId The intent to check
     * @return True if the intent has been paid
     */
    function hasPaid(uint256 intentId) external view returns (bool) {
        return paidIntents[intentId];
    }

    /**
     * @dev Get payment details for x402 response headers
     * @return payTo The payment recipient (this contract)
     * @return amount The required payment amount
     * @return token The token address (cUSD)
     * @return chainIdValue The chain ID
     * @return network The network name
     */
    function paymentDetails()
        external
        view
        returns (
            address payTo,
            uint256 amount,
            address token,
            uint256 chainIdValue,
            string memory network
        )
    {
        payTo = address(this);
        amount = fee;
        token = address(cUSD);
        chainIdValue = chainId;
        network = (chainId == 44787) ? "celo-sepolia" : "celo-mainnet";
    }

    /**
     * @dev Withdraw collected fees (only owner)
     * @notice Transfers all collected fees to owner
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = cUSD.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");

        bool success = cUSD.transfer(owner(), balance);
        require(success, "Withdrawal failed");

        emit Withdrawn(owner(), balance, block.timestamp);
    }

    /**
     * @dev Get contract balance
     * @return cUSD balance of this contract
     */
    function getBalance() external view returns (uint256) {
        return cUSD.balanceOf(address(this));
    }

    /**
     * @dev Get total fees collected
     * @return Total amount collected across all intents
     */
    function getTotalCollected() external view returns (uint256) {
        return totalCollected;
    }
}
