/**
 * Privacy Status Badge — shows when a circle uses Nightfall privacy mode
 * Displayed in header/circle context
 */

interface PrivacyBadgeProps {
  isPrivate: boolean;
}

export function PrivacyBadge({ isPrivate }: PrivacyBadgeProps) {
  if (!isPrivate) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dt-space-1)',
        padding: 'var(--dt-space-1) var(--dt-space-3)',
        borderRadius: 'var(--dt-radius-full)',
        background: 'rgba(107, 114, 128, 0.08)',
        border: '1px solid rgba(107, 114, 128, 0.2)',
        fontSize: 'var(--dt-text-xs)',
        fontWeight: 600,
        color: 'var(--dt-text-secondary)',
        letterSpacing: 'var(--dt-tracking-wide)',
        textTransform: 'uppercase'
      }}>
        <span>🔓</span>
        <span>Standard Mode</span>
      </div>
    );
  }

  // Private mode — gold accent, more prominent
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--dt-space-1)',
      padding: 'var(--dt-space-1) var(--dt-space-3)',
      borderRadius: 'var(--dt-radius-full)',
      background: 'var(--dt-accent-muted)',
      border: '1px solid var(--dt-border-accent)',
      fontSize: 'var(--dt-text-xs)',
      fontWeight: 600,
      color: 'var(--dt-accent)',
      letterSpacing: 'var(--dt-tracking-wide)',
      textTransform: 'uppercase'
    }}>
      <span>🔒</span>
      <span>Private Mode</span>
    </div>
  );
}
