// AgentVault contract configuration
//
// IMPORTANT:
// The contract is currently tested locally.
// There is NO MST Testnet deployment address yet.
//
// Do not put a fake address here.

export const AGENT_VAULT_ADDRESS = "";

export const AGENT_VAULT_ABI = [
  // ---------- READS ----------

  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  {
    name: "agent",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },

  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },

  {
    name: "expiry",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "perTransactionMax",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "dailyLimit",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "spentToday",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "spendingDay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "approvalThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "nextPaymentId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "approvedRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },

  {
    name: "recipientCap",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  {
    name: "isActive",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },

  {
    name: "getSpentToday",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ---------- OWNER WRITES ----------

  {
    name: "pause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  {
    name: "unpause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  {
    name: "setPerTransactionMax",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },

  {
    name: "setDailyLimit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },

  {
    name: "setApprovalThreshold",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },

  {
    name: "setRecipientApproval",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },

  {
    name: "setRecipientCap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "cap", type: "uint256" },
    ],
    outputs: [],
  },

  {
    name: "approvePayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  {
    name: "rejectPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },

  // ---------- EVENTS ----------

  {
    name: "PaymentDecision",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "agent", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "status", type: "uint8" },
      { indexed: false, name: "reason", type: "uint8" },
      { indexed: false, name: "receiptHash", type: "bytes32" },
    ],
  },

  {
    name: "Allowed",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "receiptHash", type: "bytes32" },
    ],
  },

  {
    name: "Blocked",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "reason", type: "uint8" },
      { indexed: false, name: "receiptHash", type: "bytes32" },
    ],
  },

  {
    name: "Pending",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "receiptHash", type: "bytes32" },
    ],
  },

  {
    name: "PendingApproved",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
    ],
  },

  {
    name: "PendingRejected",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
    ],
  },
];

// Contract enum values supplied by Person 1.
export const PAYMENT_STATUS = {
  ALLOWED: 0,
  BLOCKED: 1,
  PENDING: 2,
};

export const PAYMENT_REASON = {
  NONE: 0,
  NOT_AUTHORIZED: 1,
  VAULT_PAUSED: 2,
  VAULT_EXPIRED: 3,
  RECIPIENT_NOT_ALLOWED: 4,
  EXCEEDS_TRANSACTION_MAXIMUM: 5,
  EXCEEDS_DAILY_LIMIT: 6,
  EXCEEDS_RECIPIENT_CAP: 7,
};