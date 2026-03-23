import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { MiniPayDetector } from "./components/MiniPayDetector";
import { CircleDashboard }  from "./components/CircleDashboard";
import { AgentDashboard }   from "./components/AgentDashboard";
import { TrustPanel }       from "./components/TrustPanel";
import { BarterMarketplace } from "./components/BarterMarketplace";
import { AgentChat }        from "./components/AgentChat";
import { ActivityFeed }     from "./components/ActivityFeed";
import { JoinCircle }       from "./components/JoinCircle";
import { checkMiniPay, CONTRACT_ADDRESSES, celoSepolia }     from "./config/wagmi";

type Tab = "agent" | "circles" | "trust";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "agent",   label: "ROSA",    icon: "💬" },
  { id: "circles", label: "Circles", icon: "🔄" },
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
        color: '#FFF',
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
      {isPending ? "..." : "Sign In"}
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
  const [activeTab, setActiveTab] = useState<Tab>("agent");
  const [joinAddress, setJoinAddress] = useState<string | null>(() => {
    const m = window.location.hash.match(/^#\/join\/(.+)$/);
    return m ? m[1] : null;
  });

  useEffect(() => {
    const onHash = () => {
      const m = window.location.hash.match(/^#\/join\/(.+)$/);
      setJoinAddress(m ? m[1] : null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Check for join invite link
  if (joinAddress) {
    return <JoinCircle 
      circleAddress={joinAddress} 
      onBack={() => { 
        window.location.hash = ''; 
        setJoinAddress(null);
      }} 
    />;
  }

  return (
    <div style={{ minHeight: '100vh', background: activeTab === 'agent' ? '#f5f4ef' : 'var(--dt-surface-base)' }}>

      {/* Main content */}
      <main style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: activeTab === 'agent' ? '0' : 'var(--dt-space-3)',
        paddingTop: activeTab === 'agent' ? '0' : 'var(--dt-space-3)',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
        width: '100%',
        height: activeTab === 'agent' ? 'calc(100vh - 64px)' : 'auto',
      }}>
        {activeTab === "circles" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Wallet + testnet — only on Circles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{
                background: 'var(--dt-accent-muted)',
                border: '1px solid var(--dt-accent)',
                borderRadius: 'var(--dt-radius-md)',
                padding: '6px 12px',
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-accent-hover)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span>◆</span>
                <span>Celo Sepolia</span>
              </div>
              <MiniPayDetector connectButton={<ConnectButton />}>
                <WalletStatus />
              </MiniPayDetector>
            </div>
            <CircleDashboard />
            <AgentDashboard />
            <div style={{ borderTop: '1px solid var(--dt-border-default)', paddingTop: '16px' }}>
              <ActivityFeed />
            </div>
          </div>
        )}
        {activeTab === "agent" && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}>
            <AgentChat />
          </div>
        )}
        {activeTab === "trust" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-6)' }}>
            <TrustPanel />
            <BarterMarketplace />
          </div>
        )}
      </main>

      {/* Bottom navigation — minimal, modern */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: activeTab === 'agent' ? '#ffffff' : 'var(--dt-surface-raised)',
        borderTop: `1px solid ${activeTab === 'agent' ? '#e4e2db' : 'var(--dt-border-default)'}`,
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
                padding: '10px 2px 8px',
                minHeight: 44,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                border: 'none',
                color: isActive ? '#c85a3f' : '#8c8981',
                background: 'none', cursor: 'pointer',
                transition: 'color 0.2s ease',
                fontFamily: "'Inter', sans-serif",
                fontSize: '10px',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{tab.icon}</span>
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
