# IntentCircles — Variant.com Design Prompts

> 10 screens covering the full user flow. Paste each prompt into Variant's input field.
> **Foundation: LUMO STUDIOS editorial style** — warm cream/peach backgrounds, bold serif headlines (all-caps), editorial grid layout, clean form fields, magazine-like hierarchy.
> Design tokens: #FAFAF8 warm off-white, #D4AF37 gold accent, Instrument Serif headlines, Manrope body, JetBrains Mono data.

## Existing Variant Projects → Screen Mapping
| Existing Project | Maps To |
|---|---|
| Savings Circle Onboarding | Screen 1 (Landing) |
| Savings Circle Dashboard | Screen 3 (Dashboard) |
| Agent Powered Rosca | Screens 2/4/5 (Chat, Detail, Confirmation) |
| Fintech Agent Reputation | Screen 9 (ERC-8004 Profile) |
| Strong Design Variations | Screen 10 (Payout) |
| Agent Fleet Dashboard | Screen 7 (Activity Feed) |
| Mission Control Dashboard | Screen 7 alternate |

**Priority prompts** — screens NOT yet covered by existing projects:
- Screen 6 (Trust Network) — new
- Screen 8 (Privacy/Nightfall) — new
- Screen 2 (Agent Chat) — refine with LUMO style
- Screen 10 (Payout Celebration) — refine

---

## Screen 1: Onboarding / Landing

**Variant Prompt:**

Mobile-first landing screen for IntentCircles savings app, LUMO STUDIOS editorial style. Warm cream background (#FAFAF8). Bold all-caps serif headline: "THE ART OF SAVING TOGETHER" in Instrument Serif, large and editorial like a magazine cover. Below: smaller sans-serif subtitle in Manrope: "Your AI agent coordinates community savings circles on Celo."

Editorial grid layout with three sections stacked: 1) "AI-POWERED" — agent handles matching and payouts, 2) "COMMUNITY-DRIVEN" — save with people you trust, 3) "TRANSPARENT" — every transaction on-chain. Each has a section number (01, 02, 03) and 2-line copy.

Category markers in small caps at the top: "INTENTCIRCLES · SAVINGS · COORDINATION". Large CTA button "START SAVING" with gold accent background (#D4AF37), dark text. Secondary: "LEARN MORE" with gold border.

Footer: "Powered by Celo" small text. Mobile viewport 390px wide. Editorial fintech feel — like a design studio portfolio that happens to be a savings app. Generous whitespace, bold typography hierarchy.

**Key Elements:**
- Clear value prop hierarchy (AI first, then community, then trust)
- Icon + text cards that can shuffle in different arrangements
- CTA prominence — button should feel clickable and rewarding
- Spacing consistency — generous whitespace between sections
- Typography contrast between serif headlines and sans-serif body

---

## Screen 2: Agent Chat (Main Interaction)

**Variant Prompt:**

Conversational chat interface for AI savings agent. Mobile-first, 390px. LUMO STUDIOS editorial style — warm cream background, bold serif section headers.

Top: "AGENT" category marker in small caps, then editorial headline "Your Savings Advisor" in Instrument Serif.

Chat area: User message bubble (warm dark card): "I want to save 50 cUSD monthly for 6 months." Agent response below in light editorial card with gold left border: Section header "INTENT PARSED ✓" in small caps. Data block in JetBrains Mono: "50 cUSD/month · 6 months · Total: 300 cUSD · Confidence: 98%". Reasoning in Manrope: "You'll rotate payout every 2 months. Current circle matches."

Below agent card: "SUBMIT INTENT" button (gold #D4AF37 background, dark text, editorial caps). Secondary: "REFINE" in gold outline.

Bottom: Input field with placeholder "Tell me your savings goal..." Clean, magazine-style chat — not a generic chatbot UI. Generous whitespace between messages.

**Key Elements:**
- Bubble layout clarity (user vs agent differentiation)
- Parsed intent display prominence — users need to see confidence/reasoning
- Button timing — "Submit" only appears when intent is valid
- Monospace font for data fields adds fintech credibility
- Conversational tone in agent copy (not corporate)

---

## Screen 3: Circle Dashboard

**Variant Prompt:**

Dashboard showing 2–3 active savings circles. Mobile-first, 390px.

Header: "Your Circles" in Instrument Serif. Below: stacked circle cards, each showing:
- Circle name (bold, left-aligned): "Home Renovation Circle"
- 4 member avatars (colored circles with initials), right-aligned
- "4 members saving" small text below avatars
- Progress bar: "Target: $800 / Saved: $520" with filled percentage (gold accent #D4AF37 for filled)
- "Next payout: Sarah, 18 days"
- Bottom-right: Your contribution status (checkmark "✓ Paid this month" or pending dot)

Cards have subtle border, generous padding. Warm off-white background. Tap to expand detail.

Bottom: "Start a Circle" button with gold background, full-width or contained.

**Key Elements:**
- Card scanability — member count and progress visible at a glance
- Avatar pattern (initials + colors) that's repeatable
- Progress visualization — bar vs pie vs ring (iterate on visual metaphor)
- Trust signals (member count, contribution status)
- Payout recipient name humanizes the next step

---

## Screen 4: Circle Detail

**Variant Prompt:**

Deep view into a single circle. Mobile-first, 390px.

Top: Circle header "Home Renovation Circle" with 4 member avatars and count.

Three sections below:
1. **Members** list with trust scores. Each row: avatar, name, trust score (0–100, displayed as gold progress circle), status icon (verified checkmark or warning).
2. **Rotation Schedule** timeline showing months 1–6. Current month highlighted. Shows who pays/receives each month. Example: "Month 2: Sarah receives $200"
3. **Your Contribution** card showing: $50 paid this month, next payment date, "Contribute Now" gold button.

All text in Manrope, headers in Instrument Serif. Gold accents for trust scores and CTAs. Subtle dividers between sections. Plenty of whitespace.

**Key Elements:**
- Trust score visualization (circle or bar?)
- Rotation timeline clarity — must show who's next without confusion
- Contribution CTA prominence
- Member list should iterate on trust signal display (verified badge, warning icon, etc.)
- Vertical scrolling works well for stacked sections

---

## Screen 5: Intent Submission Confirmation

**Variant Prompt:**

Confirmation screen after user submits an intent via chat. Mobile-first, 390px.

Large success checkmark icon (gold accent color) centered at top.

Below: Confirmation card with:
- "Intent Submitted" headline in Instrument Serif
- Intent summary in readable format: "Type: CONTRIBUTE | Circle: Home Reno | Amount: $50 cUSD | Frequency: Monthly, 6x"
- On-chain transaction status line: "Tx Status: Pending → Confirming" with small spinner icon
- Agent activity indicator: "AI Agent confirming with circle members..." with loading animation
- Timestamp: "Submitted 2:34 PM"

Below card: "View Circle" button (secondary style) and "Done" button (gold CTA).

Reassuring tone. Show the on-chain work happening in real-time. Warm off-white background, clean borders, generous padding.

**Key Elements:**
- Success state clarity (checkmark, green accent optional)
- Transaction status visibility (pending/confirming/confirmed states to iterate)
- Agent activity narrative (users want to know the AI is working)
- Data display in Manrope + JetBrains Mono for amounts
- Reassurance copy: "Members are being notified"

---

## Screen 6: Trust Network Visualization

**Variant Prompt:**

Trust network showing your connections. Mobile-first, 390px. Two viewing options to toggle:

**Option A: Graph view** — Simplified network. You (center node, gold accent). Connections radiating outward. Nodes sized by trust score. Lines to people who trust you (inbound) vs. you trust (outbound) in different colors (gold vs. silver?).

**Option B: List view** (primary for mobile) —
- "People who trust you" section: list of names, trust scores (0–100 shown as progress bar), "Add to circle" button
- "You trust" section: similar layout
- "Add Trust" CTA at bottom

Toggle between views in top-right. Trust scores displayed as gold progress circles. Names + avatars. One-sentence trust reason (optional): "Paid on time 12 months"

Warm off-white background, clean borders. Manrope + Instrument Serif.

**Key Elements:**
- Graph vs. list iteration — which is more usable on mobile?
- Trust score visualization (progress circle, bar, percentage?)
- Inbound vs. outbound distinction clarity
- "Add trust" flow — does it appear inline or in a modal?
- Trust reason copy adds humanity

---

## Screen 7: Activity Feed

**Variant Prompt:**

Real-time activity feed showing agent work. Mobile-first, 390px. Infinite scroll.

Activity items stacked vertically, each showing:
- Timestamp (right-aligned, small, Manrope): "2 hours ago"
- Icon (left, ~24px): agent, checkmark, person, clock
- Activity line (Manrope, bold): "Intent matched: Sarah & $50 contribution"
- Description (Manrope, lighter): "Sarah was matched to Home Renovation Circle"
- Status badge (gold accent): "Confirmed" or "Pending" or "Processing"

Sample activities:
- "Agent matched 2 intents: Sarah ($50) + David ($50)" ✓ Confirmed
- "Payout processed: Alex received $400" ✓ Confirmed
- "Rotation executed: Month 4 begins" ✓ Confirmed
- "Contribution received: You → Home Reno Circle" ✓ Confirmed

No busy work — only meaningful events. Badges use gold accent for confirmed, muted gray for pending.

**Key Elements:**
- Status badge prominence and color coding
- Timestamp clarity (relative times: "2 hours ago" vs absolute)
- Icon set consistency (agent activities should have unique icons)
- Scroll performance (infinite list?)
- Narrative clarity — activities should read like a story, not logs

---

## Screen 8: Privacy Mode (Nightfall)

**Variant Prompt:**

Privacy settings screen. Mobile-first, 390px.

Header: "Privacy & Security" in Instrument Serif.

Toggle card: Large toggle switch (off by default, gold when on). Copy: "Use Nightfall Privacy Mode" with explanation below: "Contributions stay private until rotation. Only you & the AI know your amount until payout."

Below toggle (when ON), two states display:

**Private (Commit-Reveal) Explanation:**
- Step 1: "You commit your contribution amount (hidden from circle)"
- Step 2: "All members commit"
- Step 3: "Amounts reveal only during rotation"
- Shield icon above steps, gold accent

**Public Mode (default):**
- Simple text: "All members see contribution amounts and schedule"

Bottom: "Learn more" link to privacy docs.

Warm off-white background, generous spacing. Use JetBrains Mono for technical terms (commit, reveal).

**Key Elements:**
- Toggle prominence and clear on/off states
- Commit-reveal explanation clarity (visual steps?)
- Shield icon as trust signal
- Technical terms explained in plain language
- Link to docs for users who want details

---

## Screen 9: Agent Profile / Identity (ERC-8004)

**Variant Prompt:**

AI agent profile screen showing on-chain identity. Mobile-first, 390px.

Top: Large agent avatar (stylized, not AI-looking — think friendly icon) with NFT-style gold border (#D4AF37).

Below:
- Agent name: "IntentCircles Guardian" (Instrument Serif, bold)
- Verified badge: Gold checkmark + "Verified ERC-8004"
- Reputation tags (inline, pill-shaped, warm gold background): "⭐ 500+ Matches", "✓ 99% Success Rate", "⚡ <5s Response Time", "📊 $50k+ Coordinated"
- Fee: "0.01 cUSD per transaction" (transparent, Manrope)

Mid-section: Brief bio: "I help groups coordinate fair, transparent savings. Powered by Celo blockchain."

Bottom: Two cards:
- "Total Matches: 847" (Manrope, JetBrains Mono for number)
- "Success Rate: 99.2%" (similar format)

CTA: "Learn More About IntentCircles" (secondary button)

Clean, trustworthy. Not crypto-bro. Reputation tags should be scannable.

**Key Elements:**
- Avatar design that feels agent-like but approachable (not a robot)
- Verified badge prominence — users need to trust this is real
- Reputation tags should iterate on tone (confident, not boastful)
- Fee transparency builds trust
- Numbers in Monospace add credibility
- Bio copy should humanize the agent

---

## Screen 10: Payout Celebration

**Variant Prompt:**

Celebration screen when it's your turn to receive payout. Mobile-first, 390px.

Large confetti/celebration effect at top (subtle, fintech-appropriate — not cartoonish). Gold accents.

Massive headline (Instrument Serif, extra bold): "It's Your Turn!"
Subheadline: "You're receiving your payout!"

Large payout amount displayed prominently (gold accent, JetBrains Mono): "$500 cUSD"

Explanation card: "From Home Renovation Circle. 5 members contributed. You saved $0 this month with this payout."

Below:
- "Send to wallet" button (gold CTA, full-width)
- "Share with circle" button (secondary, gold text)
- "Celebrate" button (fun, maybe animated — share celebration on social?)

Footer: Warm copy: "Congrats on sticking with your circle!"

Warm off-white background, generous padding. Celebratory but not over-the-top. Feel like Wise when you've hit a savings milestone.

**Key Elements:**
- Celebration effect — confetti iterations (animate or static?)
- Payout amount prominence — this is the reward
- Wallet integration hint ("Send to wallet" suggests next step)
- Social sharing option — let users celebrate publicly
- Tone should feel rewarding but tasteful
