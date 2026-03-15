import type { Hex } from "viem";
export declare const CELO_SEPOLIA_RPC = "https://forno.celo-sepolia.celo-testnet.org";
export declare const CELO_MAINNET_RPC = "https://forno.celo.org";
export declare const CELO_ALFAJORES_RPC = "https://forno.celo-sepolia.celo-testnet.org";
export declare const CONTRACT_ADDRESSES: {
    intentRegistry: `0x${string}`;
    circleFactory: `0x${string}`;
    circleTrust: `0x${string}`;
    demoCircle: `0x${string}`;
    cUSD: `0x${string}`;
    agentRegistry8004: `0x${string}`;
    agentPayment: `0x${string}`;
    moolaLendingPool: `0x${string}`;
};
export declare const agentAccount: {
    address: import("abitype").Address;
    nonceManager?: import("viem").NonceManager | undefined;
    sign: ((parameters: {
        hash: import("viem").Hash;
    }) => Promise<Hex>) | undefined;
    signAuthorization: ((parameters: import("viem").AuthorizationRequest) => Promise<import("viem/accounts").SignAuthorizationReturnType>) | undefined;
    signMessage: ({ message }: {
        message: import("viem").SignableMessage;
    }) => Promise<Hex>;
    signTransaction: <serializer extends import("viem").SerializeTransactionFn<import("viem").TransactionSerializable> = import("viem").SerializeTransactionFn<import("viem").TransactionSerializable>, transaction extends Parameters<serializer>[0] = Parameters<serializer>[0]>(transaction: transaction, options?: {
        serializer?: serializer | undefined;
    } | undefined) => Promise<Hex>;
    signTypedData: <const typedData extends import("abitype").TypedData | Record<string, unknown>, primaryType extends keyof typedData | "EIP712Domain" = keyof typedData>(parameters: import("viem").TypedDataDefinition<typedData, primaryType>) => Promise<Hex>;
    publicKey: Hex;
    source: "privateKey";
    type: "local";
};
export declare const MATCHER_CONFIG: {
    amountTolerancePct: number;
    minGroupSize: number;
    maxGroupSize: number;
    intentLookbackSec: number;
};
export declare const CYCLE_DURATIONS: {
    readonly weekly: number;
    readonly biweekly: number;
    readonly monthly: number;
};
export declare const KEEPER_CONFIG: {
    minYieldToHarvest: bigint;
    minSweepAmount: bigint;
};
export declare const DRY_RUN: boolean;
