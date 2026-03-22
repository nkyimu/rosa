import { useState } from 'react'

interface TransactionReceiptProps {
  amount?: string
  currency?: string
  status?: 'pending' | 'finalized' | 'failed'
  date?: string
  fromAddress?: string
  circleId?: string
  networkFee?: string
  txHash?: string
  description?: string
  onClose?: () => void
}

export function TransactionReceipt({
  amount = '500.00',
  currency = 'USDC',
  status = 'finalized',
  date = new Date().toLocaleDateString(),
  fromAddress = '0x742d...8F9a',
  circleId = 'DemoCircle-001',
  networkFee = '0.02',
  txHash = '0x3f4a...9d2c',
  description = 'Endorsed to Threshold',
  onClose
}: TransactionReceiptProps) {
  const [copied, setCopied] = useState(false)

  function truncateAddress(addr: string) {
    if (addr.length <= 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColor = {
    pending: 'var(--dt-state-info)',
    finalized: 'var(--dt-trust-community)',
    failed: 'var(--dt-state-error)'
  }[status]

  const statusLabel = {
    pending: 'PENDING',
    finalized: '✓ FINALIZED',
    failed: '✗ FAILED'
  }[status]

  return (
    <div style={{
      maxWidth: '420px',
      margin: '0 auto',
      paddingBottom: 'var(--dt-space-8)'
    }}>
      {/* Scalloped Receipt Card */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-2xl)',
        overflow: 'hidden',
        boxShadow: 'var(--dt-shadow-card)',
        position: 'relative'
      }}>
        {/* Top Scalloped Edge (perforated effect) */}
        <div style={{
          height: '12px',
          background: `
            radial-gradient(circle at 0 12px, transparent 12px, var(--dt-surface-raised) 12px),
            radial-gradient(circle at 12px 0, transparent 12px, var(--dt-surface-raised) 12px)
          `,
          backgroundSize: '12px 12px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: '0 -6px'
        }} />

        {/* Main Content */}
        <div style={{
          padding: 'var(--dt-space-8) var(--dt-space-6)',
          textAlign: 'center'
        }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--dt-space-2)',
            padding: 'var(--dt-space-2) var(--dt-space-4)',
            background: status === 'finalized' ? 'rgba(53, 208, 127, 0.1)' : 'rgba(116, 192, 252, 0.1)',
            border: `1px solid ${statusColor}`,
            borderRadius: 'var(--dt-radius-full)',
            color: statusColor,
            fontFamily: 'var(--dt-font-body)',
            fontWeight: 600,
            fontSize: 'var(--dt-text-xs)',
            letterSpacing: 'var(--dt-tracking-wide)',
            marginBottom: 'var(--dt-space-8)'
          }}>
            {statusLabel}
          </div>

          {/* Amount Display */}
          <div style={{
            marginBottom: 'var(--dt-space-6)'
          }}>
            <div style={{
              fontFamily: 'var(--dt-font-display)',
              fontSize: 'var(--dt-text-4xl)',
              fontWeight: 400,
              color: 'var(--dt-text-primary)',
              margin: 0,
              lineHeight: 'var(--dt-leading-none)'
            }}>
              {amount}
            </div>
            <p style={{
              fontFamily: 'var(--dt-font-mono)',
              fontSize: 'var(--dt-text-sm)',
              color: 'var(--dt-text-muted)',
              marginTop: 'var(--dt-space-2)',
              margin: 'var(--dt-space-2) 0 0 0'
            }}>
              {currency} → {description}
            </p>
          </div>

          {/* Divider */}
          <div style={{
            borderTop: '1px dashed var(--dt-border-default)',
            margin: 'var(--dt-space-6) 0'
          }} />

          {/* Transaction Details */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dt-space-4)',
            fontSize: 'var(--dt-text-sm)',
            marginBottom: 'var(--dt-space-8)',
            textAlign: 'left'
          }}>
            {/* Date */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--dt-text-muted)' }}>Date</span>
              <span style={{ color: 'var(--dt-text-primary)', fontFamily: 'var(--dt-font-mono)' }}>
                {date}
              </span>
            </div>

            {/* From Address */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--dt-text-muted)' }}>From</span>
              <span style={{
                color: 'var(--dt-text-primary)',
                fontFamily: 'var(--dt-font-mono)',
                cursor: 'pointer'
              }} onClick={() => copyToClipboard(fromAddress)}>
                {truncateAddress(fromAddress)}
              </span>
            </div>

            {/* Circle ID */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--dt-text-muted)' }}>Circle</span>
              <span style={{ color: 'var(--dt-text-primary)', fontFamily: 'var(--dt-font-mono)' }}>
                {circleId}
              </span>
            </div>

            {/* Network Fee */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--dt-text-muted)' }}>Network Fee</span>
              <span style={{ color: 'var(--dt-text-secondary)', fontFamily: 'var(--dt-font-mono)' }}>
                {networkFee} {currency}
              </span>
            </div>

            {/* TX Hash */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--dt-text-muted)' }}>TX Hash</span>
              <span
                style={{
                  color: 'var(--dt-accent)',
                  fontFamily: 'var(--dt-font-mono)',
                  cursor: 'pointer',
                  fontSize: 'var(--dt-text-xs)'
                }}
                onClick={() => copyToClipboard(txHash)}
                title={txHash}
              >
                {truncateAddress(txHash)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 'var(--dt-space-3)',
            justifyContent: 'center'
          }}>
            <button
              style={{
                padding: 'var(--dt-space-3) var(--dt-space-5)',
                background: 'transparent',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                color: 'var(--dt-text-primary)',
                fontFamily: 'var(--dt-font-body)',
                fontSize: 'var(--dt-text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
                minHeight: 44
              }}

            >
              📋 SHARE RECEIPT
            </button>

            <button
              style={{
                padding: 'var(--dt-space-3) var(--dt-space-5)',
                background: 'var(--dt-accent)',
                border: '1px solid var(--dt-accent)',
                borderRadius: 'var(--dt-radius-lg)',
                color: '#FFF',
                fontFamily: 'var(--dt-font-body)',
                fontSize: 'var(--dt-text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
                minHeight: 44
              }}

              onClick={() => window.open('https://celoscan.io')}
            >
              🔗 VIEW ON EXPLORER
            </button>
          </div>
        </div>

        {/* Bottom Scalloped Edge */}
        <div style={{
          height: '12px',
          background: `
            radial-gradient(circle at 0 0, transparent 12px, var(--dt-surface-raised) 12px),
            radial-gradient(circle at 12px 12px, transparent 12px, var(--dt-surface-raised) 12px)
          `,
          backgroundSize: '12px 12px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: '0 0'
        }} />
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 'var(--dt-space-4)',
            padding: 'var(--dt-space-3) var(--dt-space-4)',
            background: 'transparent',
            border: 'none',
            color: 'var(--dt-text-muted)',
            fontFamily: 'var(--dt-font-body)',
            fontSize: 'var(--dt-text-sm)',
            cursor: 'pointer',
            transition: 'color var(--dt-duration-fast) var(--dt-ease-out)'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--dt-text-primary)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--dt-text-muted)'
          }}
        >
          Close
        </button>
      )}

      {/* Copy Feedback */}
      {copied && (
        <div style={{
          position: 'fixed',
          bottom: 'var(--dt-space-6)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--dt-text-primary)',
          color: 'var(--dt-surface-base)',
          padding: 'var(--dt-space-3) var(--dt-space-4)',
          borderRadius: 'var(--dt-radius-full)',
          fontSize: 'var(--dt-text-sm)',
          fontWeight: 600,
          zIndex: 1000,
          animation: 'dt-fade-in var(--dt-duration-normal) var(--dt-ease-out)'
        }}>
          ✓ Copied!
        </div>
      )}
    </div>
  )
}
