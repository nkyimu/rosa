# IntentCircles — Design Review & Improvement Spec
> **Author:** Emory (Design Director, AMANTU)  
> **Date:** 2026-03-09  
> **Status:** For Immediate Implementation — Hackathon Sprint  
> **Repo:** `/Users/cerebro/.openclaw/workspace/intent-circles/frontend/`

---

## Executive Summary

IntentCircles has solid bones — the blockchain integration is real, the intent matching concept is compelling, and the MiniPay detection is thoughtful. But the current UI reads as a **generic dark Celo app** that looks like 50 other hackathon submissions.

The gap between "functional prototype" and "design that wins" is three things:
1. **Wrong palette** — Celo green on cold dark gray vs. warm obsidian with gold/trust accents
2. **Missing warmth** — no texture, no personality, no sense that this is for *humans* and their *savings*
3. **Flat trust visualization** — a number badge is not a trust system; three visual dimensions are

This review covers all seven dimensions, writes improvement tickets for each component, and delivers a ready-to-import token file. Estimated implementation time: 4-6 hours for P0+P1 items. That's the window before the demo video.

---

## 1. Design Audit Report

### 1.1 Visual Identity — SCORE: 2/10 against Post Post

**Current state:** Generic dark fintech. `#1A1B1F` background, `#35D07F` Celo green accents, system font stack. This is the default aesthetic for anything built on Celo. No distinctive brand signal.

**ROSA Post Post direction:** Warm obsidian surfaces (rich black-brown, not cold gray-black). Gold (`#D4AF37`) as primary accent — trust implies value, gold implies value. Three-dimensional trust colors (blue for reliability, gold for credit, green for community). Paper noise texture makes digital feel handcrafted. Instrument Serif / Cormorant Garamond for display type signals record-keeping tradition — exactly right for savings circles.

**Key issues:**
- The color `#1A1B1F` reads cold and tech. `#0A0804` reads warm and premium.
- Celo green (`#35D07F`) is a brand constraint but shouldn't be the *design system* primary
- System font stack (`-apple-system, BlinkMacSystemFont...`) has zero personality
- No shadows at all on most components
- Emoji 🪙 as logo is placeholder energy

**Priority fix:** Swap the cold dark + green system for warm obsidian + gold hierarchy. Celo green can stay as `--dt-trust-community` (it's literally a green, and community = green). This repositions the brand color as a trust signal, not just a color.

---

### 1.2 Color System — SCORE: 3/10

**Current palette:**
```
Background:  #1A1B1F  (cold gray-black)
Card:        #23252B  (cold dark gray)
Border:      #2E3038  (cold gray)
Text muted:  #8B8FA8  (cool gray-blue)
Accent:      #35D07F  (Celo green)
White:       #FFFFFF  (IntentForm/TrustPanel inconsistently use white cards)
```

**Problems:**
1. **Inconsistent theming**: `index.css` sets dark body, but `IntentForm` and `TrustPanel` use `bg-white` Tailwind classes — creating a jarring light-island-in-dark-sea effect. CircleDashboard uses the dark card system. These three components are not in the same visual universe.
2. **Cold grays** read clinical, not communal. This is a savings circle for Nigerians, Kenyans, Ghanaians — people who associate money with warmth and community, not cold tech interfaces.
3. **No hierarchy** in the color system — green is used for progress bars, buttons, accents, yield numbers, focus rings — it's everywhere and therefore nowhere.

**ROSA correction:**
```
Background:    #0A0804  (warm obsidian — brown-black, not gray-black)
Surface:       #16130E  (raised surface)
Overlay:       #211D15  (overlays, cards)
Accent:        #D4AF37  (gold — trust implies value)
Trust colors:  #3B82F6 (reliability), #D4AF37 (credit), #22C55E (community/Celo)
Text primary:  #F5F1E8  (warm sand, not pure white)
Text secondary:#C8BFA8  (warm sand, muted)
```

The critical insight: **Celo green becomes `--dt-trust-community`**. It keeps its role in the UI but as a *semantic color* (community trust), not the primary brand driver. The primary accent is gold, which works better for finance contexts.

---

### 1.3 Typography — SCORE: 2/10

**Current:** System font stack only. No web fonts. No typographic personality.

**Problems:**
- System fonts are fine for body text but fail for any display/headline use
- The app name "IntentCircles" displayed in system bold reads like a wireframe label
- Transaction amounts, trust scores, and circle data all look the same typographically — no visual hierarchy for what matters

**ROSA recommendation for IntentCircles:**

| Role | Font | Usage |
|------|------|-------|
| Display/Hero | **Cormorant Garamond** | App name, section headers, circle names |
| Body/UI | **DM Sans** | All body text, labels, buttons |
| Data/Mono | **JetBrains Mono** | Wallet addresses, tx hashes, amounts |

Cormorant Garamond is the right choice here (vs. Instrument Serif) because it has stronger cultural resonance with ledger/record-keeping traditions. When a user in Lagos sees serif type on a savings app, it reads "institution" and "trust" — not "startup."

**Google Fonts link (add to index.html `<head>`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

### 1.4 Component Quality — SCORE: 4/10

**IntentForm:**
- White card works on white background but conflicts with the dark body
- Form controls are clean and functional
- The "Your Circle Intent" summary box is good UX — needs styling to feel more like a contract/document
- CTA button is generic green pill — no hierarchy, no excitement

**CircleDashboard:**
- Inline style `style={{ background: '#23242A' }}` — hardcoded color, bypasses the token system
- Progress bar in Celo green is fine but generic
- Card structure is functional; needs warm elevation instead of cold dark surface
- "Claim Payout" button is the most important CTA in the entire app and it just has an outline style

**TrustPanel:**
- Again white cards, conflicting with dark body
- Trust score displayed as a colored badge (green/yellow/red) is a step in the right direction but misses the three-dimension opportunity entirely
- The vouch form is functional but cold
- Trust edges list is bare — no sense of the *relationship*

**Overall:** Components are functional but aesthetically fragmented. Unifying them under the warm obsidian + gold system will immediately elevate perceived quality.

---

### 1.5 Mobile UX — SCORE: 5/10

MiniPay runs on phones. This entire app needs to be evaluated thumb-first.

**Good:**
- `max-w-lg mx-auto` constrains width correctly for phone-sized view
- Tab navigation is clean
- MiniPay auto-connect is thoughtful UX

**Bad:**
- Tab labels hidden on mobile: `hidden sm:inline` — so tabs show only emoji on small screens. The emojis 🎯 💰 🤝 are not self-explanatory enough without labels. MiniPay users in Nigeria deserve readable tab labels.
- Touch targets: range sliders are 100% width but the thumb is tiny. Need `height: 44px` minimum for touch area.
- Connect wallet "empty state" has a centered layout with 5rem emoji that eats vertical space on small screens
- The amber warning banner ("Testnet Alpha") takes precious phone-screen real estate
- No sticky bottom navigation — the tab bar at top requires reaching up on a phone

**Critical fix:** On MiniPay (phone), flip to bottom navigation. The current top-tab pattern is fine for desktop browser but wrong for thumb-zone usability. MiniPay users will be using this one-handed.

---

### 1.6 Trust Visualization — SCORE: 3/10

**Current state:** Trust score = one number badge with traffic-light color (green ≥80, yellow 50–79, red <50). That's it.

**Why this fails:** Trust in a savings circle isn't one-dimensional. A person can be:
- *Reliable* (always pays on time) but *new to circles* (low community score)
- *Community-connected* (5 circles completed) but *financially stretched* (low credit score)

The ROSA design system established three trust dimensions precisely because they model reality better:
- **Reliability** (blue `#3B82F6`) — Payment history, on-time rate
- **Credit** (gold `#D4AF37`) — Borrowing capacity, financial track record  
- **Community** (green `#22C55E`) — Circle membership, referrals, vouches

**What the trust panel should show:**
1. Overall composite score (large, prominent)
2. Three dimension bars — blue/gold/green showing the breakdown
3. What the score *enables* — "Score 73: qualifies for circles up to $50/cycle"
4. Recent activity — "2 vouches received this month"

The current `TrustPanel` reads wallet data for the composite score. It doesn't have the three-dimension breakdown yet (that would need contract support or a mockup). For the hackathon demo, a convincing three-dimension visualization with mock data creates the right impression and demonstrates the vision.

---

### 1.7 Accessibility — SCORE: 6/10

**Good:**
- Color-coded states have text alternatives (`Expired`, `Waiting for round`)
- Form labels properly associated
- Focus ring on inputs (emerald ring)

**Issues:**
- Contrast ratio: `#8B8FA8` text on `#23252B` background = ~3:1. WCAG AA requires 4.5:1 for small text.
- Range sliders have no visible value labels beyond screen text
- `disconnect` button is just "x" — no aria-label
- The "Vouch" button during loading just says "Submitting..." with no progress indicator
- `ConnectButton` and `WalletStatus` are inline in `App.tsx` — should have proper component structure for screen reader traversal

**Fixes:**
- `<button aria-label="Disconnect wallet">×</button>`
- Bump muted text to `--dt-text-secondary: #C8BFA8` which passes WCAG AA on dark backgrounds
- Add `aria-valuetext` to range sliders

---

## 2. Component Improvement Tickets

---

### TICKET-IC-001: Global Theme Unification
**Priority:** P0 | **Est:** 1hr

**Current state:** Three conflicting visual systems in one app — dark body from `index.css`, white cards in `IntentForm`/`TrustPanel`, dark cards in `CircleDashboard`. The app looks like three different prototypes glued together.

**Desired state:** Single warm obsidian system. Every surface uses `--dt-surface-*` tokens. White cards are eliminated. Paper noise texture on body. Warm shadows.

**ROSA tokens to apply:**
```css
body { background: var(--dt-surface-base); color: var(--dt-text-primary); }
.card { background: var(--dt-surface-raised); border: 1px solid var(--dt-border-default); }
.card-elevated { background: var(--dt-surface-overlay); }
```

**Code changes:**

`index.css` — replace entirely with import of rosa-tokens.css + base styles:
```css
@import "./styles/rosa-tokens.css";
@import "tailwindcss";

body {
  background-color: var(--dt-surface-base);
  color: var(--dt-text-primary);
  font-family: var(--dt-font-body);
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

/* Paper noise — Layer 1 (body) */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  opacity: 0.04;
  mix-blend-mode: screen;
}

#root { min-height: 100vh; position: relative; z-index: 1; }
```

In all components: replace `bg-white` → `bg-[var(--dt-surface-raised)]`, `bg-gray-50` → `bg-[var(--dt-surface-base)]`, `text-gray-900` → `text-[var(--dt-text-primary)]`, `text-gray-500` → `text-[var(--dt-text-secondary)]`.

---

### TICKET-IC-002: App.tsx — Header + Navigation Redesign
**Priority:** P0 | **Est:** 1.5hr

**Current state:**
- White header bar with coin emoji + "IntentCircles" in system bold
- Tab bar above content with emoji + hidden text labels
- Cold gray background

**Desired state:**
- Warm obsidian header with Cormorant Garamond logotype
- Bottom navigation on mobile (MiniPay thumb zone)
- Tab labels always visible (no `hidden sm:inline`)
- Gold accent on active tab indicator

**Changes — `App.tsx`:**

```tsx
// Header redesign
<header className="sticky top-0 z-20" style={{
  background: `var(--dt-surface-raised)`,
  borderBottom: `1px solid var(--dt-border-default)`,
  boxShadow: `var(--dt-shadow-sm)`
}}>
  <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {/* Replace emoji with SVG circle icon */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `var(--dt-accent-muted)`,
        border: `1px solid var(--dt-accent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dt-accent)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div>
        <h1 style={{
          fontFamily: `var(--dt-font-display)`,
          fontSize: `var(--dt-text-lg)`,
          fontWeight: 400,
          color: `var(--dt-text-primary)`,
          lineHeight: `var(--dt-leading-tight)`
        }}>IntentCircles</h1>
        <p style={{
          fontSize: `var(--dt-text-xs)`,
          color: `var(--dt-text-muted)`,
          letterSpacing: `var(--dt-tracking-wide)`
        }}>Agent-managed savings · Celo</p>
      </div>
    </div>
    <MiniPayDetector connectButton={<ConnectButton />}>
      <WalletStatus />
    </MiniPayDetector>
  </div>
</header>

// Bottom tab navigation (replaces top nav)
<nav className="fixed bottom-0 left-0 right-0 z-20" style={{
  background: `var(--dt-surface-raised)`,
  borderTop: `1px solid var(--dt-border-default)`,
  boxShadow: `0 -4px 24px rgba(0,0,0,0.4)`
}}>
  <div className="max-w-lg mx-auto flex">
    {TABS.map((tab) => (
      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
        style={{
          flex: 1, padding: '12px 4px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          borderTop: `2px solid ${activeTab === tab.id ? 'var(--dt-accent)' : 'transparent'}`,
          color: activeTab === tab.id ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
          transition: 'all 0.2s ease',
          background: 'none', border: 'none', cursor: 'pointer'
        }}>
        <span style={{ fontSize: 20 }}>{tab.icon}</span>
        <span style={{
          fontSize: `var(--dt-text-xs)`,
          fontWeight: 500,
          letterSpacing: `var(--dt-tracking-wide)`,
          textTransform: 'uppercase'
        }}>{tab.label}</span>
      </button>
    ))}
  </div>
</nav>
```

Add `pb-20` to `<main>` to clear the fixed bottom nav.

---

### TICKET-IC-003: ConnectButton + WalletStatus Redesign
**Priority:** P0 | **Est:** 30min

**Current state:**
- `ConnectButton`: `bg-emerald-600` pill — generic
- `WalletStatus`: `text-gray-600`, small "x" button

**Desired state:**
- `ConnectButton`: Gold-accented, Cormorant Garamond text
- `WalletStatus`: Warm surface chip with mono address

```tsx
function ConnectButton() {
  const { connect, isPending } = useConnect();
  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      style={{
        padding: '8px 16px',
        background: `var(--dt-accent-muted)`,
        border: `1px solid var(--dt-accent)`,
        borderRadius: `var(--dt-radius-full)`,
        color: `var(--dt-accent)`,
        fontSize: `var(--dt-text-sm)`,
        fontWeight: 500,
        letterSpacing: `var(--dt-tracking-wide)`,
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
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const isMiniPay = checkMiniPay();
  if (!isConnected) return null;
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {isMiniPay && (
        <span style={{
          fontSize: `var(--dt-text-xs)`, fontWeight: 600,
          padding: '2px 8px', borderRadius: `var(--dt-radius-full)`,
          background: `rgba(212,175,55,0.15)`, color: `var(--dt-accent)`,
          border: `1px solid rgba(212,175,55,0.3)`
        }}>MiniPay</span>
      )}
      <span style={{
        fontSize: `var(--dt-text-xs)`, fontFamily: `var(--dt-font-mono)`,
        color: `var(--dt-text-secondary)`, letterSpacing: '0.02em'
      }}>{shortAddr}</span>
      <button
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
        style={{
          fontSize: 12, color: `var(--dt-text-muted)`,
          background: 'none', border: 'none', cursor: 'pointer', padding: 4
        }}
      >×</button>
    </div>
  );
}
```

---

### TICKET-IC-004: IntentForm — "Make a Wish" Redesign
**Priority:** P0 | **Est:** 2hr

**Current state:** Functional white card form. Feels like a bank form.

**Desired state:** The intent submission is the HERO interaction. It should feel like making a wish — deliberate, meaningful, slightly magical. The "Your Circle Intent" summary should look like a *document* or *contract*, not a gray box.

**Key changes:**

```tsx
// Replace the container
<div style={{
  background: `var(--dt-surface-raised)`,
  borderRadius: `var(--dt-radius-xl)`,
  border: `1px solid var(--dt-border-default)`,
  padding: 24,
  boxShadow: `var(--dt-shadow-md)`,
  position: 'relative',
  overflow: 'hidden'
}}>
  {/* Paper noise layer on card */}
  <div style={{
    position: 'absolute', inset: 0, borderRadius: `var(--dt-radius-xl)`,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    opacity: 0.06, pointerEvents: 'none', mixBlendMode: 'screen'
  }} />

  {/* Display heading with Cormorant */}
  <h2 style={{
    fontFamily: `var(--dt-font-display)`,
    fontSize: `var(--dt-text-2xl)`,
    fontWeight: 400,
    color: `var(--dt-text-primary)`,
    marginBottom: 4,
    letterSpacing: `var(--dt-tracking-tight)`
  }}>Join a Savings Circle</h2>
  <p style={{ color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-sm)`, marginBottom: 24 }}>
    State your intent — the agent finds your people.
  </p>

  {/* Amount input — larger, more prominent */}
  <div style={{ marginBottom: 20 }}>
    <label style={{
      display: 'block', fontSize: `var(--dt-text-xs)`, fontWeight: 500,
      color: `var(--dt-text-muted)`, letterSpacing: `var(--dt-tracking-widest)`,
      textTransform: 'uppercase', marginBottom: 8
    }}>Contribution per round</label>
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
        fontFamily: `var(--dt-font-mono)`, color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-lg)`
      }}>$</span>
      <input type="number" min="1" step="1" value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
          background: `var(--dt-surface-overlay)`, border: `1px solid var(--dt-border-default)`,
          borderRadius: `var(--dt-radius-lg)`, color: `var(--dt-text-primary)`,
          fontFamily: `var(--dt-font-mono)`, fontSize: `var(--dt-text-xl)`, fontWeight: 500,
          outline: 'none', boxSizing: 'border-box'
        }} />
    </div>
    <p style={{ fontSize: `var(--dt-text-xs)`, color: `var(--dt-text-muted)`, marginTop: 4 }}>
      Matched with members within 10%
    </p>
  </div>

  {/* Cycle duration buttons */}
  <div style={{ marginBottom: 20 }}>
    <label style={{
      display: 'block', fontSize: `var(--dt-text-xs)`, fontWeight: 500,
      color: `var(--dt-text-muted)`, letterSpacing: `var(--dt-tracking-widest)`,
      textTransform: 'uppercase', marginBottom: 8
    }}>Cycle</label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {CYCLE_OPTIONS.map((opt) => (
        <button key={opt.value} type="button" onClick={() => setCycleDuration(opt.value)}
          style={{
            padding: '12px 8px',
            borderRadius: `var(--dt-radius-md)`,
            border: `1px solid ${cycleDuration === opt.value ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
            background: cycleDuration === opt.value ? `var(--dt-accent-muted)` : `var(--dt-surface-overlay)`,
            color: cycleDuration === opt.value ? `var(--dt-accent)` : `var(--dt-text-secondary)`,
            fontWeight: 500, fontSize: `var(--dt-text-sm)`, cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  </div>

  {/* Intent summary — document/contract style */}
  <div style={{
    background: `var(--dt-surface-base)`,
    border: `1px solid var(--dt-border-strong)`,
    borderRadius: `var(--dt-radius-lg)`,
    padding: '16px 20px',
    marginBottom: 20,
    position: 'relative'
  }}>
    {/* "INTENT" stamp label */}
    <div style={{
      position: 'absolute', top: -10, left: 16,
      background: `var(--dt-accent)`, color: '#0A0804',
      fontSize: `var(--dt-text-xs)`, fontWeight: 700,
      padding: '2px 10px', borderRadius: `var(--dt-radius-full)`,
      letterSpacing: `var(--dt-tracking-widest)`, textTransform: 'uppercase'
    }}>Intent</div>
    <div style={{ marginTop: 8 }}>
      <p style={{ fontFamily: `var(--dt-font-mono)`, fontSize: `var(--dt-text-sm)`, color: `var(--dt-text-secondary)` }}>
        Contribute <span style={{ color: `var(--dt-accent)`, fontWeight: 600 }}>${amount} cUSD</span> per round
        · <span style={{ color: `var(--dt-text-primary)` }}>{CYCLE_OPTIONS.find(o => o.value === cycleDuration)?.label}</span>
        · <span style={{ color: `var(--dt-text-primary)` }}>{preferredSize} members</span>
      </p>
      <p style={{
        fontFamily: `var(--dt-font-display)`, fontSize: `var(--dt-text-xl)`,
        color: `var(--dt-text-primary)`, marginTop: 8, fontWeight: 400
      }}>
        Total payout: <span style={{ color: `var(--dt-trust-credit)` }}>${(Number(amount) * preferredSize).toFixed(0)} cUSD</span>
      </p>
    </div>
  </div>

  {/* CTA button — gold, prominent */}
  <button type="submit" disabled={isPending || isConfirming || !isConnected}
    style={{
      width: '100%', padding: '16px 24px',
      background: isPending || isConfirming ? `var(--dt-accent-muted)` : `var(--dt-accent)`,
      color: isPending || isConfirming ? `var(--dt-accent)` : '#0A0804',
      border: `1px solid var(--dt-accent)`,
      borderRadius: `var(--dt-radius-lg)`,
      fontWeight: 600, fontSize: `var(--dt-text-base)`,
      cursor: isPending || isConfirming || !isConnected ? 'not-allowed' : 'pointer',
      opacity: !isConnected ? 0.5 : 1,
      transition: 'all 0.2s ease',
      letterSpacing: `var(--dt-tracking-wide)`
    }}>
    {isPending ? "Confirm in wallet..." : isConfirming ? "Submitting intent..." : !isConnected ? "Connect wallet first" : "✦ Submit Intent"}
  </button>
</div>
```

**Success state redesign:**
```tsx
// Replace green success box with warm celebration
<div style={{
  background: `var(--dt-surface-raised)`,
  border: `1px solid var(--dt-trust-community)`,
  borderRadius: `var(--dt-radius-xl)`,
  padding: 32, textAlign: 'center',
  boxShadow: `0 0 40px rgba(34,197,94,0.1)`
}}>
  <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
  <h3 style={{
    fontFamily: `var(--dt-font-display)`, fontSize: `var(--dt-text-2xl)`,
    fontWeight: 400, color: `var(--dt-text-primary)`, marginBottom: 8
  }}>Intent Submitted</h3>
  <p style={{ color: `var(--dt-text-secondary)`, fontSize: `var(--dt-text-sm)` }}>
    The agent is searching for your circle. You'll be matched within 24 hours.
  </p>
</div>
```

---

### TICKET-IC-005: CircleDashboard — Warm Card System
**Priority:** P0 | **Est:** 1.5hr

**Current state:** Hardcoded `#23242A` background via inline style. Cold. Progress bar is raw Celo green. "Claim Payout" button is barely visible.

**Desired state:** Warm obsidian cards with glass elevation on active circles. Progress as a warm gradient. "Claim Payout" gets the gold treatment — it's the most joyful action in the app.

**Changes — `CircleDashboard.tsx`:**

```tsx
function CircleCard({ circle }: { circle: MockCircle }) {
  const progress = (circle.currentRound / circle.totalRounds) * 100;
  const isActive = circle.yourTurn;

  return (
    <div style={{
      background: isActive ? 'rgba(14,11,7,0.85)' : `var(--dt-surface-raised)`,
      backdropFilter: isActive ? 'blur(24px) saturate(180%)' : 'none',
      border: `1px solid ${isActive ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
      borderRadius: `var(--dt-radius-xl)`,
      padding: '20px',
      boxShadow: isActive ? `var(--dt-shadow-glow-gold)` : `var(--dt-shadow-sm)`,
      transition: 'all 0.3s ease',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Paper noise on card */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.08, mixBlendMode: 'screen'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{
            fontFamily: `var(--dt-font-display)`,
            fontSize: `var(--dt-text-xl)`, fontWeight: 400,
            color: `var(--dt-text-primary)`
          }}>Circle #{circle.id}</h3>
          <p style={{ color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-xs)`, marginTop: 2 }}>
            {circle.members}/{circle.maxMembers} members · {circle.cycle}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontFamily: `var(--dt-font-mono)`,
            color: `var(--dt-trust-community)`, fontWeight: 600,
            fontSize: `var(--dt-text-sm)`
          }}>+{circle.yieldEarned} cUSD</span>
          <p style={{ color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-xs)` }}>yield</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: 6, borderRadius: `var(--dt-radius-full)`,
        background: `var(--dt-surface-overlay)`, marginBottom: 8, overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`, height: '100%', borderRadius: 'inherit',
          background: `linear-gradient(90deg, var(--dt-trust-reliability) 0%, var(--dt-trust-community) 100%)`,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>
      <p style={{ color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-xs)`, marginBottom: 16 }}>
        Round {circle.currentRound} of {circle.totalRounds} · {circle.contribution} cUSD/cycle
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!circle.contributed && (
          <button style={{
            flex: 1, padding: '12px 16px', borderRadius: `var(--dt-radius-lg)`,
            background: `var(--dt-trust-community)`, color: '#0A0804',
            fontWeight: 600, fontSize: `var(--dt-text-sm)`, border: 'none', cursor: 'pointer'
          }}>
            Contribute ${circle.contribution}
          </button>
        )}
        {circle.yourTurn && (
          <button style={{
            flex: 1, padding: '12px 16px', borderRadius: `var(--dt-radius-lg)`,
            background: `var(--dt-accent)`, color: '#0A0804',
            fontWeight: 700, fontSize: `var(--dt-text-sm)`, border: 'none', cursor: 'pointer',
            boxShadow: `var(--dt-shadow-glow-gold)`,
            letterSpacing: `var(--dt-tracking-wide)`
          }}>
            ✦ Claim Payout
          </button>
        )}
        {circle.contributed && !circle.yourTurn && (
          <div style={{
            flex: 1, textAlign: 'center', padding: '12px',
            color: `var(--dt-trust-community)`, fontSize: `var(--dt-text-sm)`,
            fontFamily: `var(--dt-font-mono)`
          }}>
            ✓ Contributed · Waiting
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### TICKET-IC-006: TrustPanel — Three-Dimension Trust Visualization
**Priority:** P0 | **Est:** 2hr

This is the most important design work in the whole app. Trust is the product.

**Current state:** Single score badge with traffic-light color. No dimension breakdown. No context for what the score means. Vouch form is clinical.

**Desired state:** Three-dimension visual breakdown. Each dimension has its own color bar and label. Score is large and prominent with Cormorant Garamond. Vouch form feels like making a personal endorsement.

**New trust score display:**

```tsx
// Replace the score card entirely
<div style={{
  background: `var(--dt-surface-raised)`,
  border: `1px solid var(--dt-border-default)`,
  borderRadius: `var(--dt-radius-xl)`,
  padding: '24px',
  boxShadow: `var(--dt-shadow-md)`
}}>
  <p style={{
    fontSize: `var(--dt-text-xs)`, fontWeight: 500, letterSpacing: `var(--dt-tracking-widest)`,
    textTransform: 'uppercase', color: `var(--dt-text-muted)`, marginBottom: 8
  }}>Trust Score</p>
  
  {/* Large score display */}
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
    <span style={{
      fontFamily: `var(--dt-font-display)`,
      fontSize: `var(--dt-text-4xl)`, fontWeight: 400,
      color: score >= 80 ? `var(--dt-trust-community)` : score >= 50 ? `var(--dt-trust-credit)` : '#EF4444'
    }}>{score}</span>
    <span style={{ color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-xl)`, fontFamily: `var(--dt-font-mono)` }}>/ 100</span>
  </div>

  {/* Three dimension bars */}
  {[
    { label: 'Reliability', color: `var(--dt-trust-reliability)`, value: Math.min(score * 0.9 + 5, 100), desc: 'On-time payments' },
    { label: 'Credit', color: `var(--dt-trust-credit)`, value: Math.max(score * 0.7, 0), desc: 'Borrowing history' },
    { label: 'Community', color: `var(--dt-trust-community)`, value: Math.min(score * 1.1, 100), desc: 'Circle connections' },
  ].map((dim) => (
    <div key={dim.label} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: `var(--dt-text-xs)`, color: `var(--dt-text-secondary)`, fontWeight: 500 }}>
          {dim.label}
        </span>
        <span style={{ fontSize: `var(--dt-text-xs)`, fontFamily: `var(--dt-font-mono)`, color: dim.color }}>
          {Math.round(dim.value)}
        </span>
      </div>
      <div style={{
        width: '100%', height: 4, borderRadius: `var(--dt-radius-full)`,
        background: `var(--dt-surface-overlay)`, overflow: 'hidden'
      }}>
        <div style={{
          width: `${dim.value}%`, height: '100%', borderRadius: 'inherit',
          background: dim.color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)'
        }} />
      </div>
      <p style={{ fontSize: `var(--dt-text-xs)`, color: `var(--dt-text-muted)`, marginTop: 2 }}>{dim.desc}</p>
    </div>
  ))}

  {/* Score context */}
  <div style={{
    marginTop: 16, padding: '12px 16px',
    background: `var(--dt-surface-overlay)`,
    borderRadius: `var(--dt-radius-md)`,
    border: `1px solid var(--dt-border-subtle)`
  }}>
    <p style={{ fontSize: `var(--dt-text-xs)`, color: `var(--dt-text-muted)` }}>
      Score {score}: qualifies for circles up to{' '}
      <span style={{ color: `var(--dt-accent)`, fontFamily: `var(--dt-font-mono)` }}>
        ${score >= 80 ? '100' : score >= 50 ? '50' : '20'} cUSD/cycle
      </span>
    </p>
  </div>
</div>
```

**Vouch form redesign:**

```tsx
<div style={{
  background: `var(--dt-surface-raised)`,
  border: `1px solid var(--dt-border-default)`,
  borderRadius: `var(--dt-radius-xl)`, padding: 24
}}>
  <h3 style={{
    fontFamily: `var(--dt-font-display)`, fontSize: `var(--dt-text-xl)`,
    fontWeight: 400, color: `var(--dt-text-primary)`, marginBottom: 4
  }}>Vouch for Someone</h3>
  <p style={{ color: `var(--dt-text-muted)`, fontSize: `var(--dt-text-sm)`, marginBottom: 20 }}>
    Your endorsement raises their score and opens circles to them.
  </p>
  
  {/* Input — mono, prominent */}
  <input type="text" value={vouchAddress}
    onChange={(e) => setVouchAddress(e.target.value)}
    placeholder="0x..."
    style={{
      width: '100%', padding: '14px 16px',
      background: `var(--dt-surface-overlay)`,
      border: `1px solid var(--dt-border-default)`,
      borderRadius: `var(--dt-radius-lg)`, color: `var(--dt-text-primary)`,
      fontFamily: `var(--dt-font-mono)`, fontSize: `var(--dt-text-sm)`,
      outline: 'none', boxSizing: 'border-box', marginBottom: 16
    }} />

  {/* Duration slider */}
  <label style={{
    display: 'block', fontSize: `var(--dt-text-xs)`, fontWeight: 500,
    color: `var(--dt-text-muted)`, letterSpacing: `var(--dt-tracking-widest)`,
    textTransform: 'uppercase', marginBottom: 8
  }}>
    Duration: <span style={{ color: `var(--dt-accent)`, fontFamily: `var(--dt-font-mono)` }}>{vouchMonths} months</span>
  </label>
  <input type="range" min={1} max={24} value={vouchMonths}
    onChange={(e) => setVouchMonths(Number(e.target.value))}
    style={{ width: '100%', accentColor: `var(--dt-accent)`, marginBottom: 16 }} />

  <button type="submit" disabled={isPending || isConfirming}
    style={{
      width: '100%', padding: '14px',
      background: `var(--dt-surface-overlay)`,
      border: `1px solid var(--dt-border-strong)`,
      borderRadius: `var(--dt-radius-lg)`,
      color: `var(--dt-text-primary)`,
      fontWeight: 500, fontSize: `var(--dt-text-sm)`,
      cursor: isPending ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease'
    }}>
    {isPending || isConfirming ? "Submitting..." : "Give Vouch"}
  </button>
</div>
```

---

### TICKET-IC-007: Testnet Banner Redesign
**Priority:** P1 | **Est:** 15min

**Current state:** `bg-amber-50 border-amber-200` — clashes with dark theme, takes vertical space.

**Desired state:** Inline, minimal, uses ROSA tokens.

```tsx
<div style={{
  background: 'rgba(245,158,11,0.08)',
  border: `1px solid rgba(245,158,11,0.2)`,
  borderRadius: `var(--dt-radius-md)`,
  padding: '8px 16px',
  marginBottom: 20,
  fontSize: `var(--dt-text-xs)`,
  color: '#F59E0B',
  display: 'flex', alignItems: 'center', gap: 8
}}>
  <span>◆</span>
  <span><strong>Alfajores testnet</strong> — no real funds</span>
</div>
```

---

### TICKET-IC-008: Empty States Redesign
**Priority:** P1 | **Est:** 30min

The "Connect wallet" empty state in the Intent tab has a centered giant emoji layout that wastes space on mobile. Replace with a more intentional onboarding prompt.

**CircleDashboard empty state** uses `border-dashed border-gray-700` which is barely visible on dark background — needs `var(--dt-border-default)` and warm text.

---

## 3. rosa-tokens.css

See `frontend/src/styles/rosa-tokens.css` — delivered as a separate file.

This file contains the complete token system including:
- All CSS custom properties from ROSA design system
- Glass morphism utilities (`.dt-glass-l1`, `.dt-glass-l2`)
- Warm shadow system (brown-tinted, not gray)
- Paper noise texture as a reusable class
- Typography scale and font families
- Trust dimension colors
- Animation tokens (spring-based)
- Utility classes for common patterns

---

## 4. Priority-Ordered Implementation Plan

### P0 — Must have for demo (visual identity, first impression)
*Estimated total: 6-8 hours*

| # | Ticket | Impact | Time |
|---|--------|--------|------|
| 1 | Import rosa-tokens.css + fix index.css | Foundational — nothing else works without this | 30min |
| 2 | IC-001: Global theme unification (bg, text, borders) | Eliminates the white-cards-on-dark-bg disaster | 45min |
| 3 | IC-002: Header + bottom navigation | First impression, MiniPay thumb zone | 1.5hr |
| 4 | IC-004: IntentForm redesign | Hero interaction — the "make a wish" moment | 2hr |
| 5 | IC-005: CircleDashboard cards | Dark + warm, "Claim Payout" gold button | 1.5hr |
| 6 | IC-006: TrustPanel three-dimension visualization | Core concept demonstration | 2hr |
| 7 | Add Google Fonts to index.html | Typography foundation | 5min |

### P1 — Should have (interaction quality, delight)
*Estimated total: 2-3 hours*

| # | Ticket | Impact | Time |
|---|--------|--------|------|
| 8 | IC-003: ConnectButton + WalletStatus | Wallet UX polish | 30min |
| 9 | IC-007: Testnet banner | Remove visual clutter | 15min |
| 10 | Card hover states (translateY -2px, warm shadow) | Tactile feedback | 45min |
| 11 | Intent success animation (✨ + glow fade-in) | Emotional payoff | 30min |
| 12 | Range slider custom styling (gold thumb) | Cohesion | 30min |
| 13 | Focus rings (gold, not emerald) | Accessibility + brand | 20min |

### P2 — Nice to have (polish, edge cases)
*Estimated total: 3-4 hours*

| # | Ticket | Impact | Time |
|---|--------|--------|------|
| 14 | IC-008: Empty state redesign | Onboarding quality | 30min |
| 15 | Paper noise on all cards (::before pseudo) | Warmth and craft | 45min |
| 16 | Tab label animation on active state | Micro-delight | 30min |
| 17 | Trust score animated counter (count up on load) | Drama on trust tab | 45min |
| 18 | Circle card progress bar animation on mount | Lifecycle feel | 30min |
| 19 | Loading skeleton states | Production quality | 1hr |
| 20 | Error state styling (IC contract errors) | Edge case handling | 30min |

---

## Demo Video Script (What to Show)

For the hackathon demo video, show these moments in order:

1. **App opens** → warm obsidian background loads, Cormorant Garamond "IntentCircles" in header. First frame communicates "premium, trustworthy." (5 seconds)

2. **Intent tab** → camera close on the form. Tap "Monthly", drag the circle size slider, watch the intent summary update in real-time. The "Intent" badge and the gold total payout amount are the money shot. (15 seconds)

3. **Submit Intent** → tap the gold "✦ Submit Intent" button, wallet confirmation dialog, success state with ✨ animation. (10 seconds)

4. **Switch to My Circles** → show Circle #2 with the gold glowing "✦ Claim Payout" button. That gold glow on dark background is the frame that wins hackathons. Tap it, show tx flow. (10 seconds)

5. **Switch to Trust Network** → show the three-dimension trust breakdown bars animating into view (blue/gold/green). Explain "reliability, credit, community — three dimensions, not one number." (15 seconds)

**Total demo:** ~55 seconds. Keep it under 60.

---

## Notes on African Context

The 12.6M MiniPay users in Nigeria, Kenya, and Ghana who are the actual target audience deserve specific design consideration:

1. **Data-light UX**: MiniPay users are often on 3G/limited data. Avoid large image assets. SVG icons, CSS patterns, web fonts from Google CDN (cached) are acceptable.

2. **Currency clarity**: `cUSD` is unfamiliar. "1 cUSD ≈ 1 US Dollar" should appear somewhere contextual — not a disclaimer, woven into the UI.

3. **Trust is social, not algorithmic**: In Yoruba, Igbo, Kikuyu contexts, "trust" implies community endorsement — not a score. The vouch mechanism is culturally resonant. Design the vouch flow to feel like a personal endorsement, not a form submission.

4. **Circles have names**: Real ajo/esusu/chama groups have names — "Mama G's Circle," "Lagos Tech Women." The `Circle #1` naming is a prototype artifact. The design should suggest that circles have identities.

5. **The payout moment is JOYFUL**: In real savings circles, payout day is a celebration. The "Claim Payout" flow should have genuine emotional weight — not a transaction confirmation dialog. This is worth P0 treatment.

---

*Emory out. Build the thing that wins the room.*
