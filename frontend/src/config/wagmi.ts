import { createConfig, http, injected } from "wagmi";
import { celo } from "wagmi/chains";
import { defineChain } from "viem";

// Celo Sepolia testnet chain definition
export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
    celoScan: { name: "CeloScan", url: "https://sepolia.celoscan.io" },
  },
  testnet: true,
});

/** Returns true when running inside MiniPay super-app */
export function checkMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).ethereum?.isMiniPay === true;
}

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
    [celo.id]: http("https://forno.celo.org"),
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = import.meta.env as Record<string, any>;

export const CONTRACT_ADDRESSES = {
  intentRegistry:    (env["VITE_INTENT_REGISTRY"]    ?? "0x6Bddd66698206c9956e5ac65F9083A132B574844") as `0x${string}`,
  circleFactory:     (env["VITE_CIRCLE_FACTORY"]     ?? "0x87cd271485e7838607d19bc5b33dc0dc6297f1e3") as `0x${string}`,
  circleTrust:       (env["VITE_CIRCLE_TRUST"]       ?? "0x58c26ba12128e68b203442ac081656b525892b83") as `0x${string}`,
  demoCircle:        (env["VITE_DEMO_CIRCLE"]        ?? "0x7d938c7326ec34fb26f3af4a61259d2a0d19d8e4") as `0x${string}`,
  agentRegistry8004: (env["VITE_AGENT_REGISTRY"]     ?? "0x2978474676279F2E697d5Dd3A54816ff200Ab136") as `0x${string}`,
  agentPayment:      (env["VITE_AGENT_PAYMENT"]      ?? "0xc9DA0e584B4A652B508A0d59D2bbF4418e1775aD") as `0x${string}`,
  cUSD:              "0xB3567F61d19506A023ae7216a27848B13e5c331B" as `0x${string}`,
} as const;
