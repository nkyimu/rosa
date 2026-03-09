import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { MiniPayDetector } from "./components/MiniPayDetector";
import { IntentForm }       from "./components/IntentForm";
import { CircleDashboard }  from "./components/CircleDashboard";
import { TrustPanel }       from "./components/TrustPanel";
import { checkMiniPay }     from "./config/wagmi";

type Tab = "intent" | "circles" | "trust";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "intent",  label: "Submit Intent", icon: "🎯" },
  { id: "circles", label: "My Circles",    icon: "💰" },
  { id: "trust",   label: "Trust Network", icon: "🤝" },
];

function ConnectButton() {
  const { connect, isPending } = useConnect();
  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

function WalletStatus() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const isMiniPay = checkMiniPay();
  if (!isConnected) return null;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  return (
    <div className="flex items-center gap-2">
      {isMiniPay && (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">MiniPay</span>
      )}
      <span className="text-sm text-gray-600 font-mono">{shortAddr}</span>
      <span className="text-xs text-gray-400">{chain?.name}</span>
      <button onClick={() => disconnect()} className="text-xs text-gray-400 hover:text-gray-600 ml-1">x</button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("intent");
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪙</span>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">IntentCircles</h1>
              <p className="text-xs text-gray-400 leading-tight">Agent-managed savings circles on Celo</p>
            </div>
          </div>
          <MiniPayDetector connectButton={<ConnectButton />}>
            <WalletStatus />
          </MiniPayDetector>
        </div>
      </header>
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4">
          <nav className="flex">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-amber-800 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>Testnet Alpha</strong> — Celo Alfajores. No real funds.</span>
        </div>
        {activeTab === "intent" && (
          <MiniPayDetector connectButton={
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Connect to get started</h3>
              <p className="text-gray-500 text-sm mb-4">Connect your Celo wallet to submit a savings circle intent</p>
              <ConnectButton />
            </div>
          }>
            <IntentForm />
          </MiniPayDetector>
        )}
        {activeTab === "circles" && <CircleDashboard />}
        {activeTab === "trust" && <TrustPanel />}
      </main>
      <footer className="max-w-lg mx-auto px-4 pb-8 pt-2 text-center text-xs text-gray-400">
        Built on Celo · Hackathon prototype
      </footer>
    </div>
  );
}
