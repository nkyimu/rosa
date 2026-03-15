// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CreditLine.sol";
import "../src/TrustTierManager.sol";
import "../src/AgentRegistry8004.sol";
import "../src/MockcUSD.sol";

contract CreditLineTest is Test {
    CreditLine public creditLine;
    TrustTierManager public tierManager;
    AgentRegistry8004 public registry;
    MockcUSD public cusd;

    address public owner;
    address public issuer; // CREDITOR tier agent
    address public borrower;
    address public another;
    address public reporter;

    function setUp() public {
        owner = address(this);
        issuer = address(0x1111111111111111111111111111111111111111);
        borrower = address(0x2222222222222222222222222222222222222222);
        another = address(0x3333333333333333333333333333333333333333);
        reporter = address(0x5555555555555555555555555555555555555555);

        // Deploy contracts
        registry = new AgentRegistry8004();
        tierManager = new TrustTierManager(address(registry));
        cusd = new MockcUSD();
        creditLine = new CreditLine(address(cusd), address(tierManager), address(registry));

        // Register agents
        vm.prank(issuer);
        registry.registerAgent("Issuer", "http://issuer.test", "ipfs://issuer");

        vm.prank(borrower);
        registry.registerAgent("Borrower", "http://borrower.test", "ipfs://borrower");

        vm.prank(another);
        registry.registerAgent("Another", "http://another.test", "ipfs://another");

        // Authorize reporter
        registry.authorizeReporter(reporter);

        // Set issuer to CREDITOR tier (85% reputation)
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(issuer);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(issuer);
        }

        // Mint cUSD to issuer
        cusd.mint(issuer, 10000 * 1e18);
    }

    // ========== Issue Credit Line Tests ==========

    function test_issueCreditLine_Success() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        assertEq(creditLineId, 1);

        CreditLine.CreditLineData memory cl = creditLine.getCreditLine(creditLineId);
        assertEq(cl.issuer, issuer);
        assertEq(cl.borrower, borrower);
        assertEq(cl.maxAmount, 500 * 1e18);
        assertEq(cl.drawnAmount, 0);
        assertEq(cl.repaidAmount, 0);
        assertEq(cl.interestRateBps, 500);
        assertEq(cl.durationDays, 30);
        assertTrue(cl.isActive);
        assertFalse(cl.isDefaulted);
    }

    function test_issueCreditLine_OnlyCreditorTier() public {
        // Set another to MEMBER tier (60%)
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(reporter);
            registry.reportSuccess(another);
        }
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(reporter);
            registry.reportFailure(another);
        }

        vm.prank(another);
        vm.expectRevert("Issuer does not have CREDITOR tier");
        creditLine.issueCreditLine(borrower, 100 * 1e18, 30, 500);
    }

    function test_issueCreditLine_ExceedsIssuerMaxCredit() public {
        // Issuer has max credit of ~1250 cUSD (85% reputation)
        vm.prank(issuer);
        vm.expectRevert("Exceeds issuer's max credit");
        creditLine.issueCreditLine(borrower, 5000 * 1e18, 30, 500);
    }

    function test_issueCreditLine_InvalidBorrower() public {
        address unregistered = address(0x9999999999999999999999999999999999999999);
        vm.prank(issuer);
        vm.expectRevert("Borrower not registered");
        creditLine.issueCreditLine(unregistered, 100 * 1e18, 30, 500);
    }

    function test_issueCreditLine_InvalidAmount() public {
        vm.prank(issuer);
        vm.expectRevert("Amount must be greater than 0");
        creditLine.issueCreditLine(borrower, 0, 30, 500);
    }

    function test_issueCreditLine_InvalidDuration() public {
        vm.prank(issuer);
        vm.expectRevert("Duration must be greater than 0");
        creditLine.issueCreditLine(borrower, 100 * 1e18, 0, 500);
    }

    function test_issueCreditLine_InvalidInterestRate() public {
        vm.prank(issuer);
        vm.expectRevert("Interest rate must be <= 100%");
        creditLine.issueCreditLine(borrower, 100 * 1e18, 30, 15000);
    }

    function test_issueCreditLine_UnregisteredIssuer() public {
        address notRegistered = address(0x7777777777777777777777777777777777777777);
        vm.prank(notRegistered);
        vm.expectRevert("Issuer not registered");
        creditLine.issueCreditLine(borrower, 100 * 1e18, 30, 500);
    }

    // ========== Draw Credit Tests ==========

    function test_drawCredit_Success() public {
        // Issue credit line
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        // Approve issuer's cUSD for transfer
        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        // Draw credit
        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        CreditLine.CreditLineData memory cl = creditLine.getCreditLine(creditLineId);
        assertEq(cl.drawnAmount, 100 * 1e18);

        // Check borrower received funds
        assertEq(cusd.balanceOf(borrower), 100 * 1e18);
    }

    function test_drawCredit_PartialDraw() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        // Draw 100
        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        // Draw another 200
        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 200 * 1e18);

        CreditLine.CreditLineData memory cl = creditLine.getCreditLine(creditLineId);
        assertEq(cl.drawnAmount, 300 * 1e18);
        assertEq(cusd.balanceOf(borrower), 300 * 1e18);
    }

    function test_drawCredit_ExceedsLimit() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(borrower);
        vm.expectRevert("Exceeds credit limit");
        creditLine.drawCredit(creditLineId, 600 * 1e18);
    }

    function test_drawCredit_OnlyBorrower() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(another);
        vm.expectRevert("Only borrower can draw");
        creditLine.drawCredit(creditLineId, 100 * 1e18);
    }

    function test_drawCredit_IssuerInsufficientBalance() public {
        // Create new issuer with insufficient balance
        address poorIssuer = address(0x6666666666666666666666666666666666666666);
        vm.prank(poorIssuer);
        registry.registerAgent("PoorIssuer", "http://poor.test", "ipfs://poor");

        // Give poor issuer CREDITOR tier
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(poorIssuer);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(poorIssuer);
        }

        // Mint only 100 cUSD
        cusd.mint(poorIssuer, 100 * 1e18);

        vm.prank(poorIssuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(poorIssuer);
        cusd.approve(address(creditLine), 500 * 1e18);

        // Try to draw 200 when issuer only has 100
        vm.prank(borrower);
        vm.expectRevert("Issuer has insufficient balance");
        creditLine.drawCredit(creditLineId, 200 * 1e18);
    }

    // ========== Repay Credit Tests ==========

    function test_repayCredit_Success() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        // Draw credit
        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        // Give borrower more cUSD for repayment
        cusd.mint(borrower, 200 * 1e18);

        // Approve cUSD for repayment
        vm.prank(borrower);
        cusd.approve(address(creditLine), 200 * 1e18);

        // Repay 50 principal
        vm.prank(borrower);
        creditLine.repayCredit(creditLineId, 50 * 1e18);

        CreditLine.CreditLineData memory cl = creditLine.getCreditLine(creditLineId);
        assertEq(cl.repaidAmount, 50 * 1e18);
    }

    function test_repayCredit_OnlyBorrower() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        vm.prank(another);
        vm.expectRevert("Only borrower can repay");
        creditLine.repayCredit(creditLineId, 50 * 1e18);
    }

    function test_repayCredit_ExceedsDrawn() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            30,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        cusd.mint(borrower, 200 * 1e18);
        vm.prank(borrower);
        cusd.approve(address(creditLine), 200 * 1e18);

        vm.prank(borrower);
        vm.expectRevert("Repayment exceeds drawn amount");
        creditLine.repayCredit(creditLineId, 200 * 1e18);
    }

    // ========== Default Credit Line Tests ==========

    function test_defaultCreditLine_Success() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            1, // 1 day duration
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        // Fast forward past expiration
        vm.warp(block.timestamp + 2 days);

        // Default the credit line
        vm.prank(issuer);
        creditLine.defaultCreditLine(creditLineId);

        CreditLine.CreditLineData memory cl = creditLine.getCreditLine(creditLineId);
        assertFalse(cl.isActive);
        assertTrue(cl.isDefaulted);
    }

    function test_defaultCreditLine_OnlyIssuerOrOwner() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            1,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        vm.warp(block.timestamp + 2 days);

        vm.prank(another);
        vm.expectRevert("Only issuer or owner can default");
        creditLine.defaultCreditLine(creditLineId);
    }

    // ========== Query Tests ==========

    function test_getIssuedCreditLines() public {
        vm.prank(issuer);
        uint256 id1 = creditLine.issueCreditLine(borrower, 100 * 1e18, 30, 500);

        vm.prank(issuer);
        uint256 id2 = creditLine.issueCreditLine(
            another,
            200 * 1e18,
            30,
            500
        );

        uint256[] memory issued = creditLine.getIssuedCreditLines(issuer);
        assertEq(issued.length, 2);
        assertEq(issued[0], id1);
        assertEq(issued[1], id2);
    }

    function test_getReceivedCreditLines() public {
        vm.prank(issuer);
        uint256 id1 = creditLine.issueCreditLine(borrower, 100 * 1e18, 30, 500);

        address issuer2 = address(0x8888888888888888888888888888888888888888);
        vm.prank(issuer2);
        registry.registerAgent("Issuer2", "http://issuer2.test", "ipfs://issuer2");

        // Make issuer2 CREDITOR
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(issuer2);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(issuer2);
        }

        cusd.mint(issuer2, 10000 * 1e18);

        vm.prank(issuer2);
        uint256 id2 = creditLine.issueCreditLine(borrower, 150 * 1e18, 30, 500);

        uint256[] memory received = creditLine.getReceivedCreditLines(borrower);
        assertEq(received.length, 2);
        assertEq(received[0], id1);
        assertEq(received[1], id2);
    }

    function test_getDefaultCount() public {
        vm.prank(issuer);
        uint256 creditLineId = creditLine.issueCreditLine(
            borrower,
            500 * 1e18,
            1,
            500
        );

        vm.prank(issuer);
        cusd.approve(address(creditLine), 10000 * 1e18);

        vm.prank(borrower);
        creditLine.drawCredit(creditLineId, 100 * 1e18);

        vm.warp(block.timestamp + 2 days);

        vm.prank(issuer);
        creditLine.defaultCreditLine(creditLineId);

        assertEq(creditLine.getDefaultCount(borrower), 1);
    }
}
