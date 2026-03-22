# ROSA Frontend Redesign — Variant Design Implementation

## Design Source
- **Chat 1:** `variant.com/chat/748d24d5-a66b-44d1-a848-8f7aa2e99076` — Agent-Powered ROSCA mobile app
- **Chat 2:** `variant.com/chat/cc4a7470-9b10-4830-967b-91c87be5edb9` — Financial transaction chat interface

## Design Language (from Variant)
- **Typography:** Elegant serif/sans combo (serif for headings, sans for body)
- **Palette:** Warm cream (#F5F0E8) + deep brown (#2D2520) + rust accent (#C75B39) + olive green (#6B7D5E)
- **Style:** Clean card-based layouts, scalloped receipt edges, monospaced data fields
- **Vibe:** "Post Post" warm obsidian — matches Emory's existing direction

## Priority Screens to Implement (3 screens, ~26h to deadline)

### Screen 1: Financial Dashboard (from Chat 2, Screen 4)
- **Component:** `CircleDashboard.tsx` (refactor existing 323 lines)
- **Elements:**
  - Large balance display: "$2,440.12" style
  - APY indicator: "+2.8% APY • Staked in Pool"
  - Deposit / Withdraw buttons
  - Recent Activity feed with color-coded entries
  - Bottom nav: WALLET | CIRCLES | PAGES | SHARED

### Screen 2: Transaction Receipt (from Chat 2, Screen 5)
- **Component:** NEW `TransactionReceipt.tsx`
- **Elements:**
  - Scalloped/perforated receipt card
  - "✓ FINALIZED" badge
  - Amount: "500.00 USDC → Endorsed to Threshold"
  - Date, From (truncated address), Circle ID
  - Network Fee, Hash (truncated)
  - "SHARE RECEIPT" + "VIEW ON EXPLORER" buttons

### Screen 3: Configure Flows / Onboarding (from Chat 2, Screen 6)
- **Component:** Refactor `IntentForm.tsx` (existing 579 lines)
- **Elements:**
  - Conversational style: "How shall the circle manage its common wealth and spending limits?"
  - Financial Policy cards:
    - Primary Thresholds (Daily Limit, Multi-sig threshold)
    - Asset Allocation (Stable/Reserve split)
    - "UPDATE POLICY" button
  - Elegant serif headings

## Design Tokens to Update
- Align `rosa-tokens.css` with Variant palette
- Key changes:
  - `--surface-primary`: warm cream (#F5F0E8)
  - `--text-primary`: deep brown (#2D2520)  
  - `--accent-primary`: rust (#C75B39)
  - `--accent-secondary`: olive (#6B7D5E)
  - Keep Celo green (#35D07F) for trust/community indicators

## What NOT to Touch
- Contract integration logic
- wagmi hooks / wallet connection
- Agent communication layer
- Build pipeline

## Acceptance Criteria
- `bun run dev` starts without errors
- All 3 screens render with Variant design language
- Design tokens updated in rosa-tokens.css
- Mobile-responsive (MiniPay compatible)
- Committed + pushed to nkyimu/rosa
