import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { MiniPayDetector } from "./components/MiniPayDetector";
import { IntentForm }       from "./components/IntentForm";
import { CircleDashboard }  from "./components/CircleDashboard";
import { TrustPanel }       from "./components/TrustPanel";
import { CreditPanel }      from "./components/CreditPanel";
import { BarterMarketplace } from "./components/BarterMarketplace";
import { AgentChat }        from "./components/AgentChat";
import { ActivityFeed }     from "./components/ActivityFeed";
import { checkMiniPay, CONTRACT_ADDRESSES, celoSepolia }     from "./config/wagmi";

type Tab = "intent" | "circles" | "credit" | "agent" | "trust";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "intent",  label: "Save",    icon: "🔒" },
  { id: "circles", label: "Circles", icon: "🔄" },
  { id: "agent",   label: "ROSA",    icon: "🤖" },
  { id: "credit",  label: "Credit",  icon: "💳" },
  { id: "trust",   label: "Trust",   icon: "🛡️" },
];

function ConnectButton() {
  const { connect, isPending } = useConnect();
  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      style={{
        padding: '6px 14px',
        background: 'var(--dt-accent)',
        border: 'none',
        borderRadius: 'var(--dt-radius-sm)',
        color: 'var(--dt-text-primary)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {isPending ? "..." : "Connect Wallet"}
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
          padding: '2px 8px', borderRadius: '12px',
          background: 'var(--dt-accent-muted)', color: 'var(--dt-accent-hover)',
          border: '1px solid var(--dt-accent)'
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
        borderLeft: '1px solid var(--dt-border-default)',
        paddingLeft: 'var(--dt-space-2)'
      }}>{shortAddr}</span>
      <button
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
        style={{
          fontSize: 12, color: '#7A7468',
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
        boxSizing: 'border-box',
        paddingTop: 'env(safe-area-inset-top)'
      }}>
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: 'var(--dt-space-2) var(--dt-space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          width: '100%',
          gap: '8px',
          minHeight: 48,
          overflow: 'visible'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dt-space-2)', minWidth: 0 }}>
            {/* Logo icon */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--dt-accent-muted)',
              border: '1px solid var(--dt-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dt-accent)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{
                fontFamily: 'var(--dt-font-display)',
                fontSize: 'var(--dt-text-base)',
                fontWeight: 400,
                color: 'var(--dt-text-primary)',
                lineHeight: 'var(--dt-leading-tight)',
                margin: 0,
                whiteSpace: 'nowrap'
              }}>ROSA</h1>
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-secondary)',
                letterSpacing: 'var(--dt-tracking-wide)',
                margin: 0,
                lineHeight: '1.0',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}>Private savings circles</p>
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
        padding: '0 var(--dt-space-3)',
        paddingTop: 'var(--dt-space-2)',
        paddingBottom: 'var(--dt-space-2)',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{
          background: 'var(--dt-accent-muted)',
          border: '1px solid var(--dt-accent)',
          borderRadius: 'var(--dt-radius-md)',
          padding: 'var(--dt-space-2) var(--dt-space-3)',
          fontSize: 'var(--dt-text-xs)',
          color: 'var(--dt-accent-hover)',
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
        padding: 'var(--dt-space-3)',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        {activeTab === "intent" && (
          <MiniPayDetector connectButton={
            <div style={{
              textAlign: 'center',
              padding: 'var(--dt-space-8) var(--dt-space-4)',
              background: 'var(--dt-surface-raised)',
              borderRadius: '16px',
              boxShadow: 'var(--dt-shadow-md)',
              marginTop: 'var(--dt-space-4)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--dt-accent-muted)',
                border: '1px solid var(--dt-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--dt-space-4)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--dt-accent)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3 style={{
                fontFamily: 'var(--dt-font-display)',
                fontSize: '20px',
                fontWeight: 400,
                color: '#F5F0E8',
                margin: '0 0 8px 0',
              }}>Your circle, your rules</h3>
              <p style={{
                color: '#B8B0A0',
                fontSize: '13px',
                lineHeight: '1.6',
                margin: '0 0 8px 0',
                padding: '0 12px',
              }}>ROSA runs your savings circle so no one has to. Private contributions, automated payouts, on-chain trust — all managed by an autonomous agent.</p>
              <p style={{
                color: '#7A7468',
                fontSize: '11px',
                lineHeight: '1.5',
                margin: '0 0 20px 0',
                padding: '0 16px',
                fontStyle: 'italic',
              }}>No coordinator chasing payments. No one sees your balance.</p>
              <ConnectButton />
            </div>
          }>
            <IntentForm />
          </MiniPayDetector>
        )}
        {activeTab === "circles" && <CircleDashboard />}
        {activeTab === "credit" && <CreditPanel />}
        {activeTab === "agent" && (
          <div className="agent-layout" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dt-space-3)',
            height: 'calc(100vh - 200px)',
            overflow: 'hidden',
          }}>
            {/* Chat — takes priority, fills available space */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <AgentChat />
            </div>
            {/* Activity feed — compact on mobile, max 200px */}
            <div style={{ maxHeight: 200, overflow: 'auto', flexShrink: 0 }}>
              <ActivityFeed />
            </div>
          </div>
        )}
        {activeTab === "trust" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-6)' }}>
            <TrustPanel />
            <BarterMarketplace />
          </div>
        )}
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
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        width: '100%',
        boxSizing: 'border-box',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          width: '100%'
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, 
                padding: '8px 2px 6px',
                minHeight: 52,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                borderTop: isActive ? '2px solid var(--dt-accent)' : '2px solid transparent',
                borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
                color: isActive ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
                background: 'none', cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--dt-font-mono, monospace)',
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
            </button>
            );
          })}
        </div>
      </nav>

      {/* Footer — inside main content area, not after nav */}
    </div>
  );
}
