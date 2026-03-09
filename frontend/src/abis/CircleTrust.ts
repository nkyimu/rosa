export const CircleTrustABI = [
  {
    "type": "function",
    "name": "trust",
    "inputs": [
      { "name": "trustee", "type": "address", "internalType": "address" },
      { "name": "expiresAt", "type": "uint96", "internalType": "uint96" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeTrust",
    "inputs": [{ "name": "trustee", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isTrusted",
    "inputs": [
      { "name": "truster", "type": "address", "internalType": "address" },
      { "name": "trustee", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "trustScore",
    "inputs": [{ "name": "user", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "meetsMinTrust",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "minScore", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTrustEdges",
    "inputs": [{ "name": "user", "type": "address", "internalType": "address" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct CircleTrust.TrustEdge[]",
        "components": [
          { "name": "trustee", "type": "address", "internalType": "address" },
          { "name": "expiresAt", "type": "uint96", "internalType": "uint96" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "TrustAdded",
    "inputs": [
      { "name": "truster", "type": "address", "indexed": true },
      { "name": "trustee", "type": "address", "indexed": true },
      { "name": "expiresAt", "type": "uint96", "indexed": false }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrustRevoked",
    "inputs": [
      { "name": "truster", "type": "address", "indexed": true },
      { "name": "trustee", "type": "address", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TrustExpired",
    "inputs": [
      { "name": "truster", "type": "address", "indexed": true },
      { "name": "trustee", "type": "address", "indexed": true }
    ],
    "anonymous": false
  }
] as const
