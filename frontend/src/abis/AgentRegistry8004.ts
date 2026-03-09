export const AgentRegistry8004ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "agentInfo",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct AgentRegistry8004.AgentInfo",
        components: [
          {
            name: "name",
            type: "string",
            internalType: "string",
          },
          {
            name: "serviceEndpoint",
            type: "string",
            internalType: "string",
          },
          {
            name: "successCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "failureCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "registrationTimestamp",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "isRegistered",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agents",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "serviceEndpoint",
        type: "string",
        internalType: "string",
      },
      {
        name: "successCount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "failureCount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "registrationTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "isRegistered",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "authorizeReporter",
    inputs: [
      {
        name: "reporter",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "authorizedReporters",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deauthorizeReporter",
    inputs: [
      {
        name: "reporter",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAgentCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRegisteredAgents",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReputation",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "successCount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "failureCount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "score",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isAgentRegistered",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerAgent",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "serviceEndpoint",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registeredAgentsList",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "reportFailure",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "reportSuccess",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      {
        name: "agent",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "name",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "serviceEndpoint",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FailureReported",
    inputs: [
      {
        name: "agent",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "reporter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newFailureCount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReporterAuthorized",
    inputs: [
      {
        name: "reporter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReporterDeauthorized",
    inputs: [
      {
        name: "reporter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SuccessReported",
    inputs: [
      {
        name: "agent",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "reporter",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newSuccessCount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
] as const;
