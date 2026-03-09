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
  intentRegistry: (env["VITE_INTENT_REGISTRY"] ?? "0x6Bddd66698206c9956e5ac65F9083A132B574844") as `0x${string}`,
  circleFactory:  (env["VITE_CIRCLE_FACTORY"]  ?? "0x87cd271485E7838607D19Bc5B33Dc0DC6297F1E3") as `0x${string}`,
  circleTrust:    (env["VITE_CIRCLE_TRUST"]    ?? "0x58C26bA12128e68B203442AC081656b525892B83") as `0x${string}`,
  demoCircle:     "0x7D938c7326eC34fB26F3aF4A61259D2a0D19D8e4" as `0x${string}`,
  cUSD:           "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80" as `0x${string}`,
} as const;
