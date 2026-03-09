import { createConfig, http, injected } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";

/** Returns true when running inside MiniPay super-app */
export function checkMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).ethereum?.isMiniPay === true;
}

export const wagmiConfig = createConfig({
  chains: [celoAlfajores, celo],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [celoAlfajores.id]: http("https://alfajores-forno.celo-testnet.org"),
    [celo.id]: http("https://forno.celo.org"),
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = import.meta.env as Record<string, any>;

export const CONTRACT_ADDRESSES = {
  intentRegistry: (env["VITE_INTENT_REGISTRY"] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  circleFactory:  (env["VITE_CIRCLE_FACTORY"]  ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  circleTrust:    (env["VITE_CIRCLE_TRUST"]    ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  cUSD:           "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
} as const;
