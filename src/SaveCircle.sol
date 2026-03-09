// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./CircleTrust.sol";
import "./interfaces/IMoolaLendingPool.sol";

/**
 * @title SaveCircle
 * @dev ROSCA (Rotating Savings and Credit Association) contract on Celo
 * Enhanced with yield integration, penalties, and trust-gated joining
 */
contract SaveCircle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CircleState {
        FORMING,
        ACTIVE,
        COMPLETED,
        DISSOLVED
    }

    uint256 public circleId;
    address public agent;
    address public trustContract;
    address public lendingPool;
    address public aToken;
    address public tokenAddress;
    uint256 public minTrustScore;
    uint256 public roundDuration;
    uint256 public contributionAmount;

    CircleState public state;
    uint256 public roundStartTime;
    uint256 public rotationIndex;
    uint256 public currentRound;

    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberIndex;
    mapping(address => uint256) public totalContributed;
    mapping(address => bool) public hasContributedThisRound;
    mapping(address => uint256) public penaltyCount;

    uint256 public totalYieldGenerated;
    uint256 public constant KEEPER_FEE_BPS = 100; // 1% of yield to keeper/agent

    event CircleFormed(uint256 indexed circleId);
    event MemberJoined(address indexed member);
    event ContributionMade(address indexed member, uint256 amount);
    event RotationClaimed(address indexed member, uint256 amount);
    event MemberPenalized(address indexed member, uint256 penalty);
    event YieldSwept(uint256 amount);
    event YieldHarvested(uint256 amount);
    event CircleDissolved();
    event CircleCompleted();

    modifier onlyAgent() {
        require(msg.sender == agent, "Only agent can call this");
        _;
    }

    modifier onlyMember() {
        require(isMember[msg.sender], "Not a member");
        _;
    }

    modifier inState(CircleState requiredState) {
        require(state == requiredState, "Invalid circle state");
        _;
    }

    constructor(
        uint256 _circleId,
        address _agent,
        address _trustContract,
        address _lendingPool,
        address _aToken,
        uint256 _minTrustScore,
        uint256 _roundDuration
    ) {
        circleId = _circleId;
        agent = _agent;
        trustContract = _trustContract;
        lendingPool = _lendingPool;
        aToken = _aToken;
        minTrustScore = _minTrustScore;
        roundDuration = _roundDuration;

        state = CircleState.FORMING;
        rotationIndex = 0;
        currentRound = 0;
    }

    /**
     * @dev Initialize circle with contribution amount and token address
     * Only agent can call, only in FORMING state
     */
    function initialize(address _tokenAddress, uint256 _contributionAmount)
        external
        onlyAgent
        inState(CircleState.FORMING)
    {
        require(_tokenAddress != address(0), "Invalid token");
        require(_contributionAmount > 0, "Invalid contribution amount");

        tokenAddress = _tokenAddress;
        contributionAmount = _contributionAmount;
    }

    /**
     * @dev Join a circle (trust-gated)
     * User must meet minimum trust score from CircleTrust contract
     */
    function join() external inState(CircleState.FORMING) nonReentrant {
        require(!isMember[msg.sender], "Already a member");
        require(members.length < 50, "Circle is full");

        // Check trust score
        CircleTrust trustContract_ = CircleTrust(trustContract);
        require(
            trustContract_.meetsMinTrust(msg.sender, minTrustScore),
            "Insufficient trust score"
        );

        // Add member
        memberIndex[msg.sender] = members.length;
        members.push(msg.sender);
        isMember[msg.sender] = true;

        emit MemberJoined(msg.sender);

        // Transition to ACTIVE when we have members (agent decides when)
    }

    /**
     * @dev Start the circle (only agent, transitions from FORMING to ACTIVE)
     */
    function startCircle() external onlyAgent inState(CircleState.FORMING) {
        require(members.length > 0, "No members in circle");

        state = CircleState.ACTIVE;
        roundStartTime = block.timestamp;
        currentRound = 1;

        emit CircleFormed(circleId);
    }

    /**
     * @dev Make a contribution for the current round
     */
    function contribute() external onlyMember inState(CircleState.ACTIVE) nonReentrant {
        require(!hasContributedThisRound[msg.sender], "Already contributed this round");

        // Transfer token from member to contract
        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), contributionAmount);

        totalContributed[msg.sender] += contributionAmount;
        hasContributedThisRound[msg.sender] = true;

        emit ContributionMade(msg.sender, contributionAmount);
    }

    /**
     * @dev Claim rotation payout on your turn
     * Advances rotation index
     */
    function claimRotation() external onlyMember inState(CircleState.ACTIVE) nonReentrant {
        require(
            memberIndex[msg.sender] == rotationIndex,
            "Not your turn"
        );

        // Calculate payout (contributions + share of yield)
        uint256 totalContributed = contributionAmount * members.length;
        uint256 yieldShare = totalYieldGenerated > 0 ? (totalYieldGenerated / members.length) : 0;
        uint256 payout = totalContributed + yieldShare;

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance >= payout, "Insufficient funds");

        token.safeTransfer(msg.sender, payout);

        emit RotationClaimed(msg.sender, payout);

        // Advance rotation and round
        rotationIndex++;
        currentRound++;

        // Reset contribution tracking for next round
        for (uint256 i = 0; i < members.length; i++) {
            hasContributedThisRound[members[i]] = false;
        }

        // Check if circle is complete
        if (rotationIndex >= members.length) {
            state = CircleState.COMPLETED;
            emit CircleCompleted();
        }
    }

    /**
     * @dev Penalize a member for missed contribution (only agent)
     * Deducts from member's escrowed contributions (NOT their wallet)
     * After 3 penalties, member is evicted
     */
    function penalize(address member) external onlyAgent inState(CircleState.ACTIVE) nonReentrant {
        require(isMember[member], "Not a member");

        uint256 penalty = (contributionAmount * 10) / 100; // 10% penalty
        penaltyCount[member]++;

        // Deduct from escrowed contributions — NEVER pull from member wallet
        IERC20 token = IERC20(tokenAddress);
        if (totalContributed[member] >= penalty && token.balanceOf(address(this)) >= penalty) {
            totalContributed[member] -= penalty;
            token.safeTransfer(agent, penalty);
        }

        emit MemberPenalized(member, penalty);

        // Evict after 3 penalties
        if (penaltyCount[member] >= 3) {
            _removeMember(member);
        }
    }

    /**
     * @dev Move idle capital to yield vault (only agent)
     * Transfers tokens to Moola Market for yield
     */
    function sweepToYield(uint256 amount)
        external
        onlyAgent
        inState(CircleState.ACTIVE)
        nonReentrant
    {
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance");

        // Approve Moola and deposit (forceApprove handles USDT-style tokens)
        token.forceApprove(lendingPool, amount);
        IMoolaLendingPool(lendingPool).deposit(
            tokenAddress,
            amount,
            address(this),
            0
        );

        emit YieldSwept(amount);
    }

    /**
     * @dev Harvest yield from Moola Market and compound (only agent)
     * Agent earns KEEPER_FEE_BPS (1%) of yield for calling this
     */
    function harvestYield() external onlyAgent inState(CircleState.ACTIVE) nonReentrant {
        IMoolaLendingPool pool = IMoolaLendingPool(lendingPool);

        // Get current balance of aToken from the dedicated aToken address
        uint256 normalizedIncome = pool.getReserveNormalizedIncome(tokenAddress);
        require(normalizedIncome > 0, "Invalid reserve");

        // Withdraw all to claim yield — use aToken address for balance check
        IERC20 aTokenContract = IERC20(aToken);
        uint256 aTokenBalance = aTokenContract.balanceOf(address(this));

        if (aTokenBalance > 0) {
            pool.withdraw(tokenAddress, aTokenBalance, address(this));

            // Calculate yield gain
            IERC20 token = IERC20(tokenAddress);
            uint256 tokenBalance = token.balanceOf(address(this));
            uint256 expectedBalance = contributionAmount * members.length;

            if (tokenBalance > expectedBalance) {
                uint256 yieldEarned = tokenBalance - expectedBalance;

                // Pay keeper fee to agent for harvesting
                uint256 keeperFee = (yieldEarned * KEEPER_FEE_BPS) / 10_000;
                if (keeperFee > 0) {
                    token.safeTransfer(agent, keeperFee);
                }

                totalYieldGenerated += (yieldEarned - keeperFee);

                emit YieldHarvested(yieldEarned);
            }
        }
    }

    /**
     * @dev Dissolve circle early if it fails (only agent)
     * Returns contributions to members proportionally
     */
    function dissolve() external onlyAgent nonReentrant {
        require(state != CircleState.COMPLETED, "Already completed");

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));

        // Distribute remaining balance proportionally
        if (balance > 0 && members.length > 0) {
            uint256 perMember = balance / members.length;
            for (uint256 i = 0; i < members.length; i++) {
                if (perMember > 0) {
                    token.safeTransfer(members[i], perMember);
                }
            }
            // Send any remaining dust to agent (avoids token stranding from integer division)
            uint256 remaining = token.balanceOf(address(this));
            if (remaining > 0) {
                token.safeTransfer(agent, remaining);
            }
        }

        state = CircleState.DISSOLVED;
        emit CircleDissolved();
    }

    /**
     * @dev Internal: remove member from circle
     * Adjusts rotationIndex to prevent skipping or misassignment
     */
    function _removeMember(address member) internal {
        uint256 idx = memberIndex[member];

        // If removed member is before current rotation, adjust index
        if (idx < rotationIndex) {
            rotationIndex--;
        }

        // Swap with last and pop
        address lastMember = members[members.length - 1];
        members[idx] = lastMember;
        memberIndex[lastMember] = idx;

        members.pop();
        delete isMember[member];
        delete memberIndex[member];
    }

    /**
     * @dev Get all members
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /**
     * @dev Get member count
     */
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    /**
     * @dev Get circle state
     */
    function getState() external view returns (CircleState) {
        return state;
    }
}
