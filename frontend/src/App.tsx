import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { MiniPayDetector } from "./components/MiniPayDetector";
import { IntentForm }       from "./components/IntentForm";
import { CircleDashboard }  from "./components/CircleDashboard";
import { TrustPanel }       from "./components/TrustPanel";
import { checkMiniPay, CONTRACT_ADDRESSES, celoSepolia }     from "./config/wagmi";

type Tab = "intent" | "circles" | "trust";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "intent",  label: "Save",    icon: "🎯" },
  { id: "circles", label: "Circles", icon: "💰" },
  { id: "trust",   label: "Trust",   icon: "🤝" },
];

function ConnectButton() {
  const { connect, isPending } = useConnect();
  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      style={{
        padding: '8px 16px',
        background: 'var(--dt-accent-muted)',
        border: '1px solid var(--dt-accent)',
        borderRadius: 'var(--dt-radius-full)',
        color: 'var(--dt-accent)',
        fontSize: 'var(--dt-text-sm)',
        fontWeight: 500,
        letterSpacing: 'var(--dt-tracking-wide)',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        transition: 'all 0.2s ease'
      }}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

function WalletStatus() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const isMiniPay = checkMiniPay();

  // Read CELO balance
  const { data: celoBalance } = useBalance({
    address,
    chainId: celoSepolia.id,
    query: { enabled: !!address },
  });

  // Read cUSD balance
  const { data: cUSDBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.cUSD,
    chainId: celoSepolia.id,
    query: { enabled: !!address },
  });

  if (!isConnected) return null;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const celoDisplay = celoBalance ? Number(formatUnits(celoBalance.value, 18)).toFixed(2) : "0.00";
  const cUSDDisplay = cUSDBalance ? Number(formatUnits(cUSDBalance.value, 18)).toFixed(2) : "0.00";

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dt-space-2)' }}>
      {isMiniPay && (
        <span style={{
          fontSize: 'var(--dt-text-xs)', fontWeight: 600,
          padding: '2px 8px', borderRadius: 'var(--dt-radius-full)',
          background: 'var(--dt-accent-muted)', color: 'var(--dt-accent)',
          border: '1px solid rgba(212,175,55,0.3)'
        }}>MiniPay</span>
      )}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
        fontSize: 'var(--dt-text-xs)', fontFamily: 'var(--dt-font-mono)',
        color: 'var(--dt-text-secondary)'
      }}>
        <div>{celoDisplay} CELO</div>
        <div>{cUSDDisplay} cUSD</div>
      </div>
      <span style={{
        fontSize: 'var(--dt-text-xs)', fontFamily: 'var(--dt-font-mono)',
        color: 'var(--dt-text-secondary)', letterSpacing: '0.02em',
        borderLeft: '1px solid var(--dt-border-subtle)',
        paddingLeft: 'var(--dt-space-2)'
      }}>{shortAddr}</span>
      <button
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
        style={{
          fontSize: 12, color: 'var(--dt-text-muted)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 4
        }}
      >×</button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("intent");

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dt-surface-base)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--dt-surface-raised)',
        borderBottom: '1px solid var(--dt-border-default)',
        boxShadow: 'var(--dt-shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: 'var(--dt-space-3) var(--dt-space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dt-space-3)' }}>
            {/* Logo icon */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--dt-accent-muted)',
              border: '1px solid var(--dt-border-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dt-accent)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--dt-font-display)',
                fontSize: 'var(--dt-text-lg)',
                fontWeight: 400,
                color: 'var(--dt-text-primary)',
                lineHeight: 'var(--dt-leading-tight)',
                margin: 0
              }}>IntentCircles</h1>
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-muted)',
                letterSpacing: 'var(--dt-tracking-wide)',
                margin: 0,
                marginTop: 2
              }}>Agent-managed savings · Celo</p>
            </div>
          </div>
          <MiniPayDetector connectButton={<ConnectButton />}>
            <WalletStatus />
          </MiniPayDetector>
        </div>
      </header>

      {/* Testnet banner */}
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: 'var(--dt-space-3) var(--dt-space-4)',
        paddingBottom: 0,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--dt-radius-md)',
          padding: 'var(--dt-space-2) var(--dt-space-3)',
          marginBottom: 'var(--dt-space-4)',
          fontSize: 'var(--dt-text-xs)',
          color: '#F59E0B',
          display: 'flex', alignItems: 'center', gap: 'var(--dt-space-2)',
          flexWrap: 'nowrap'
        }}>
          <span style={{ flexShrink: 0 }}>◆</span>
          <span><strong>Celo Sepolia testnet</strong> — no real funds</span>
        </div>
      </div>

      {/* Main content */}
      <main style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: 'var(--dt-space-4)',
        paddingBottom: 100,
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
        width: '100%',
        overflow: 'hidden'
      }}>
        {activeTab === "intent" && (
          <MiniPayDetector connectButton={
            <div style={{ textAlign: 'center', padding: 'var(--dt-space-12) var(--dt-space-4)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>🎯</div>
              <h3 style={{
                fontFamily: 'var(--dt-font-display)',
                fontSize: 'var(--dt-text-lg)',
                fontWeight: 400,
                color: 'var(--dt-text-primary)',
                marginBottom: 'var(--dt-space-2)'
              }}>Connect to get started</h3>
              <p style={{
                color: 'var(--dt-text-secondary)',
                fontSize: 'var(--dt-text-sm)',
                marginBottom: 'var(--dt-space-4)',
                margin: 0
              }}>Connect your Celo wallet to submit a savings circle intent</p>
              <div style={{ marginTop: 'var(--dt-space-4)' }}>
                <ConnectButton />
              </div>
            </div>
          }>
            <IntentForm />
          </MiniPayDetector>
        )}
        {activeTab === "circles" && <CircleDashboard />}
        {activeTab === "trust" && <TrustPanel />}
      </main>

      {/* Bottom navigation — 44px+ touch targets */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: 'var(--dt-surface-raised)',
        borderTop: '1px solid var(--dt-border-default)',
        boxShadow: '0 -4px 24px rgba(10,8,4,0.4)'
      }}>
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex'
        }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, 
                padding: 'var(--dt-space-2) var(--dt-space-1)',
                minHeight: 56, // 44px+ touch target with padding
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--dt-space-1)',
                borderTop: `2px solid ${activeTab === tab.id ? 'var(--dt-accent)' : 'transparent'}`,
                color: activeTab === tab.id ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--dt-font-body)',
                fontSize: 'var(--dt-text-xs)',
                fontWeight: 500,
                letterSpacing: 'var(--dt-tracking-wide)',
                textTransform: 'uppercase'
              }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <footer style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: 'var(--dt-space-4)',
        textAlign: 'center',
        fontSize: 'var(--dt-text-xs)',
        color: 'var(--dt-text-muted)',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        Built on Celo · Hackathon prototype
      </footer>
    </div>
  );
}
