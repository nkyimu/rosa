export const IntentRegistryABI = [
  { "type": "constructor", "inputs": [], "stateMutability": "nonpayable" },
  {
    "type": "function",
    "name": "submitIntent",
    "inputs": [
      { "name": "intentType", "type": "uint8", "internalType": "enum IntentRegistry.IntentType" },
      { "name": "params", "type": "bytes", "internalType": "bytes" },
      { "name": "expiresAt", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelIntent",
    "inputs": [{ "name": "intentId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fulfillIntent",
    "inputs": [
      { "name": "intentId", "type": "uint256", "internalType": "uint256" },
      { "name": "solution", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "batchFulfill",
    "inputs": [
      { "name": "intentIds", "type": "uint256[]", "internalType": "uint256[]" },
      { "name": "compositeSolution", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getIntent",
    "inputs": [{ "name": "intentId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IntentRegistry.Intent",
        "components": [
          { "name": "id", "type": "uint256", "internalType": "uint256" },
          { "name": "intentType", "type": "uint8", "internalType": "enum IntentRegistry.IntentType" },
          { "name": "creator", "type": "address", "internalType": "address" },
          { "name": "paramsHash", "type": "bytes32", "internalType": "bytes32" },
          { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
          { "name": "expiresAt", "type": "uint256", "internalType": "uint256" },
          { "name": "fulfilled", "type": "bool", "internalType": "bool" },
          { "name": "cancelled", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getIntentCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOpenIntents",
    "inputs": [{ "name": "intentType", "type": "uint8", "internalType": "enum IntentRegistry.IntentType" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IntentRegistry.Intent[]",
        "components": [
          { "name": "id", "type": "uint256", "internalType": "uint256" },
          { "name": "intentType", "type": "uint8", "internalType": "enum IntentRegistry.IntentType" },
          { "name": "creator", "type": "address", "internalType": "address" },
          { "name": "paramsHash", "type": "bytes32", "internalType": "bytes32" },
          { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
          { "name": "expiresAt", "type": "uint256", "internalType": "uint256" },
          { "name": "fulfilled", "type": "bool", "internalType": "bool" },
          { "name": "cancelled", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerAgent",
    "inputs": [{ "name": "agent", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deregisterAgent",
    "inputs": [{ "name": "agent", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registeredAgents",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [{ "name": "newOwner", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "intents",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "intentType", "type": "uint8", "internalType": "enum IntentRegistry.IntentType" },
      { "name": "creator", "type": "address", "internalType": "address" },
      { "name": "paramsHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
      { "name": "expiresAt", "type": "uint256", "internalType": "uint256" },
      { "name": "fulfilled", "type": "bool", "internalType": "bool" },
      { "name": "cancelled", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "IntentSubmitted",
    "inputs": [
      { "name": "intentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "intentType", "type": "uint8", "indexed": true, "internalType": "enum IntentRegistry.IntentType" },
      { "name": "creator", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "expiresAt", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IntentCancelled",
    "inputs": [{ "name": "intentId", "type": "uint256", "indexed": true, "internalType": "uint256" }],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IntentFulfilled",
    "inputs": [
      { "name": "intentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "agent", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  }
] as const
