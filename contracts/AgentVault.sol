// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract AgentVault {
    enum Status {
        Allowed,
        Blocked,
        Pending
    }

    enum Reason {
        None,
        NotAuthorized,
        VaultPaused,
        VaultExpired,
        RecipientNotAllowed,
        ExceedsTransactionMaximum,
        ExceedsDailyLimit,
        ExceedsRecipientCap
    }

    struct Payment {
        address recipient;
        uint256 amount;
        bytes32 receiptHash;
        Status status;
    }

    // --------------------------------------------------
    // Events
    // --------------------------------------------------

    event PaymentDecision(
        address indexed agent,
        address indexed recipient,
        uint256 amount,
        Status status,
        Reason reason,
        bytes32 receiptHash
    );

    event Allowed(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        bytes32 receiptHash
    );

    event Blocked(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        Reason reason,
        bytes32 receiptHash
    );

    event Pending(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        bytes32 receiptHash
    );

    event PendingApproved(uint256 indexed id);

    event PendingRejected(uint256 indexed id);

    // --------------------------------------------------
    // State
    // --------------------------------------------------

    address public owner;
    address public agent;

    bool public paused;
    uint256 public expiry;

    uint256 public perTransactionMax;
    uint256 public dailyLimit;

    uint256 public spentToday;
    uint256 public spendingDay;

    uint256 public approvalThreshold;
    uint256 public nextPaymentId;

    mapping(address => bool) public approvedRecipient;
    mapping(address => uint256) public recipientCap;

    mapping(uint256 => Payment) public payments;

    // --------------------------------------------------
    // Constructor
    // --------------------------------------------------

    constructor(address _agent, uint256 _expiry) {
        owner = msg.sender;
        agent = _agent;
        expiry = _expiry;

        spendingDay = block.timestamp / 1 days;
    }

    // --------------------------------------------------
    // Modifiers
    // --------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "Not agent");
        _;
    }

    // --------------------------------------------------
    // Owner configuration
    // --------------------------------------------------

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function setPerTransactionMax(uint256 _max) external onlyOwner {
        perTransactionMax = _max;
    }

    function setDailyLimit(uint256 _limit) external onlyOwner {
        dailyLimit = _limit;
    }

    function setApprovalThreshold(uint256 _threshold) external onlyOwner {
        approvalThreshold = _threshold;
    }

    function setRecipientApproval(
        address recipient,
        bool approved
    ) external onlyOwner {
        approvedRecipient[recipient] = approved;
    }

    function setRecipientCap(
        address recipient,
        uint256 cap
    ) external onlyOwner {
        recipientCap[recipient] = cap;
    }

    // --------------------------------------------------
    // Vault status
    // --------------------------------------------------

    function isActive() public view returns (bool) {
        if (paused) {
            return false;
        }

        if (expiry != 0 && block.timestamp >= expiry) {
            return false;
        }

        return true;
    }

    // --------------------------------------------------
    // Payment request
    // --------------------------------------------------

    function pay(
        address recipient,
        uint256 amount,
        bytes32 receiptHash
    ) external returns (Status status, Reason reason) {

        // 1. Authorization
        if (msg.sender != agent) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.NotAuthorized,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.NotAuthorized,
                receiptHash
            );

            return (Status.Blocked, Reason.NotAuthorized);
        }

        // 2. Vault active
        if (paused) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.VaultPaused,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.VaultPaused,
                receiptHash
            );

            return (Status.Blocked, Reason.VaultPaused);
        }

        if (expiry != 0 && block.timestamp >= expiry) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.VaultExpired,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.VaultExpired,
                receiptHash
            );

            return (Status.Blocked, Reason.VaultExpired);
        }

        // 3. Recipient allowlist
        if (!approvedRecipient[recipient]) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.RecipientNotAllowed,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.RecipientNotAllowed,
                receiptHash
            );

            return (Status.Blocked, Reason.RecipientNotAllowed);
        }

        // 4. Per-transaction maximum
        if (
            perTransactionMax != 0 &&
            amount > perTransactionMax
        ) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.ExceedsTransactionMaximum,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.ExceedsTransactionMaximum,
                receiptHash
            );

            return (
                Status.Blocked,
                Reason.ExceedsTransactionMaximum
            );
        }

        // 5. Daily spending limit
        uint256 currentSpent = getSpentToday();

        if (
            dailyLimit != 0 &&
            currentSpent + amount > dailyLimit
        ) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.ExceedsDailyLimit,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.ExceedsDailyLimit,
                receiptHash
            );

            return (
                Status.Blocked,
                Reason.ExceedsDailyLimit
            );
        }

        // 6. Per-recipient cap
        uint256 cap = recipientCap[recipient];

        if (cap != 0 && amount > cap) {
            uint256 id = nextPaymentId++;

            emit Blocked(
                id,
                recipient,
                amount,
                Reason.ExceedsRecipientCap,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Blocked,
                Reason.ExceedsRecipientCap,
                receiptHash
            );

            return (
                Status.Blocked,
                Reason.ExceedsRecipientCap
            );
        }

        // 7. Approval threshold
        if (
            approvalThreshold != 0 &&
            amount > approvalThreshold
        ) {
            uint256 id = nextPaymentId++;

            payments[id] = Payment({
                recipient: recipient,
                amount: amount,
                receiptHash: receiptHash,
                status: Status.Pending
            });

            emit Pending(
                id,
                recipient,
                amount,
                receiptHash
            );

            emit PaymentDecision(
                msg.sender,
                recipient,
                amount,
                Status.Pending,
                Reason.None,
                receiptHash
            );

            return (
                Status.Pending,
                Reason.None
            );
        }

        // 8. Allowed payment
        _recordSpending(amount);

        uint256 allowedId = nextPaymentId++;

        payments[allowedId] = Payment({
            recipient: recipient,
            amount: amount,
            receiptHash: receiptHash,
            status: Status.Allowed
        });

        emit Allowed(
            allowedId,
            recipient,
            amount,
            receiptHash
        );

        emit PaymentDecision(
            msg.sender,
            recipient,
            amount,
            Status.Allowed,
            Reason.None,
            receiptHash
        );

        return (
            Status.Allowed,
            Reason.None
        );
    }

    // --------------------------------------------------
    // Pending payment management
    // --------------------------------------------------

    function approvePayment(
        uint256 id
    ) external onlyOwner {

        Payment storage payment = payments[id];

        require(
            payment.status == Status.Pending,
            "Not pending"
        );

        payment.status = Status.Allowed;

        _recordSpending(payment.amount);

        emit PendingApproved(id);

        emit Allowed(
            id,
            payment.recipient,
            payment.amount,
            payment.receiptHash
        );
    }

    function rejectPayment(
        uint256 id
    ) external onlyOwner {

        Payment storage payment = payments[id];

        require(
            payment.status == Status.Pending,
            "Not pending"
        );

        payment.status = Status.Blocked;

        emit PendingRejected(id);

        emit Blocked(
            id,
            payment.recipient,
            payment.amount,
            Reason.None,
            payment.receiptHash
        );
    }

    // --------------------------------------------------
    // Payment information
    // --------------------------------------------------

    function getPayment(
        uint256 id
    )
        external
        view
        returns (
            address recipient,
            uint256 amount,
            bytes32 receiptHash,
            Status status
        )
    {
        Payment memory payment = payments[id];

        return (
            payment.recipient,
            payment.amount,
            payment.receiptHash,
            payment.status
        );
    }

    // --------------------------------------------------
    // Daily spending
    // --------------------------------------------------

    function getSpentToday()
        public
        view
        returns (uint256)
    {
        if (
            block.timestamp / 1 days != spendingDay
        ) {
            return 0;
        }

        return spentToday;
    }

    function _recordSpending(
        uint256 amount
    ) internal {

        uint256 currentDay =
            block.timestamp / 1 days;

        if (currentDay != spendingDay) {
            spendingDay = currentDay;
            spentToday = 0;
        }

        spentToday += amount;
    }
}