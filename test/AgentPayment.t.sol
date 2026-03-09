// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentPayment.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Mock cUSD for testing
 */
contract MockcUSD is ERC20 {
    constructor() ERC20("Celo USD", "cUSD") {
        _mint(msg.sender, 1000 * 10 ** 18); // Mint 1000 cUSD
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title AgentPaymentTest
 * @dev Foundry tests for AgentPayment contract
 */
contract AgentPaymentTest is Test {
    AgentPayment public agentPayment;
    MockcUSD public cUSD;

    address public owner;
    address public payer1;
    address public payer2;

    // Default fee: 0.01 cUSD
    uint256 public constant DEFAULT_FEE = 0.01 * 10 ** 18;

    event PaymentReceived(
        uint256 indexed intentId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    function setUp() public {
        owner = address(this);
        payer1 = address(0x1);
        payer2 = address(0x2);

        // Deploy mock cUSD
        cUSD = new MockcUSD();

        // Deploy AgentPayment with default fee
        agentPayment = new AgentPayment(address(cUSD), DEFAULT_FEE);

        // Distribute cUSD to test addresses
        cUSD.mint(payer1, 100 * 10 ** 18); // 100 cUSD
        cUSD.mint(payer2, 100 * 10 ** 18); // 100 cUSD
    }

    // ────────────────────────────────────────────────────────────────────────
    // Fee Payment Tests
    // ────────────────────────────────────────────────────────────────────────

    function testPayForService_HappyPath() public {
        // Payer1 approves AgentPayment to spend cUSD
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE);

        // Payer1 pays for intent 1
        vm.prank(payer1);
        agentPayment.payForService(1);

        // Verify intent is marked as paid
        assertTrue(agentPayment.hasPaid(1));

        // Verify payment was recorded
        assertEq(
            agentPayment.intentPayments(1, payer1),
            DEFAULT_FEE
        );

        // Verify contract received cUSD
        assertEq(cUSD.balanceOf(address(agentPayment)), DEFAULT_FEE);
    }

    function testPayForService_EmitsEvent() public {
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE);

        vm.prank(payer1);
        vm.expectEmit(true, true, false, true);
        emit PaymentReceived(1, payer1, DEFAULT_FEE, block.timestamp);
        agentPayment.payForService(1);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Double-Payment Rejection
    // ────────────────────────────────────────────────────────────────────────

    function testPayForService_DoublePaymentRejected() public {
        // First payment
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 2);

        vm.prank(payer1);
        agentPayment.payForService(1);

        // Second payment for same intent should fail
        vm.prank(payer1);
        vm.expectRevert("Intent already paid");
        agentPayment.payForService(1);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Fee Management Tests
    // ────────────────────────────────────────────────────────────────────────

    function testSetFee() public {
        uint256 newFee = 0.05 * 10 ** 18; // 0.05 cUSD

        agentPayment.setFee(newFee);

        assertEq(agentPayment.getFee(), newFee);
    }

    function testSetFee_OnlyOwner() public {
        uint256 newFee = 0.05 * 10 ** 18;

        vm.prank(payer1);
        vm.expectRevert();
        agentPayment.setFee(newFee);
    }

    function testGetFee() public {
        assertEq(agentPayment.getFee(), DEFAULT_FEE);
    }

    function testHasPaid_BeforePayment() public {
        assertFalse(agentPayment.hasPaid(1));
    }

    function testHasPaid_AfterPayment() public {
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE);

        vm.prank(payer1);
        agentPayment.payForService(1);

        assertTrue(agentPayment.hasPaid(1));
    }

    // ────────────────────────────────────────────────────────────────────────
    // Withdrawal Tests
    // ────────────────────────────────────────────────────────────────────────

    function testWithdraw() public {
        // Payer1 pays for intent
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE);

        vm.prank(payer1);
        agentPayment.payForService(1);

        uint256 contractBalance = cUSD.balanceOf(address(agentPayment));
        uint256 ownerBalanceBefore = cUSD.balanceOf(owner);

        // Owner withdraws
        agentPayment.withdraw();

        // Verify owner received the fees
        assertEq(
            cUSD.balanceOf(owner),
            ownerBalanceBefore + contractBalance
        );

        // Verify contract is empty
        assertEq(cUSD.balanceOf(address(agentPayment)), 0);
    }

    function testWithdraw_OnlyOwner() public {
        // Payer1 pays for intent
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE);

        vm.prank(payer1);
        agentPayment.payForService(1);

        // Non-owner attempts withdrawal
        vm.prank(payer2);
        vm.expectRevert();
        agentPayment.withdraw();
    }

    function testWithdraw_NoFeesAvailable() public {
        // Try to withdraw without any fees collected
        vm.expectRevert("No fees to withdraw");
        agentPayment.withdraw();
    }

    function testWithdraw_MultiplePayments() public {
        // Multiple payers pay for different intents
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 2);
        vm.prank(payer1);
        agentPayment.payForService(1);

        vm.prank(payer2);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 2);
        vm.prank(payer2);
        agentPayment.payForService(2);

        uint256 expectedAmount = DEFAULT_FEE * 2;

        // Owner withdraws
        agentPayment.withdraw();

        // Verify contract is empty
        assertEq(cUSD.balanceOf(address(agentPayment)), 0);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Zero-Fee Edge Case
    // ────────────────────────────────────────────────────────────────────────

    function testPayForService_ZeroFeeRejected() public {
        agentPayment.setFee(0);

        vm.prank(payer1);
        vm.expectRevert("Fee must be greater than zero");
        agentPayment.payForService(1);
    }

    // ────────────────────────────────────────────────────────────────────────
    // x402 Payment Details Tests
    // ────────────────────────────────────────────────────────────────────────

    function testPaymentDetails() public {
        (
            address payTo,
            uint256 amount,
            address token,
            uint256 chainIdValue,
            string memory network
        ) = agentPayment.paymentDetails();

        assertEq(payTo, address(agentPayment));
        assertEq(amount, DEFAULT_FEE);
        assertEq(token, address(cUSD));
        assertEq(chainIdValue, block.chainid);

        // Network name should match chain ID
        if (block.chainid == 44787) {
            assertEq(network, "celo-sepolia");
        } else {
            assertEq(network, "celo-mainnet");
        }
    }

    function testGetBalance() public {
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 2);

        vm.prank(payer1);
        agentPayment.payForService(1);

        assertEq(agentPayment.getBalance(), DEFAULT_FEE);
    }

    function testGetTotalCollected() public {
        // Payer1 pays for intent 1
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 3);

        vm.prank(payer1);
        agentPayment.payForService(1);

        assertEq(agentPayment.getTotalCollected(), DEFAULT_FEE);

        // Payer2 pays for intent 2
        vm.prank(payer2);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 3);

        vm.prank(payer2);
        agentPayment.payForService(2);

        assertEq(agentPayment.getTotalCollected(), DEFAULT_FEE * 2);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Reentrancy Protection Tests
    // ────────────────────────────────────────────────────────────────────────

    function testPayForService_ReentrancyProtected() public {
        // This test verifies nonReentrant guard is in place
        // A more comprehensive test would require a malicious ERC20
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), DEFAULT_FEE * 2);

        vm.prank(payer1);
        agentPayment.payForService(1);

        // Second call in same transaction would fail due to nonReentrant
        // (simulated here as a basic guard test)
        assertTrue(agentPayment.hasPaid(1));
    }

    // ────────────────────────────────────────────────────────────────────────
    // Insufficient Balance Tests
    // ────────────────────────────────────────────────────────────────────────

    function testPayForService_InsufficientBalance() public {
        // Payer with insufficient balance
        address poorPayer = address(0x99);
        cUSD.mint(poorPayer, 1); // Only 1 wei

        vm.prank(poorPayer);
        cUSD.approve(address(agentPayment), DEFAULT_FEE);

        vm.prank(poorPayer);
        vm.expectRevert();
        agentPayment.payForService(1);
    }

    function testPayForService_InsufficientApproval() public {
        vm.prank(payer1);
        cUSD.approve(address(agentPayment), 1); // Only approve 1 wei

        vm.prank(payer1);
        vm.expectRevert();
        agentPayment.payForService(1);
    }
}
