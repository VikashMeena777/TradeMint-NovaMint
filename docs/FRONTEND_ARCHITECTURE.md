# Frontend Architecture & Design System v1.0

## 1. Design System Tokens

### 1.1 Color Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--color-bg-primary` | `#FFFFFF` | `#0F0F0F` | Page background |
| `--color-bg-secondary` | `#F8F9FA` | `#1A1A1A` | Card/panel background |
| `--color-bg-tertiary` | `#EEF0F2` | `#262626` | Input/select background |
| `--color-bg-elevated` | `#FFFFFF` | `#262626` | Modal/dropdown background |
| `--color-text-primary` | `#0F0F0F` | `#F5F5F5` | Headings, primary text |
| `--color-text-secondary` | `#6B7280` | `#9CA3AF` | Descriptions, meta text |
| `--color-text-muted` | `#9CA3AF` | `#6B7280` | Timestamps, disabled |
| `--color-accent-buy` | `#22C55E` | `#22C55E` | Bullish signals, gains, buy |
| `--color-accent-sell` | `#EF4444` | `#EF4444` | Bearish signals, losses, sell |
| `--color-accent-neutral` | `#F59E0B` | `#F59E0B` | Hold, warning, pending |
| `--color-accent-info` | `#3B82F6` | `#60A5FA` | Links, info, highlights |
| `--color-accent-purple` | `#8B5CF6` | `#A78BFA` | AI features, agent status |
| `--color-border-primary` | `#E5E7EB` | `#404040` | Card borders |
| `--color-border-secondary` | `#D1D5DB` | `#525252` | Input borders |
| `--color-shadow-card` | `rgba(0,0,0,0.05)` | `rgba(0,0,0,0.3)` | Card shadow |

**Token delivery:** Tailwind CSS v4 theme configuration in `tailwind.config.ts` with `darkMode: 'class'` strategy.

### 1.2 Typography Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `--text-h1` | 32px (2rem) | 700 | 1.2 | -0.02em | Page titles |
| `--text-h2` | 24px (1.5rem) | 600 | 1.3 | -0.01em | Section headers |
| `--text-h3` | 20px (1.25rem) | 600 | 1.4 | 0 | Card titles |
| `--text-h4` | 16px (1rem) | 600 | 1.5 | 0 | Sub-sections |
| `--text-body` | 14px (0.875rem) | 400 | 1.6 | 0 | Body text |
| `--text-small` | 12px (0.75rem) | 500 | 1.5 | 0.01em | Labels, badges |
| `--text-micro` | 10px (0.625rem) | 500 | 1.4 | 0.02em | Timestamps, tags |
| `--text-mono` | 13px (0.8125rem) | 400 | 1.5 | 0 | Prices, quantities |

**Font stack:** Geist (Vercel) or Inter for UI; JetBrains Mono for numbers/codes.

### 1.3 Spacing & Layout Scale

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Icon padding, micro gaps |
| `--space-sm` | 8px | Inline spacing, tight lists |
| `--space-md` | 16px | Card padding, form gaps |
| `--space-lg` | 24px | Section gaps, modal padding |
| `--space-xl` | 32px | Page sections |
| `--space-2xl` | 48px | Major page blocks |
| `--radius-sm` | 4px | Buttons, badges |
| `--radius-md` | 8px | Cards, inputs |
| `--radius-lg` | 12px | Panels, modals |
| `--radius-xl` | 16px | Feature cards |

### 1.4 Motion & Animation Tokens

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | 150ms | Hover states, micro-interactions |
| `--duration-normal` | 250ms | Transitions, dropdowns |
| `--duration-slow` | 400ms | Page transitions, modals |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard easing |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Success states, counters |
| `--ease-spring` | `spring(1, 100, 10, 0)` | Complex motion (Framer Motion) |

---

## 2. Component Hierarchy

### 2.1 Atomic Design Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPONENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│  Atoms        │ Button, Input, Badge, Icon, Label, Text        │
│  Molecules    │ SignalCard, PriceTag, StatusBadge, AlertRow    │
│  Organisms    │ WatchlistTable, PortfolioChart, SignalPanel   │
│  Templates    │ DashboardLayout, TradeDetailLayout, AuthLayout │
│  Pages        │ DashboardPage, SignalPage, SettingsPage        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Catalog (50+ Components)

**Atoms (15):**
`Button`, `IconButton`, `Toggle`, `Input`, `Select`, `Textarea`, `Badge`, `Avatar`, `Skeleton`, `Spinner`, `Divider`, `Tooltip`, `ProgressBar`, `Switch`, `Slider`

**Molecules (18):**
`SignalCard`, `TradeRow`, `PriceTag`, `ChangeIndicator`, `StatusBadge`, `AlertRow`, `WatchlistItem`, `PositionRow`, `AgentStatusPill`, `ConfidenceMeter`, `RiskBadge`, `TimeAgo`, `EmptyState`, `ErrorState`, `LoadingState`, `SearchBar`, `FilterChip`, `SortControl`

**Organisms (15):**
`WatchlistTable`, `PortfolioChart`, `SignalPanel`, `TradeHistoryTable`, `PositionSummary`, `AgentPipelineVisualizer`, `AlertCenter`, `BacktestForm`, `RiskProfileSelector`, `OnboardingStepper`, `NavigationSidebar`, `TopBar`, `MobileBottomNav`, `NotificationDropdown`, `SettingsPanel`

**Templates (6):**
`DashboardLayout`, `TradeDetailLayout`, `AuthLayout`, `MarketingLayout`, `SettingsLayout`, `MobileLayout`

**Pages (10):**
`DashboardPage`, `WatchlistPage`, `SignalsPage`, `TradesPage`, `PortfolioPage`, `AgentsPage`, `BacktestsPage`, `AlertsPage`, `SettingsPage`, `OnboardingPage`

### 2.3 shadcn/ui Integration Strategy

All base components forked from shadcn/ui with custom theme tokens applied.
Override files live in `components/ui/` with the following customization rules:

- **Button:** Added `variant="signal"` (buy/sell/neutral themed), `size="xs"`.
- **Badge:** Added `variant="confidence"` with gradient background by score.
- **Dialog:** Added `size="xl"` for chart modals, `size="full"` for mobile sheets.
- **Table:** Added virtualized row support, sortable headers, column resizing.
- **Chart:** Custom wrappers around `lightweight-charts` with theme sync.
- **Form:** React Hook Form + Zod integration with server action support.

---

## 3. Page Architecture & Routing

### 3.1 Route Map (Next.js App Router)

```
(app)/
├── (marketing)/
│   ├── page.tsx              # Landing page
│   ├── pricing/page.tsx
│   ├── about/page.tsx
│   └── blog/[slug]/page.tsx
├── (dashboard)/
│   ├── layout.tsx            # DashboardLayout + auth guard
│   ├── page.tsx              # /dashboard → redirect to /dashboard/overview
│   ├── overview/page.tsx     # Portfolio snapshot + recent signals
│   ├── watchlist/page.tsx    # Watchlist management
│   ├── signals/page.tsx      # Signal history + generation
│   ├── signals/[id]/page.tsx # Signal detail + reasoning
│   ├── trades/page.tsx       # Trade history
│   ├── portfolio/page.tsx    # Full portfolio analytics
│   ├── agents/page.tsx       # Agent status + logs
│   ├── backtests/page.tsx    # Backtest list + run
│   ├── backtests/[id]/page.tsx # Backtest results
│   ├── alerts/page.tsx       # Alert management
│   └── settings/page.tsx     # Account + preferences
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── reset-password/page.tsx
│   └── verify/page.tsx
├── (legal)/
│   ├── privacy/page.tsx
│   └── terms/page.tsx
├── api/                      # Next.js API routes + Server Actions
└── layout.tsx                # Root layout (providers, fonts, metadata)
```

### 3.2 Layout Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  TopBar (sticky, z-50)                                          │
│  ├── Logo + Navigation (responsive: hamburger on mobile)       │
│  ├── Market Status Badge (open/closed/pre-market)               │
│  ├── Notification Bell + Alert Counter                          │
│  └── User Avatar + Dropdown                                     │
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content Area                                    │
│ (240px)  │ ├── Breadcrumb + Page Title                          │
│ fixed    │ ├── Content Grid (responsive)                        │
│          │ └── Footer (version, links)                          │
│          │                                                      │
│ Collapsible on tablet (<1024px)                                  │
│ Hidden on mobile (<768px) → BottomNav                          │
└──────────┴──────────────────────────────────────────────────────┘
```

**Responsive breakpoints:**
- `xs`: < 640px — Mobile, single column, BottomNav, full-width cards
- `sm`: 640px–768px — Large phones, stacked layout
- `md`: 768px–1024px — Tablets, 2-column grids, collapsible sidebar
- `lg`: 1024px–1280px — Small desktop, sidebar visible, 3-column grids
- `xl`: 1280px–1536px — Desktop, 4-column grids, full feature set
- `2xl`: > 1536px — Large monitors, wide charts, side-by-side detail views

---

## 4. State Management Architecture

### 4.1 State Ownership Matrix

| State Category | Owner | Technology | Persistence | Scope |
|---|---|---|---|---|
| Server Cache | React Query | TanStack Query v5 | Stale-while-revalidate | Global |
| Client UI State | Zustand | Zustand v5 | In-memory | Global |
| Auth State | Supabase | `@supabase/ssr` | HTTP-only cookie | Global |
| Real-time Prices | Zustand + WebSocket | Socket.io client | In-memory | Per-symbol |
| Form State | React Hook Form | RHF + Zod | Local state | Component |
| Chart State | Lightweight-charts | Internal | In-memory | Component |
| Draft/Transient | Zustand | Zustand | SessionStorage | User |

### 4.2 Zustand Store Structure

```typescript
// stores/app-store.ts
interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  activeSymbol: string | null;
  selectedTimeframe: '1m' | '5m' | '15m' | '1h' | '1d';
  chartType: 'candlestick' | 'line' | 'area';

  // Real-time Data
  priceStream: Record<string, {
    price: number;
    change: number;
    changePercent: number;
    timestamp: string;
    volume: number;
  }>;

  // Agent Pipeline Status
  agentPipelines: Record<string, {
    status: 'idle' | 'running' | 'complete' | 'error';
    progress: number;
    currentAgent: string;
    startedAt: string;
    latencyMs: number;
  }>;

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: AppState['theme']) => void;
  updatePrice: (symbol: string, data: PriceTick) => void;
  setPipelineStatus: (id: string, status: PipelineStatus) => void;
}
```

### 4.3 React Query Configuration

```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30s default stale
      gcTime: 5 * 60 * 1000,        // 5 min cache
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        toast.error(error.message);
      },
    },
  },
});

// Query key conventions
// ['watchlists', userId] → watchlist list
// ['signals', userId, { status, page }] → paginated signals
// ['portfolio', userId, date] → portfolio snapshot
// ['price', symbol, timeframe] → price bars
```

---

## 5. Real-time Data Flow

### 5.1 WebSocket → Zustand → React Pipeline

```
Zerodha Kite WebSocket (KiteTicker) / Upstox WebSocket
  → Python AI Engine (Redis Pub/Sub relay)
    → Socket.io Server (Redis Adapter for multi-node)
      → Socket.io Client (per-user room: `user:${userId}`)
        → Zustand Store (update priceStream)
          → React Components (re-render with memoized selectors)
            → Lightweight-charts (update candle in-place)
```

### 5.2 Price Update Handling

```typescript
// hooks/usePriceStream.ts
export function usePriceStream(symbol: string) {
  const socket = useSocket();
  const updatePrice = useAppStore((s) => s.updatePrice);

  useEffect(() => {
    const room = `price:${symbol}`;
    socket.emit('subscribe:price', { symbol });
    socket.on('price:tick', (tick: PriceTick) => {
      updatePrice(symbol, tick);
    });
    return () => {
      socket.emit('unsubscribe:price', { symbol });
      socket.off('price:tick');
    };
  }, [symbol, socket, updatePrice]);

  return useAppStore((s) => s.priceStream[symbol]);
}

// Optimization: Batch updates every 100ms to reduce re-renders
// Use requestAnimationFrame for chart updates
```

### 5.3 Agent Pipeline Streaming

```typescript
// hooks/useAgentPipeline.ts
export function useAgentPipeline(signalId: string) {
  const socket = useSocket();
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);

  useEffect(() => {
    socket.emit('agent:subscribe', { signalId });
    socket.on('agent:status', (status) => setPipeline(status));
    socket.on('agent:pipeline:complete', (result) => {
      setPipeline((p) => ({ ...p, status: 'complete', ...result }));
      // Invalidate signal query to show new data
      queryClient.invalidateQueries({ queryKey: ['signals'] });
    });
    return () => socket.off('agent:status');
  }, [signalId, socket]);

  return pipeline;
}
```

---

## 6. Chart Component Specifications

### 6.1 TradingView Lightweight-charts Wrapper

```typescript
// components/charts/PriceChart.tsx
interface PriceChartProps {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '1d';
  chartType: 'candlestick' | 'line' | 'area';
  showVolume: boolean;
  showIndicators: string[]; // e.g., ['ma_50', 'ma_200', 'bollinger']
  height?: number;
  onCrosshairMove?: (point: CrosshairData) => void;
}
```

**Performance requirements:**
- 10K candles at 60fps (lightweight-charts native capability).
- Update last candle in-place on new tick (< 16ms).
- Auto-scale Y-axis with 5% padding.
- Sync crosshair across multiple charts (overview + detail).

### 6.2 Indicator Overlay Architecture

```typescript
// Indicators rendered as separate series on the same chart
const indicatorSeries = {
  ma_50: { type: 'line', color: '#3B82F6', lineWidth: 1 },
  ma_200: { type: 'line', color: '#F59E0B', lineWidth: 1, lineStyle: 'dashed' },
  bollinger: { type: 'band', upper: '#EF4444', lower: '#22C55E', middle: '#9CA3AF' },
  volume: { type: 'histogram', color: 'rgba(59, 130, 246, 0.3)', pane: 'bottom' },
};
```

### 6.3 Chart Interaction Patterns

| Interaction | Behavior |
|---|---|
| Click candle | Open signal detail modal with that timestamp |
| Drag horizontal | Pan time range |
| Scroll/mouse wheel | Zoom in/out (time axis) |
| Right-click | Context menu: "Add to watchlist", "Generate signal", "Set alert" |
| Crosshair hover | Show OHLCV + timestamp tooltip |
| Double-click | Reset zoom to default range |
| Pinch (mobile) | Zoom time axis |

---

## 7. Form Validation & Input Patterns

### 7.1 Validation Strategy

- **Client:** Zod schemas shared with backend (`packages/shared-types`).
- **Server:** Server Actions validate with same Zod schema.
- **Error display:** Inline field errors + toast for server errors.

### 7.2 Common Form Patterns

```typescript
// lib/validations/signal.ts
export const createSignalSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive']),
  confidenceThreshold: z.number().min(50).max(100).default(70),
  autoExecute: z.boolean().default(false),
  maxPositionSize: z.number().positive().optional(),
});

// Server Action
export async function requestSignal(input: CreateSignalInput) {
  const parsed = createSignalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  // Call AI engine API...
}
```

### 7.3 Optimistic Updates

```typescript
// For trade approval — show pending state immediately
const approveSignal = useMutation({
  mutationFn: api.signals.approve,
  onMutate: async (signalId) => {
    await queryClient.cancelQueries({ queryKey: ['signals'] });
    const previous = queryClient.getQueryData(['signals']);
    queryClient.setQueryData(['signals'], (old) =>
      old.map((s) => s.id === signalId ? { ...s, status: 'approved' } : s)
    );
    return { previous };
  },
  onError: (err, signalId, context) => {
    queryClient.setQueryData(['signals'], context.previous);
    toast.error('Approval failed');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['signals'] });
  },
});
```

---

## 8. Error Boundary Strategy

### 8.1 Boundary Hierarchy

```
RootErrorBoundary (catches all unhandled errors)
  ├── AuthErrorBoundary (auth-specific, redirect to login)
  ├── DashboardErrorBoundary (dashboard sections, show fallback UI)
  │   ├── ChartErrorBoundary (chart crashes → show static image)
  │   ├── TableErrorBoundary (table crashes → show CSV download)
  │   └── AgentErrorBoundary (agent viz crashes → show text status)
  └── MarketingErrorBoundary (static fallback)
```

### 8.2 Fallback UI Patterns

| Component Type | Fallback | Action |
|---|---|---|
| Chart | Static image + "Retry" button | Reload chart data |
| Table | CSV download link + "Retry" | Fetch data again |
| Signal card | Skeleton + error badge | Auto-retry in 5s |
| Portfolio summary | Cached last-known value + "Stale" badge | Manual refresh |
| Full page | Error page with stack trace (dev) / contact support (prod) | Report to Sentry (free) |

### 8.3 Loading Skeletons

- **Card skeleton:** Rounded rectangle pulse (height matches content).
- **Table skeleton:** 5 rows × N columns, header static, rows pulse.
- **Chart skeleton:** Gray box with axis lines, pulse overlay.
- **Text skeleton:** 2-3 lines of varying width, pulse.
- **Avatar skeleton:** Circle pulse, 32px.

---

## 9. Accessibility (WCAG 2.1 AA)

### 9.1 Color & Contrast

- Minimum contrast ratio: **4.5:1** for normal text, **3:1** for large text.
- All color-coded signals (buy/sell/hold) have **text label + icon**, never color alone.
- Colorblind-friendly palette: Buy = green + upward triangle; Sell = red + downward triangle; Hold = yellow + dash.

### 9.2 Keyboard Navigation

| Shortcut | Action |
|---|---|
| `Tab` | Navigate interactive elements in logical order |
| `Enter/Space` | Activate buttons, open modals |
| `Escape` | Close modals, dropdowns, sidebars |
| `Ctrl/Cmd + K` | Open command palette (global search) |
| `Ctrl/Cmd + 1-5` | Switch dashboard tabs |
| `Arrow keys` | Navigate tables, charts (crosshair) |
| `Home/End` | Jump to first/last item in lists |

### 9.3 Screen Reader Support

- All charts have `aria-label` describing current state ("AAPL price chart, 1 hour timeframe, current price $175.30, up 1.2%").
- Live regions for real-time updates (`aria-live="polite"` for prices, `aria-live="assertive"` for alerts).
- Agent pipeline status announced as steps complete.
- Focus management: trap focus in modals, return focus on close.

### 9.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Performance Budgets

| Metric | Target | Maximum | Measurement |
|---|---|---|---|
| First Contentful Paint (FCP) | < 1.0s | < 1.8s | Lighthouse |
| Largest Contentful Paint (LCP) | < 1.5s | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 2.0s | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.05 | < 0.1 | Lighthouse |
| First Input Delay (FID) | < 50ms | < 100ms | Lighthouse |
| Interaction to Next Paint (INP) | < 150ms | < 250ms | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | < 500ms | Lighthouse |
| Bundle size (initial) | < 200KB | < 350KB | webpack-bundle-analyzer |
| Bundle size (dashboard lazy) | < 500KB | < 800KB | webpack-bundle-analyzer |
| Chart library (lazy) | < 150KB | < 200KB | gzip |
| API response (cached) | < 100ms | < 300ms | Vercel Analytics |
| API response (uncached) | < 500ms | < 1.5s | Vercel Analytics |

### 10.1 Optimization Strategies

- **Code splitting:** Route-level + component-level lazy loading (`React.lazy()` + `Suspense`).
- **Tree shaking:** ES modules only; remove unused TA-Lib wrappers.
- **Image optimization:** Next.js `<Image>` with WebP/AVIF, placeholder blur.
- **Font optimization:** `next/font` with `subset` strategy; font-display: swap.
- **Prefetching:** `router.prefetch()` on hover for dashboard routes.
- **Service Worker:** Cache static assets, stale-while-revalidate for API responses.

---

## 11. Mobile-First Responsive Strategy

### 11.1 Mobile Adaptations

- **Bottom navigation:** 5 tabs (Overview, Watchlist, Signals, Portfolio, More).
- **Swipe gestures:** Swipe left on signal to approve, right to reject (with confirmation).
- **Pull-to-refresh:** On lists (signals, trades, watchlist).
- **Touch targets:** Minimum 44×44px for all interactive elements.
- **Chart interaction:** Pinch to zoom, tap for crosshair, long-press for context menu.
- **Modals:** Bottom sheet on mobile (< 768px), centered modal on desktop.

### 11.2 PWA Considerations

- **Manifest:** `manifest.json` with icons, theme color, display mode `standalone`.
- **Service Worker:** Workbox for offline caching of dashboard shell + last-known data.
- **Push notifications:** Web Push API for signal alerts (with user consent).
- **Add to Home Screen:** Prompt after 3 visits + engagement threshold.
- **Offline support:** Cache watchlist + last portfolio snapshot; show "Offline" banner.

---

## 12. SEO Strategy

### 12.1 Landing Pages

- `/` — Main landing: "AI-Powered Trading Intelligence" — target "AI trading platform".
- `/pricing` — Comparison table, feature list, FAQ schema markup.
- `/about` — Team, mission, press coverage — Organization schema.
- `/blog/[slug]` — Educational content targeting long-tail keywords.

### 12.2 Technical SEO

- **Meta tags:** Dynamic `<title>` and `<meta name="description">` per page.
- **Open Graph:** `og:image` generated dynamically for signal sharing cards.
- **Structured data:** JSON-LD for Product, FAQPage, Organization, BreadcrumbList.
- **Sitemap:** Dynamic `sitemap.xml` with blog posts, updated weekly.
- **Robots.txt:** Allow all except `/api/`, `/settings/`.
- **Canonical URLs:** Prevent duplicate content from query parameters.
- **Core Web Vitals:** Monitor in Search Console; target all green.

### 12.3 Performance for SEO

- Server-side rendering (SSR) for all marketing pages.
- Static generation (ISR) for blog posts (revalidate: 3600s).
- Dynamic rendering for dashboard pages (client-side only, no SEO needed).

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
