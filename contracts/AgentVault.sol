// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract AgentVault {
    // ============================================================
    // ENUMS
    // ============================================================

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
        ExceedsRecipientCap,
        InsufficientBalance
    }

    // ============================================================
    // STRUCTS
    // ============================================================

    struct Payment {
        address recipient;
        uint256 amount;
        bytes32 receiptHash;
        Status status;
    }

    // ============================================================
    // EVENTS
    // ============================================================

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

    event PendingApproved(
        uint256 indexed id
    );

    event PendingRejected(
        uint256 indexed id
    );

    event TrustTierChanged(
        uint8 previousTier,
        uint8 newTier
    );

    // ============================================================
    // CORE STATE
    // ============================================================

    address public owner;
    address public agent;

    bool public paused;
    uint256 public expiry;

    uint256 public perTransactionMax;

    // Owner-defined maximum daily limit.
    // 0 means no explicit owner cap.
    uint256 public dailyLimit;

    uint256 public spentToday;
    uint256 public spendingDay;

    uint256 public approvalThreshold;
    uint256 public nextPaymentId;

    mapping(address => bool) public approvedRecipient;
    mapping(address => uint256) public recipientCap;

    mapping(uint256 => Payment) public payments;

    // ============================================================
    // TRUST TIER STATE
    // ============================================================

    uint8 public trustTier;

    uint8 public maxTrustTier;

    uint256 public cleanPayments;

    // Number of clean payments required to move to next tier.
    uint256 public paymentsToNextTier;

    // Tier-specific daily limits.
    mapping(uint8 => uint256) public tierDailyLimit;

    // ============================================================
    // REENTRANCY
    // ============================================================

    bool private locked;

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor(
        address _agent,
        uint256 _expiry
    ) {
        require(
            _agent != address(0),
            "Invalid agent"
        );

        owner = msg.sender;
        agent = _agent;
        expiry = _expiry;

        spendingDay =
            block.timestamp / 1 days;

        // Trust-tier implementation choices.
        //
        // Tier 0 = 100
        // Tier 1 = 250
        // Tier 2 = 500
        // Tier 3 = 1000
        //
        // Owner can change these values.
        maxTrustTier = 3;
        paymentsToNextTier = 3;

        tierDailyLimit[0] = 100;
        tierDailyLimit[1] = 250;
        tierDailyLimit[2] = 500;
        tierDailyLimit[3] = 1000;

        trustTier = 0;
    }

    // ============================================================
    // MODIFIERS
    // ============================================================

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Not owner"
        );
        _;
    }

    modifier onlyAgent() {
        require(
            msg.sender == agent,
            "Not agent"
        );
        _;
    }

    modifier nonReentrant() {
        require(
            !locked,
            "Reentrancy"
        );

        locked = true;
        _;
        locked = false;
    }

    // ============================================================
    // OWNER CONFIGURATION
    // ============================================================

    function pause()
        external
        onlyOwner
    {
        paused = true;
    }

    function unpause()
        external
        onlyOwner
    {
        paused = false;
    }

    function setPerTransactionMax(
        uint256 _max
    )
        external
        onlyOwner
    {
        perTransactionMax = _max;
    }

    function setDailyLimit(
        uint256 _limit
    )
        external
        onlyOwner
    {
        dailyLimit = _limit;
    }

    function setApprovalThreshold(
        uint256 _threshold
    )
        external
        onlyOwner
    {
        approvalThreshold = _threshold;
    }

    function setRecipientApproval(
        address recipient,
        bool approved
    )
        external
        onlyOwner
    {
        approvedRecipient[recipient] = approved;
    }

    function setRecipientCap(
        address recipient,
        uint256 cap
    )
        external
        onlyOwner
    {
        recipientCap[recipient] = cap;
    }

    // ============================================================
    // TRUST-TIER CONFIGURATION
    // ============================================================

    function setMaxTrustTier(
        uint8 _maxTier
    )
        external
        onlyOwner
    {
        require(
            _maxTier <= 10,
            "Tier too high"
        );

        maxTrustTier = _maxTier;

        if (trustTier > maxTrustTier) {
            uint8 previousTier = trustTier;
            trustTier = maxTrustTier;

            emit TrustTierChanged(
                previousTier,
                trustTier
            );
        }
    }

    function setPaymentsToNextTier(
        uint256 _payments
    )
        external
        onlyOwner
    {
        require(
            _payments > 0,
            "Invalid payment count"
        );

        paymentsToNextTier = _payments;
    }

    function setTierDailyLimit(
        uint8 tier,
        uint256 limit
    )
        external
        onlyOwner
    {
        require(
            tier <= 10,
            "Tier too high"
        );

        tierDailyLimit[tier] = limit;
    }

    // ============================================================
    // VAULT STATUS
    // ============================================================

    function isActive()
        public
        view
        returns (bool)
    {
        if (paused) {
            return false;
        }

        if (
            expiry != 0 &&
            block.timestamp >= expiry
        ) {
            return false;
        }

        return true;
    }

    // ============================================================
    // VAULT BALANCE
    // ============================================================

    function getVaultBalance()
        public
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    receive()
        external
        payable
    {}

    // ============================================================
    // EFFECTIVE DAILY LIMIT
    // ============================================================

    function getEffectiveDailyLimit()
        public
        view
        returns (uint256)
    {
        uint256 tierLimit =
            tierDailyLimit[trustTier];

        if (
            dailyLimit == 0
        ) {
            return tierLimit;
        }

        if (
            tierLimit == 0
        ) {
            return dailyLimit;
        }

        if (
            dailyLimit < tierLimit
        ) {
            return dailyLimit;
        }

        return tierLimit;
    }

    // ============================================================
    // PAYMENT
    // ============================================================

    function pay(
        address recipient,
        uint256 amount,
        bytes32 receiptHash
    )
        external
        onlyAgent
        nonReentrant
        returns (
            Status status,
            Reason reason
        )
    {
        // --------------------------------------------------------
        // 1. Vault active
        // --------------------------------------------------------

        if (paused) {
            return _blockPayment(
                recipient,
                amount,
                Reason.VaultPaused,
                receiptHash
            );
        }

        if (
            expiry != 0 &&
            block.timestamp >= expiry
        ) {
            return _blockPayment(
                recipient,
                amount,
                Reason.VaultExpired,
                receiptHash
            );
        }

        // --------------------------------------------------------
        // 2. Recipient allowlist
        // --------------------------------------------------------

        if (
            !approvedRecipient[recipient]
        ) {
            return _blockPayment(
                recipient,
                amount,
                Reason.RecipientNotAllowed,
                receiptHash
            );
        }

        // --------------------------------------------------------
        // 3. Per-transaction maximum
        // --------------------------------------------------------

        if (
            perTransactionMax != 0 &&
            amount > perTransactionMax
        ) {
            return _blockPayment(
                recipient,
                amount,
                Reason.ExceedsTransactionMaximum,
                receiptHash
            );
        }

        // --------------------------------------------------------
        // 4. Daily limit
        // --------------------------------------------------------

        uint256 currentSpent =
            getSpentToday();

        uint256 effectiveLimit =
            getEffectiveDailyLimit();

        if (
            effectiveLimit != 0 &&
            currentSpent + amount >
            effectiveLimit
        ) {
            return _blockPayment(
                recipient,
                amount,
                Reason.ExceedsDailyLimit,
                receiptHash
            );
        }

        // --------------------------------------------------------
        // 5. Per-recipient cap
        // --------------------------------------------------------

        uint256 cap =
            recipientCap[recipient];

        if (
            cap != 0 &&
            amount > cap
        ) {
            return _blockPayment(
                recipient,
                amount,
                Reason.ExceedsRecipientCap,
                receiptHash
            );
        }

        // --------------------------------------------------------
        // 6. Vault balance
        // --------------------------------------------------------

        if (
            address(this).balance < amount
        ) {
            return _blockPayment(
                recipient,
                amount,
                Reason.InsufficientBalance,
                receiptHash
            );
        }

        // --------------------------------------------------------
        // 7. Approval threshold
        // --------------------------------------------------------

        if (
            approvalThreshold != 0 &&
            amount > approvalThreshold
        ) {
            uint256 id =
                nextPaymentId++;

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

        // --------------------------------------------------------
        // 8. Immediate payment
        // --------------------------------------------------------

        uint256 allowedId =
            nextPaymentId++;

        (
            bool success,
        ) = payable(recipient).call{
            value: amount
        }("");

        if (!success) {
            revert("Transfer failed");
        }

        _recordSpending(amount);

        _recordCleanPayment();

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

    // ============================================================
    // APPROVE PENDING PAYMENT
    // ============================================================

    function approvePayment(
        uint256 id
    )
        external
        onlyOwner
        nonReentrant
    {
        Payment storage payment =
            payments[id];

        require(
            payment.status == Status.Pending,
            "Not pending"
        );

        require(
            isActive(),
            "Vault inactive"
        );

        require(
            address(this).balance >=
            payment.amount,
            "Insufficient balance"
        );

        uint256 currentSpent =
            getSpentToday();

        uint256 effectiveLimit =
            getEffectiveDailyLimit();

        require(
            effectiveLimit == 0 ||
            currentSpent + payment.amount <=
            effectiveLimit,
            "Daily limit exceeded"
        );

        payment.status =
            Status.Allowed;

        (
            bool success,
        ) = payable(payment.recipient).call{
            value: payment.amount
        }("");

        require(
            success,
            "Transfer failed"
        );

        _recordSpending(
            payment.amount
        );

        _recordCleanPayment();

        emit PendingApproved(id);

        emit Allowed(
            id,
            payment.recipient,
            payment.amount,
            payment.receiptHash
        );
    }

    // ============================================================
    // REJECT PENDING PAYMENT
    // ============================================================

    function rejectPayment(
        uint256 id
    )
        external
        onlyOwner
    {
        Payment storage payment =
            payments[id];

        require(
            payment.status == Status.Pending,
            "Not pending"
        );

        payment.status =
            Status.Blocked;

        _resetTrustTier();

        emit PendingRejected(id);

        emit Blocked(
            id,
            payment.recipient,
            payment.amount,
            Reason.None,
            payment.receiptHash
        );
    }

    // ============================================================
    // PAYMENT INFORMATION
    // ============================================================

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
        Payment memory payment =
            payments[id];

        return (
            payment.recipient,
            payment.amount,
            payment.receiptHash,
            payment.status
        );
    }

    // ============================================================
    // DAILY SPENDING
    // ============================================================

    function getSpentToday()
        public
        view
        returns (uint256)
    {
        if (
            block.timestamp / 1 days !=
            spendingDay
        ) {
            return 0;
        }

        return spentToday;
    }

    function _recordSpending(
        uint256 amount
    )
        internal
    {
        uint256 currentDay =
            block.timestamp / 1 days;

        if (
            currentDay != spendingDay
        ) {
            spendingDay = currentDay;
            spentToday = 0;
        }

        spentToday += amount;
    }

    // ============================================================
    // TRUST TIER
    // ============================================================

    function _recordCleanPayment()
        internal
    {
        cleanPayments += 1;

        if (
            trustTier >= maxTrustTier
        ) {
            return;
        }

        if (
            cleanPayments >=
            paymentsToNextTier
        ) {
            cleanPayments = 0;

            uint8 previousTier =
                trustTier;

            trustTier += 1;

            emit TrustTierChanged(
                previousTier,
                trustTier
            );
        }
    }

    function _resetTrustTier()
        internal
    {
        cleanPayments = 0;

        if (trustTier != 0) {
            uint8 previousTier =
                trustTier;

            trustTier = 0;

            emit TrustTierChanged(
                previousTier,
                0
            );
        }
    }

    // ============================================================
    // BLOCKED PAYMENT HELPER
    // ============================================================

    function _blockPayment(
        address recipient,
        uint256 amount,
        Reason reason,
        bytes32 receiptHash
    )
        internal
        returns (
            Status,
            Reason
        )
    {
        uint256 id =
            nextPaymentId++;

        emit Blocked(
            id,
            recipient,
            amount,
            reason,
            receiptHash
        );

        emit PaymentDecision(
            msg.sender,
            recipient,
            amount,
            Status.Blocked,
            reason,
            receiptHash
        );

        _resetTrustTier();

        return (
            Status.Blocked,
            reason
        );
    }
}