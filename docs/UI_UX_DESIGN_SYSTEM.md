# TradeMind AI — UI/UX Design System & Premium Aesthetic Guide v1.0

## 1. Brand Identity & Visual Philosophy

### 1.1 Core Brand Essence

| Attribute | Expression |
|---|---|
| **Positioning** | India's most intelligent AI-powered trading research platform |
| **Personality** | Precise, authoritative, futuristic yet trustworthy |
| **Emotional Goal** | Empower retail traders with institutional-grade AI clarity |
| **Visual Metaphor** | "The control tower of your financial future" — omniscient, clean, data-rich |

### 1.2 Design Principles

| Principle | Rule | Example |
|---|---|---|
| **Precision** | Every pixel serves a purpose. No decorative noise. | Grid-aligned charts, exact ₹ formatting, consistent spacing |
| **Depth** | Layered interfaces with light, shadow, and translucency create spatial hierarchy. | Glass cards over gradient backgrounds, floating toolbars |
| **Signal over Noise** | Color is reserved for data meaning. UI chrome is neutral. | Red/green only for P&L; purple only for AI; rest is monochrome |
| **Motion with Intent** | Animations convey state change, never decoration. | Price ticks flash; agent pipeline flows; skeletons shimmer |
| **Trust through Transparency** | Explainability is visual. Every AI action is inspectable. | Agent reasoning panels, confidence meters, audit trails |

---

## 2. Premium Aesthetic Language

### 2.1 Glassmorphism (Primary Surface Treatment)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

**Usage:**
- Primary cards and panels
- Modal overlays
- Floating action bars
- Agent reasoning popovers

**Light mode variant:**
```css
.glass-card-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
```

### 2.2 Gradient System

| Gradient | CSS | Usage |
|---|---|---|
| **Hero Background** | `linear-gradient(135deg, #0a0a1a 0%, #1a103c 50%, #0f1a2e 100%)` | Landing page, auth backgrounds |
| **AI Aura** | `radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)` | Agent activity zones, AI feature highlights |
| **Success Glow** | `radial-gradient(circle at center, rgba(34, 197, 94, 0.12) 0%, transparent 60%)` | Profit zones, buy signals |
| **Danger Glow** | `radial-gradient(circle at center, rgba(239, 68, 68, 0.12) 0%, transparent 60%)` | Loss zones, sell signals |
| **Dashboard Depth** | `linear-gradient(180deg, #0f0f0f 0%, #0a0a14 100%)` | Dashboard page background |
| **Card Highlight** | `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)` | Hover/active card overlays |

### 2.3 Lighting & Depth

```
Elevation Hierarchy:

Level 0: Page background (#0F0F0F)
  → no shadow

Level 1: Subtle cards
  → box-shadow: 0 1px 3px rgba(0,0,0,0.3)

Level 2: Standard cards (glass)
  → box-shadow: 0 4px 24px rgba(0,0,0,0.2)

Level 3: Elevated cards (hover state)
  → box-shadow: 0 8px 32px rgba(0,0,0,0.3)
  → transform: translateY(-2px)

Level 4: Modals, drawers
  → box-shadow: 0 24px 48px rgba(0,0,0,0.4)
  → overlay: rgba(0,0,0,0.6) backdrop-blur

Level 5: Toasts, tooltips
  → box-shadow: 0 12px 24px rgba(0,0,0,0.5)
```

### 2.4 Border Treatment

| Type | Style | Usage |
|---|---|---|
| **Subtle** | `1px solid rgba(255,255,255,0.06)` | Inactive cards, dividers |
| **Glass** | `1px solid rgba(255,255,255,0.08)` | Standard glass cards |
| **Accent** | `1px solid rgba(139,92,246,0.3)` | AI-related cards, agent panels |
| **Signal** | `1px solid rgba(34,197,94,0.4)` | Buy/approved signals |
| **Warning** | `1px solid rgba(245,158,11,0.4)` | Pending, hold signals |
| **Focus** | `2px solid rgba(59,130,246,0.6)` | Keyboard-focused elements |

---

## 3. Color System (Extended)

### 3.1 Semantic Color Map

| Semantic | Light Mode | Dark Mode | Role |
|---|---|---|---|
| **Background** | `#F5F5F7` | `#0A0A0F` | Page canvas |
| **Surface** | `#FFFFFF` | `#12121A` | Cards, panels |
| **Surface Elevated** | `#FFFFFF` | `#1A1A2E` | Modals, dropdowns |
| **Surface Highlight** | `#F0F0F5` | `#252538` | Hover states |
| **Border** | `#E5E5EB` | `#2A2A3E` | Dividers, card borders |
| **Border Strong** | `#D1D1DB` | `#3A3A50` | Focus rings |
| **Text Primary** | `#0F0F1A` | `#F0F0F5` | Headings |
| **Text Secondary** | `#5A5A6E` | `#9CA3AF` | Descriptions |
| **Text Muted** | `#8A8A9E` | `#6B7280` | Timestamps, captions |
| **Text Inverse** | `#FFFFFF` | `#0A0A0F` | On colored backgrounds |
| **Buy** | `#059669` | `#22C55E` | Bullish, gains, buy |
| **Buy Glow** | `rgba(5,150,105,0.2)` | `rgba(34,197,94,0.2)` | Buy hover glow |
| **Sell** | `#DC2626` | `#EF4444` | Bearish, losses, sell |
| **Sell Glow** | `rgba(220,38,38,0.2)` | `rgba(239,68,68,0.2)` | Sell hover glow |
| **Hold/Warning** | `#D97706` | `#F59E0B` | Hold, caution |
| **Info** | `#2563EB` | `#60A5FA` | Links, highlights |
| **AI Purple** | `#7C3AED` | `#A78BFA` | AI features, agents |
| **AI Purple Glow** | `rgba(124,58,237,0.15)` | `rgba(167,139,250,0.15)` | Agent aura |

### 3.2 Data Visualization Colors

| Chart Element | Color | Hex |
|---|---|---|
| **Candle Bullish** | Green | `#22C55E` |
| **Candle Bearish** | Red | `#EF4444` |
| **Volume** | Blue-gray | `#3B82F6` |
| **MA 20** | Yellow | `#FBBF24` |
| **MA 50** | Cyan | `#22D3EE` |
| **MA 200** | Purple | `#A78BFA` |
| **Bollinger Bands** | Gray | `#6B7280` |
| **Support Line** | Green dashed | `#22C55E` |
| **Resistance Line** | Red dashed | `#EF4444` |
| **Buy Signal Marker** | Green dot + glow | `#22C55E` |
| **Sell Signal Marker** | Red dot + glow | `#EF4444` |
| **Portfolio Equity** | Purple | `#A78BFA` |
| **Benchmark (Nifty 50)** | Gray dashed | `#6B7280` |

### 3.3 Agent Color Coding

| Agent | Primary | Glow | Icon |
|---|---|---|---|
| **Fundamental Analyst** | `#3B82F6` | `rgba(59,130,246,0.15)` | Building / ChartBar |
| **Technical Analyst** | `#06B6D4` | `rgba(6,182,212,0.15)` | Activity / TrendingUp |
| **Sentiment Analyst** | `#8B5CF6` | `rgba(139,92,246,0.15)` | MessageCircle / Users |
| **News Analyst** | `#F59E0B` | `rgba(245,158,11,0.15)` | Newspaper / Radio |
| **Bull Researcher** | `#22C55E` | `rgba(34,197,94,0.15)` | TrendingUp |
| **Bear Researcher** | `#EF4444` | `rgba(239,68,68,0.15)` | TrendingDown |
| **Risk Manager** | `#EC4899` | `rgba(236,72,153,0.15)` | Shield / AlertTriangle |
| **Trader Agent** | `#A78BFA` | `rgba(167,139,250,0.15)` | Zap / Bot |

---

## 4. Typography System

### 4.1 Font Stack

| Role | Font | Weights | Fallback |
|---|---|---|---|
| **Display / Headings** | `Plus Jakarta Sans` | 600, 700, 800 | Inter, system-ui |
| **Body / UI** | `Inter` | 400, 500, 600 | system-ui, -apple-system |
| **Monospace (Prices)** | `JetBrains Mono` | 400, 500, 600 | `ui-monospace`, `SFMono-Regular` |
| **Monospace Alt** | `IBM Plex Mono` | 400, 500 | — |

**Loading strategy:** Next.js `next/font/google` with `display: 'swap'` and `subsets: ['latin']`.

### 4.2 Type Scale

| Token | Mobile | Tablet | Desktop | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|---|---|
| `display-xl` | 36px | 48px | 64px | 800 | 1.1 | -0.03em | Landing hero |
| `display-lg` | 32px | 40px | 48px | 700 | 1.15 | -0.02em | Section hero |
| `h1` | 28px | 32px | 36px | 700 | 1.2 | -0.02em | Page titles |
| `h2` | 22px | 24px | 28px | 600 | 1.25 | -0.01em | Section headers |
| `h3` | 18px | 20px | 22px | 600 | 1.3 | 0 | Card titles |
| `h4` | 15px | 16px | 16px | 600 | 1.4 | 0 | Sub-sections |
| `body-lg` | 15px | 16px | 16px | 400 | 1.6 | 0 | Featured body |
| `body` | 14px | 14px | 14px | 400 | 1.6 | 0 | Standard body |
| `body-sm` | 13px | 13px | 13px | 400 | 1.5 | 0.01em | Dense UI text |
| `label` | 11px | 12px | 12px | 500 | 1.4 | 0.02em | Labels, badges |
| `caption` | 10px | 11px | 11px | 500 | 1.4 | 0.02em | Timestamps, tags |
| `mono-lg` | 15px | 16px | 18px | 500 | 1.3 | 0 | Large prices |
| `mono` | 13px | 13px | 14px | 400 | 1.4 | 0 | Standard prices |
| `mono-sm` | 11px | 11px | 12px | 400 | 1.3 | 0 | Compact numbers |

### 4.3 Price Typography

```css
.price-display {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1, 'zero' 1;
  letter-spacing: -0.02em;
}

.price-large {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.price-change-positive {
  color: #22C55E;
  /* Subtle glow for positive */
  text-shadow: 0 0 12px rgba(34, 197, 94, 0.3);
}

.price-change-negative {
  color: #EF4444;
  text-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
}
```

**Rules:**
- All prices use tabular figures (fixed-width numbers) for alignment
- Currency symbol (₹) is 80% size of numbers, positioned slightly above baseline
- Percentage changes always include sign (+ or −)
- Decimal precision: 2 decimals for equities, 0 for indices

---

## 5. Layout & Grid

### 5.1 Grid System

| Breakpoint | Columns | Gutter | Margin | Max Width |
|---|---|---|---|---|
| `xs` (<640px) | 4 | 16px | 16px | 100% |
| `sm` (640-768px) | 4 | 16px | 24px | 100% |
| `md` (768-1024px) | 8 | 24px | 32px | 100% |
| `lg` (1024-1280px) | 12 | 24px | 40px | 1200px |
| `xl` (1280-1536px) | 12 | 24px | 48px | 1280px |
| `2xl` (>1536px) | 12 | 32px | 64px | 1440px |

### 5.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TopBar (64px fixed)                                                        │
│ ├─ Logo ├─ Market Status ├─ Search ├─ Notifications ├─ User              │
├──────────┬──────────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content Area                                               │
│ (256px)  │ ┌──────────────────────────────────────────────────────────────┐│
│ fixed    │ │ Breadcrumb + Title + Actions                                 ││
│          │ ├──────────────────────────────────────────────────────────────┤│
│          │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           ││
│          │ │ │   Card 1     │ │   Card 2     │ │   Card 3     │           ││
│          │ │ │  (glass)     │ │  (glass)     │ │  (glass)     │           ││
│          │ │ └──────────────┘ └──────────────┘ └──────────────┘           ││
│          │ │ ┌──────────────────────────────┐ ┌──────────────────────────┐││
│          │ │ │      Chart Panel             │ │    Signal Panel          │││
│          │ │ │    (lightweight-charts)      │ │    (agent reasoning)     │││
│          │ │ └──────────────────────────────┘ └──────────────────────────┘││
│          │ └──────────────────────────────────────────────────────────────┘│
└──────────┴──────────────────────────────────────────────────────────────────┘
```

**Responsive behavior:**
- `lg`+: Sidebar visible, 3-column card grid
- `md`: Sidebar collapsible to icon rail (72px), 2-column grid
- `sm`: Bottom navigation bar, single column stacked
- `xs`: Full-width cards, floating action button for primary action

---

## 6. Component Design Specs

### 6.1 SignalCard (Primary Interactive Element)

```
┌──────────────────────────────────────────┐
│  ┌─────┐  RELIANCE.NS          [BUY]   │
│  │ AI  │  Reliance Industries   ↑12.5% │
│  │ Icon│  ₹2,850.50            ₹+320   │
│  └─────┘                                 │
│  ─────────────────────────────────────── │
│  Confidence: ████████░░  82%            │
│  Agents: Fundamental • Technical • Risk  │
│  Stop: ₹2,750 | Target: ₹3,000          │
│  [View Reasoning] [Execute]              │
└──────────────────────────────────────────┘
```

**Specs:**
- Background: `glass-card` treatment
- Border: `1px solid` with signal color at 30% opacity
- Top accent: 2px border-top in signal color
- Padding: 20px
- Border radius: 16px
- Hover: `translateY(-2px)`, shadow elevation increase, border glow intensifies
- Transition: `all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`

### 6.2 PriceTag

```
₹2,850.50  ▲ +1.25%  (+₹35.20)
```

**Specs:**
- Price: `font-family: JetBrains Mono; font-size: 16px; font-weight: 600`
- Change: `font-size: 13px; font-weight: 500`
- Positive: `#22C55E` with subtle text-shadow glow
- Negative: `#EF4444` with subtle text-shadow glow
- Currency symbol: `font-size: 80%; vertical-align: super`

### 6.3 AgentPipelineVisualizer

```
┌────────────────────────────────────────────────────┐
│ Agent Pipeline — Running...  ⏱ 12s                │
│                                                    │
│ [FA]──→[TA]──→[SA]──→[NA]──→[BR]──→[RM]──→[TR]  │
│  ✅      ✅     ⏳     ○      ○      ○      ○      │
│                                                    │
│ Current: Sentiment Analyst scanning Twitter...    │
│ Progress: ████████████░░░░░░░░  40%              │
└────────────────────────────────────────────────────┘
```

**Specs:**
- Background: dark with subtle gradient
- Agent nodes: 40px circles with agent color + glow
- Active node: pulsing ring animation (2s loop)
- Completed node: checkmark icon, opacity 1
- Pending node: opacity 0.4
- Connector lines: dashed, animate dash-offset when active

### 6.4 ConfidenceMeter

```
Confidence
0%                    50%                   100%
|░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░|  72%
Weak        Moderate        Strong
```

**Specs:**
- Track: `height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1)`
- Fill: gradient from `#F59E0B` (0%) to `#22C55E` (100%)
- Thumb: 12px circle, white, shadow
- Labels below: muted text, 11px
- Animated fill on load: `width` transition 0.8s ease-out

### 6.5 ChartPanel (Lightweight Charts Integration)

```
┌────────────────────────────────────────────────────┐
│ RELIANCE.NS                    1D ▼  |  [Candles] │
│                                                    │
│     ┌──────────────────────────────────────────┐   │
│     │                                          │   │
│     │    ╱╲                                    │   │
│     │   ╱  ╲    ╱╲                             │   │
│     │  ╱    ╲  ╱  ╲   ╱╲                       │   │
│     │ ╱      ╲╱    ╲ ╱  ╲    ███             │   │
│     │╱        ╲      ╲    ╲   ███             │   │
│     │         ╲      ╲     ╲  ███              │   │
│     └──────────────────────────────────────────┘   │
│     Volume     MACD(12,26,9)    RSI(14)         │
│     [████████] [═══════]        [━━━░░░] 45       │
└────────────────────────────────────────────────────┘
```

**Specs:**
- Chart background: transparent (inherits card)
- Grid lines: `rgba(255,255,255,0.05)` — extremely subtle
- Crosshair: dashed white line, price label in tooltip
- Watermark: faint "TradeMind" logo at 5% opacity
- Timeframe selector: pill buttons, active has accent border
- Indicator panels: collapsible, 120px height each

### 6.6 Empty States

```
┌──────────────────────────────────────────┐
│                                          │
│              ┌────────┐                  │
│              │  📊    │                  │
│              │  + AI  │                  │
│              └────────┘                  │
│                                          │
│         No signals generated yet         │
│   Add stocks to your watchlist and let   │
│   our AI agents analyze them for you     │
│                                          │
│         [+ Add to Watchlist]             │
│                                          │
└──────────────────────────────────────────┘
```

**Specs:**
- Icon: 64px, muted color, subtle float animation (up/down 4px, 3s loop)
- Title: `h3` style, centered
- Description: `body` style, muted, max-width 320px, centered
- CTA: primary button, centered below
- Card background: slightly darker than surrounding

---

## 7. Animation & Motion Design

### 7.1 Animation Principles

| Principle | Implementation |
|---|---|
| **Instant Feedback** | Micro-interactions complete within 150ms |
| **Meaningful Motion** | Direction of animation implies meaning (enter from right = new, exit left = done) |
| **Staggered Reveals** | Lists and grids animate sequentially, 50ms delay between items |
| **Physics-based** | Spring animations for modals, cards (natural feel) |
| **Reduced Motion** | `@media (prefers-reduced-motion)` disables all non-essential animations |

### 7.2 Animation Library

| Library | Usage | Why |
|---|---|---|
| **Framer Motion** | Page transitions, layout animations, AnimatePresence | React-native, declarative, spring physics |
| **GSAP + ScrollTrigger** | Scroll-triggered reveals, complex timelines | Precise control, scroll-linked animations |
| **CSS Transitions** | Hover states, micro-interactions | Performance, simplicity |
| **Lightweight-charts animations** | Price updates, crosshair | Built-in, optimized for financial data |

### 7.3 Key Animations

#### Price Tick Flash
```css
@keyframes priceFlash {
  0% { background-color: rgba(34, 197, 94, 0.2); }
  100% { background-color: transparent; }
}
.price-updated {
  animation: priceFlash 0.5s ease-out;
}
```

#### Card Entrance (Staggered)
```typescript
// Framer Motion
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};
```

#### Agent Node Pulse
```css
@keyframes agentPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(139, 92, 246, 0); }
}
.agent-active {
  animation: agentPulse 2s ease-in-out infinite;
}
```

#### Skeleton Loading
```css
@keyframes skeletonShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1a1a2e 25%, #252538 50%, #1a1a2e 75%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s ease-in-out infinite;
}
```

#### Modal Entrance
```typescript
// Framer Motion
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    />
  )}
</AnimatePresence>
```

---

## 8. Iconography

### 8.1 Icon System

| Library | Usage | Style |
|---|---|---|
| **Lucide React** | Primary UI icons | Stroke width 1.5px, 24px default, geometric, clean |
| **Custom SVG** | Brand logo, trading-specific (candlestick, bull/bear) | 2px stroke, brand colors |

### 8.2 Icon Sizes

| Size | Dimension | Usage |
|---|---|---|
| `xs` | 12px | Inline with text, badges |
| `sm` | 16px | Buttons, tabs |
| `md` | 20px | Navigation, list items |
| `lg` | 24px | Standalone actions, headers |
| `xl` | 32px | Feature illustrations, empty states |
| `2xl` | 48px | Hero illustrations, onboarding |

### 8.3 Trading-Specific Icons (Custom)

| Icon | Description | Usage |
|---|---|---|
| `Candlestick` | OHLC bars | Chart type selector |
| `Bull` | Bullish trend | Buy signals, bull agent |
| `Bear` | Bearish trend | Sell signals, bear agent |
| `Robot` | AI/Agent | Agent status, AI features |
| `Circuit` | Circuit limit | Circuit breaker alerts |
| `LotSize` | Stacked boxes | F&O lot size indicator |
| `Margin` | Shield + rupee | Margin requirements |

---

## 9. Dark / Light Mode Strategy

### 9.1 Default Mode

- **Default:** Dark mode (trading platforms convention, reduces eye strain during long sessions)
- **System detection:** `next-themes` with `defaultTheme: 'dark'`
- **Toggle:** User preference overrides system, persisted in localStorage

### 9.2 Mode-Specific Adaptations

| Element | Dark Mode | Light Mode |
|---|---|---|
| **Background** | Deep navy-black `#0A0A0F` | Cool gray `#F5F5F7` |
| **Cards** | Glass with 3% white opacity | White with 70% opacity + subtle shadow |
| **Shadows** | Colored glows (purple, green, red) | Soft drop shadows |
| **Borders** | Subtle white at 6-8% opacity | Subtle black at 6-8% opacity |
| **Charts** | Dark grid, bright candles | Light grid, standard colors |
| **Agent Glows** | More pronounced (dark needs more light) | Subtler |
| **Text** | Pure white headings, gray body | Near-black headings, slate body |

### 9.3 Mode Transition

```css
/* Smooth transition between modes */
html {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.theme-transitioning * {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease !important;
}
```

---

## 10. Accessibility Standards

### 10.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|---|---|
| **Contrast Ratio** | All text ≥ 4.5:1 against background. Large text ≥ 3:1 |
| **Focus Indicators** | 2px solid `#3B82F6` outline on all interactive elements |
| **Color Independence** | Never rely on color alone. Icons + text labels always |
| **Keyboard Navigation** | Full Tab navigation. Enter/Space to activate. Escape to close |
| **Screen Readers** | All charts have `aria-label` with data summary. Agent status announced live |
| **Motion Respect** | `prefers-reduced-motion` disables animations, shows instant states |

### 10.2 Trading-Specific Accessibility

| Feature | Accessibility Solution |
|---|---|
| **Price Charts** | `aria-label` announces: "RELIANCE at 2850, up 35 rupees, 1.25 percent" on focus |
| **Agent Pipeline** | Live region announces: "Fundamental analysis complete. 3 of 8 agents done." |
| **Signal Alerts** | Toast notifications + optional sound cue + screen reader announcement |
| **Colorblind Signals** | Buy/Sell also use triangle/chevron icons, not just green/red |
| **High Contrast Mode** | `prefers-contrast: high` increases border opacity, removes glass blur |

---

## 11. Responsive Design Philosophy

### 11.1 Mobile-First Trading

**Understanding:** Indian retail traders heavily use mobile for trading. TradeMind must be fully functional on mobile, not just a shrunk desktop view.

| Feature | Desktop | Tablet | Mobile |
|---|---|---|---|
| **Sidebar** | Full 256px | Icon rail 72px | Bottom nav bar |
| **Charts** | Full width + depth + indicators | 2 indicators max | 1 indicator, swipe to change |
| **Signal Cards** | 3-column grid | 2-column grid | Stacked, full width |
| **Order Entry** | Modal with full details | Bottom sheet | Bottom sheet with essential fields only |
| **Agent Pipeline** | Full horizontal flow | Horizontal scroll | Vertical stack, 2 per row |
| **Watchlist** | Table with 8 columns | Table with 5 columns | Cards with essential data |
| **Alerts** | Dropdown panel | Dropdown panel | Full-screen modal |

### 11.2 Touch Targets

| Element | Minimum Size | Padding |
|---|---|---|
| **Buttons** | 44×44px | 12px internal |
| **List items** | 48px height | 16px horizontal |
| **Chart interactions** | 40px touch radius for crosshair | — |
| **Form inputs** | 48px height | 12px internal |

### 11.3 Performance Budgets

| Metric | Target | Mobile Target |
|---|---|---|
| **First Contentful Paint** | < 1.5s | < 2s |
| **Largest Contentful Paint** | < 2.5s | < 3s |
| **Time to Interactive** | < 3s | < 4s |
| **Cumulative Layout Shift** | < 0.1 | < 0.1 |
| **Chart initial render** | < 500ms | < 800ms |

---

## 12. Design Tokens Summary (JSON Export)

```json
{
  "colors": {
    "background": { "dark": "#0A0A0F", "light": "#F5F5F7" },
    "surface": { "dark": "#12121A", "light": "#FFFFFF" },
    "surfaceElevated": { "dark": "#1A1A2E", "light": "#FFFFFF" },
    "textPrimary": { "dark": "#F0F0F5", "light": "#0F0F1A" },
    "textSecondary": { "dark": "#9CA3AF", "light": "#5A5A6E" },
    "buy": { "dark": "#22C55E", "light": "#059669" },
    "sell": { "dark": "#EF4444", "light": "#DC2626" },
    "ai": { "dark": "#A78BFA", "light": "#7C3AED" }
  },
  "typography": {
    "heading": "Plus Jakarta Sans",
    "body": "Inter",
    "mono": "JetBrains Mono"
  },
  "spacing": {
    "xs": "4px", "sm": "8px", "md": "16px",
    "lg": "24px", "xl": "32px", "2xl": "48px"
  },
  "radius": {
    "sm": "4px", "md": "8px", "lg": "12px", "xl": "16px"
  },
  "shadow": {
    "card": "0 4px 24px rgba(0,0,0,0.2)",
    "elevated": "0 8px 32px rgba(0,0,0,0.3)",
    "modal": "0 24px 48px rgba(0,0,0,0.4)"
  },
  "animation": {
    "fast": "150ms",
    "normal": "250ms",
    "slow": "400ms",
    "spring": "type: spring, stiffness: 400, damping: 30"
  }
}
```

---

*Document version: 1.0 | Last updated: May 2026*
