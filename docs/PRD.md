# TradeMind AI — Product Requirements Document (PRD) v2.0

## 1. Executive Summary

**TradeMind AI** is an autonomous trading intelligence platform that deploys a multi-agent AI system to research Indian markets, analyze charts, assess risk, and execute trades — all through a single unified dashboard. Inspired by the [TradingAgents research framework](https://tradingagents-ai.github.io/) (UCLA/MIT) but built as a production SaaS with live Indian broker integration.

**Target Users:**
- **Indian Retail Traders (25-40):** No time to research 10+ stocks daily across MoneyControl, Screener, Economic Times. Want AI-assisted decision-making without manual chart analysis for NSE/BSE equities and F&O.
- **Indian Quant Hobbyists:** Want to test strategies without coding. Need visual backtesting + AI strategy generation for Indian stocks.
- **Small Fund Managers / PMS (<₹50 Cr AUM):** Can't afford Bloomberg + research team. Need institutional-grade multi-agent research at SaaS pricing for Indian markets.
- **F&O Traders:** 9:15 AM–3:30 PM IST window, can't monitor all option chains. Need AI agents running during market hours with expiry-aware alerts.

**MVP Success Criteria:**
- User can sign up, connect Zerodha Kite paper account, view real-time NSE/BSE charts, and receive first AI trade signal within 5 minutes of onboarding.
- AI signal accuracy (directional) > 55% in first 30 days of paper trading on Nifty 50 constituents.
- Platform latency: price data <500ms (via Mumbai co-located broker WS), signal generation <30s, trade execution <2s via Indian broker API.

---

## 2. Core Value Proposition

| Problem | Solution | Metric |
|---|---|---|
| Manual research across 10+ sources (MoneyControl, Screener, Economic Times) is time-consuming | 7 specialized AI agents research simultaneously | Research cycle <30s per symbol |
| Emotional trading leads to losses | Risk Management Agent enforces strict position limits and SEBI circuit limit checks | 100% of signals validated by risk gate |
| Lag in reacting to Indian market news | Real-time news + sentiment analysis pipeline for Indian markets | News ingestion <60s from publish (Economic Times, MoneyControl) |
| No unified view of technical + fundamental + sentiment for Indian stocks | All signals aggregated into a single Trade Decision Score | Confidence score 0-100 with full traceability |
| No explainability in AI trading tools for Indian markets | Every trade shows exactly which agents said what | Full reasoning trail per signal |

---

## 3. Key Features

### 3.1 Multi-Agent AI Engine
A fleet of LLM-powered agents collaborating like a real Indian brokerage research desk, orchestrated via LangGraph with persistent state checkpointing.

| Agent | LLM | Tools | Output | Parallel? |
|---|---|---|---|---|
| **Fundamental Analyst** | Groq Llama 3.3 70B | Screener.in, Tijori Finance, NSE Corporate Filing, NSE/BSE announcements | JSON: fair value, growth rating, RoE, promoter holding, FII/DII flows | Yes |
| **Technical Analyst** | Groq Llama 3.3 70B | TA-Lib (200+ indicators), Pandas TA, NSE tick data | JSON: indicator values + trend signals for NSE stocks | Yes |
| **Sentiment Analyst** | GPT-4o-mini | Reddit r/IndianStreetBets, Twitter India, TradingQ&A, Telegram channels | Sentiment score (-1 to +1) + key themes | Yes |
| **News Analyst** | GPT-4o-mini | Economic Times API, MoneyControl RSS, SEBI circulars, earnings calendar | Event impact score + summary for Indian context | Yes |
| **Bull Researcher** | GPT-4o | Access to all analyst reports | Bull case argument with probability | No (sequential) |
| **Bear Researcher** | GPT-4o | Access to all analyst reports | Bear case argument with risk factors | No (sequential) |
| **Risk Manager** | o1-mini / DeepSeek R1 | Portfolio DB, volatility calc, SEBI margin norms, circuit limits | Approved/Rejected with risk notes | No (validation gate) |
| **Trader Agent (Execution)** | GPT-4o | All above + historical backtests on Nifty 50 | Final signal JSON with entry/exit/stop in INR | No (synthesis) |

**Execution Flow:**
1. All 4 Analyst Agents run **in parallel** (independent data gathering, ~5-10s)
2. Researcher Debate runs **after** all analysts complete (needs all inputs, ~10-15s)
3. Trader Agent synthesizes debate + analyst outputs (~5s)
4. Risk Manager validates proposed signal (~3-5s)
5. **Total pipeline latency target: <30 seconds** for full cycle

### 3.2 Live Trading Dashboard
- Real-time candlestick charts with overlay indicators (Lightweight Charts) for NSE/BSE
- Portfolio P&L tracking in INR
- Active AI agent status (which agent is researching what, with progress streaming)
- Trade history with full AI reasoning explainability (click any trade to see agent contributions)
- WebSocket-powered price tickers with <500ms latency for NSE/BSE
- Agent activity feed / transparency log
- Dark/light mode with WCAG 2.1 AA compliance

### 3.3 Automated Trade Execution
- **Paper Trading Mode:** Simulate trades with fake money via Zerodha Kite / Upstox sandbox. Required 30-day profitable period before live unlock.
- **Live Trading Mode:** Connect Zerodha Kite Connect / Upstox API for real execution on NSE/BSE. One-click paper-to-live graduation.
- **Risk Profiles:** Conservative (max 5% position, tight stops), Moderate (max 10%), Aggressive (max 20%)
- **Auto-Execute Toggle:** User can enable fully automated execution per symbol or globally.
- **Order Types:** Market, Limit, Stop, Stop-Limit, Bracket Order (BO), Cover Order (CO) — Indian broker specific

### 3.4 Research Reports
- Auto-generated pre-trade research memos in INR (HTML + PDF export)
- Post-trade performance attribution: what the AI got right/wrong per agent
- Agent accuracy tracking over time (per-agent win rates on Indian stocks)
- Backtest result embedding in research memos using NSE historical data

### 3.5 Alerts & Notifications
- High-confidence trade opportunity alerts (in-app + push)
- Stop-loss triggered notifications
- Daily portfolio summary email (via Resend / Indian SMTP)
- Agent pipeline failure alerts
- Price alerts (break above/below levels)
- F&O expiry reminders and pre-market alerts (9:00 AM IST)

---

## 4. User Personas & Jobs-To-Be-Done

### Persona 1: "Busy Retail Trader" — Arjun, 32, Software Engineer in Bangalore
- **JTBD:** "I want to trade NSE stocks but I don't have 2 hours every morning to read MoneyControl, Screener, and Economic Times before 9:15 AM."
- **Pain:** Misses pre-market opportunities because he can't monitor markets during stand-up meetings.
- **Gain:** AI agents monitor his NSE watchlist and alert him only on high-confidence setups via in-app notifications and email.
- **Success metric:** Receives <5 high-quality signals per day during market hours, 70%+ win rate.

### Persona 2: "Quant Hobbyist" — Priya, 29, Data Analyst in Mumbai
- **JTBD:** "I want to backtest NSE strategies without writing Python for Bhavcopy data."
- **Pain:** Backtesting frameworks are complex; collecting NSE historical data (bhavcopy) is tedious.
- **Gain:** Visual backtesting + AI strategy generation with one-click Zerodha paper trading.
- **Success metric:** Can create, backtest, and paper-trade a new NSE strategy in <30 minutes.

### Persona 3: "Small Fund Manager" — Ravi, 45, Runs ₹25 Cr PMS in Delhi
- **JTBD:** "I need institutional-quality Indian equity research without hiring a ₹30 LPA analyst."
- **Pain:** Bloomberg terminal is overkill for Indian markets; free tools (Screener) lack real-time synthesis.
- **Gain:** Multi-agent debate + risk validation gives him confidence in allocation decisions across Nifty 50 and midcap portfolios.
- **Success metric:** AI research quality comparable to junior research analyst at 1/10th cost.

---

## 5. User Flows

### 5.1 Onboarding Flow (Target: <5 min to first signal)
```
Sign Up (email/Google OAuth + mobile OTP)
  → Verify email (optional, skip for Google)
  → Risk profile quiz (3 questions: experience, capital, risk tolerance)
  → Connect Zerodha Kite / Upstox (paper default, live option hidden behind 30-day gate)
  → Dashboard tutorial (3-step coach marks)
  → Suggest popular NSE symbols to watchlist (RELIANCE, TCS, INFY, HDFCBANK)
  → Generate first signal on selected symbol (~30s loading state with agent animation)
```

### 5.2 Trade Execution Flow
```
User Selects Stock / Adds to NSE Watchlist
  → AI Agents Run Research Cycle (parallel + sequential, streamed to UI)
  → Trade Signal Generated with Confidence Score (0-100)
  → User Reviews Signal (entry in ₹, stop, take-profit, agent reasoning in English/Hindi)
  → User Approves or Auto-Execute Enabled
  → Risk Manager Pre-Trade Checks (position size, SEBI margin, circuit limits, buying power)
  → Zerodha Kite / Upstox Executes Order on NSE/BSE
  → Order Fill Confirmation + Portfolio Update in INR
  → Post-Trade Monitoring (stop-loss tracking, alert on trigger, F&O expiry reminders)
```

### 5.3 Paper-to-Live Graduation Flow
```
User trades in Paper Mode (Zerodha Kite sandbox)
  → System tracks 30-day rolling performance on NSE/BSE paper
  → If profitable + >10 trades + win rate >50% → Unlock Live Trading prompt
  → User provides additional identity verification (PAN + mobile OTP for Indian KYC)
  → User re-connects broker with live API keys
  → System enforces stricter risk limits for first 30 live trades (SEBI margin + circuit checks)
```

---

## 6. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-1 | User auth via Supabase (email + Google OAuth + mobile OTP) | P0 | OAuth flow <10s; session persistence across reloads |
| FR-2 | Zerodha Kite / Upstox API key onboarding (paper + live) | P0 | Key encrypted at rest (AES-256); server-side proxy only |
| FR-3 | Real-time price streaming via broker WebSocket (NSE tick-by-tick) | P0 | Latency <500ms p95; Mumbai co-located; auto-reconnect on drop |
| FR-4 | Multi-agent research pipeline execution | P0 | <30s end-to-end; 99% success rate; streamed progress |
| FR-5 | Technical indicator computation (200+ via TA-Lib) | P0 | Compute <2s per symbol; cache 60s |
| FR-6 | Trade signal generation with confidence score (0-100) | P0 | Score calibrated to actual win rate within +/- 10% |
| FR-7 | Paper trading simulation engine (Zerodha/Upstox sandbox) | P0 | Track P&L, fills, commissions; mirror Indian broker paper |
| FR-8 | Live order execution via Indian broker API | P1 | Execution <2s; fill rate >95%; error rate <1% |
| FR-9 | Portfolio tracking and P&L visualization in INR | P1 | Real-time P&L; historical snapshots; tax lot tracking (STCG/LTCG) |
| FR-10 | Research memo generation (PDF/HTML export) | P1 | Generate <5s; include all agent contributions |
| FR-11 | Alert system (in-app + email + push notifications) | P1 | Delivery <30s; delivery rate >99% |
| FR-12 | Backtesting module (run AI on historical NSE/BSE data) | P2 | 1 year history in <60s; slippage model included |
| FR-13 | User onboarding with risk profiling | P1 | Completion rate >80%; <3 min to complete |
| FR-14 | Agent transparency / explainability viewer | P1 | Full reasoning trail per signal; agent contributions JSON |
| FR-15 | Watchlist management with AI recommendations | P1 | Add/remove symbols; sector breakdown; correlation alert |
| FR-16 | SEBI Feb 2025 algo compliance (Generic Algo ID, <10 OPS, White Box) | P0 | All broker API orders tagged; system throttled below 10 OPS; explainability trail per signal |
| FR-17 | Tax reporting export (STCG/LTCG, F&O P&L, brokerage breakdown) | P2 | Export CSV for ITR-2/ITR-3; STCG 20% / LTCG 12.5% auto-calculation; GST on subscription at 18% |

---

## 7. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Latency** | Price data WebSocket updates | <500ms p95 |
| **Latency** | AI signal generation (full pipeline) | <30s p95 |
| **Latency** | Trade execution (click to fill) | <2s p95 |
| **Availability** | Uptime during market hours (9:15-15:30 IST) | 99.9% |
| **Availability** | AI pipeline availability | 99.5% |
| **Scalability** | Concurrent active users (MVP) | 1,000 |
| **Scalability** | Signals per day per user (Pro tier) | Unlimited |
| **Scalability** | WebSocket connections per node | 10,000 |
| **Security** | API key encryption | AES-256-GCM at rest |
| **Security** | Transport encryption | TLS 1.3 minimum |
| **Security** | Auth session | httpOnly, secure, SameSite=strict |
| **Compliance** | SEBI disclaimer on all trade pages (English + Hindi) | 100% page coverage |
| **Compliance** | AI explainability (regulatory + trust) | Every signal shows reasoning trail |
| **Compliance** | Data retention (trades) | 8 years (SEBI mandated) |
| **Compliance** | Data retention (signals/logs) | 3 years |
| **Compliance** | GDPR/DPDP right to erasure | Honor within 30 days (with AML exceptions) |
| **Accessibility** | WCAG 2.1 AA compliance | Audit score >90 |
| **Performance** | Lighthouse Performance score | >90 |
| **Performance** | First Contentful Paint | <1.5s |
| **Performance** | Time to Interactive | <3.5s |
| **Data Freshness** | Price data | <5s stale max |
| **Data Freshness** | News/sentiment | <15 min stale max |
| **Data Freshness** | Fundamentals (Screener.in) | <24h stale max |

---

## 8. API-First Design Principles

1. **All features exposed via REST API first**, UI is a consumer.
2. **WebSocket for real-time data**; REST for actions/state changes.
3. **Idempotency keys** on all mutating endpoints (especially trades).
4. **Versioned API** (`/v1/...`) from day one; deprecation policy: 6-month notice.
5. **Standardized error responses** (RFC 7807 Problem Details).
6. **Rate limiting headers** on every response (`X-RateLimit-*`).
7. **OpenAPI 3.1 specification** maintained as source of truth.

---

## 9. Webhook & Event Requirements

| Event | Payload | Consumers |
|---|---|---|
| `signal.generated` | Signal ID, symbol, confidence, reasoning summary | UI (toast), Email queue, Push notification |
| `signal.approved` | Signal ID, user ID, timestamp | Execution engine, Audit log |
| `trade.filled` | Trade ID, fill price in ₹, qty, realized P&L | Portfolio updater, Notification service, Analytics |
| `trade.rejected` | Trade ID, rejection reason, risk notes | UI (alert), Agent logs |
| `price.alert` | Symbol, trigger type, price level in ₹ | Notification service |
| `agent.pipeline.failed` | Error details, agent name, symbol | Monitoring (Grafana Cloud alerts), UI (status indicator) |
| `portfolio.snapshot` | Daily equity, cash, market value, P&L in INR | Analytics, Email digest |

---

## 10. Data Retention & Privacy

| Data Category | Retention Period | Legal Basis | Deletion Procedure |
|---|---|---|---|
| User profile | Until account deletion + 30 days | Contract | Soft delete, then purge |
| Trade history | 8 years | SEBI mandated (legal obligation) | No deletion; anonymize after 8 years |
| Trade signals + reasoning | 3 years | Legitimate interest (product improvement) | User can request export before deletion |
| Agent logs | 90 days | Legitimate interest (debugging) | Automated cleanup |
| Price data (bars) | 5 years | Legitimate interest | Archive to cold storage after 1 year |
| WebSocket tick data | 7 days | Operational necessity | Automated cleanup |
| Backtest results | 1 year | Contract | User-initiated deletion |
| Email/Sentiment raw data | 30 days | Legitimate interest | Automated cleanup |

**DPDP (Digital Personal Data Protection Bill) / GDPR Specifics:**
- Users can export all data (portability) within 30 days.
- Users can request deletion (right to erasure) within 30 days, with exceptions for legally required retention (SEBI 8-year trade mandate).
- Automated decision-making: Users can request human review of any AI-generated trade signal.
- Privacy Policy and Terms of Service reviewed by Indian legal counsel before launch (DPDP compliant).
- Data localization: Primary database on Supabase (closest available region to India). Prefer Singapore/Mumbai region when available for DPDP readiness.

---

## 11. Product Metrics & OKRs

### Q1 (MVP Launch)
- **O1:** Acquire 500 beta users (India-focused) with 70% completing onboarding.
  - KR1.1: Onboarding completion rate >80%
  - KR1.2: Time-to-first-signal <5 minutes for 90% of users
  - KR1.3: Daily active users (DAU) >200 by end of Q1
- **O2:** Validate AI signal quality in paper trading on NSE stocks.
  - KR2.1: Directional accuracy >55% over 30 days on Nifty 50 constituents
  - KR2.2: Average confidence score correlates with win rate (R² >0.6)
  - KR2.3: Risk Manager rejection rate <15% (SEBI circuit + margin aware)
- **O3:** Ensure platform stability.
  - KR3.1: Uptime >99.5% during Indian market hours
  - KR3.2: AI pipeline failure rate <2%
  - KR3.3: P95 signal latency <45s

### Q2 (Pro Tier Launch)
- **O1:** Convert 10% of free users to Pro.
  - KR1.1: Monthly recurring revenue (MRR) >₹4,00,000
  - KR1.2: Churn rate <5% monthly
  - KR1.3: Net Promoter Score (NPS) >30
- **O2:** Launch live trading graduation on Indian brokers.
  - KR2.1: 100 users graduate to live trading via Zerodha/Upstox
  - KR2.2: Zero erroneous live executions on NSE/BSE
  - KR2.2: Average slippage <5 bps on NSE market orders

---

## 12. Accessibility Requirements (WCAG 2.1 AA)

- All charts have ARIA labels and data tables as alternatives.
- Color is never the sole indicator (use patterns + labels for buy/sell).
- Keyboard navigation for all trade actions (Tab order logical).
- Screen reader support for agent status updates (live regions).
- Focus indicators visible on all interactive elements.
- Reduced motion support for animations (respects `prefers-reduced-motion`).
- Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text.

---

## 13. Mobile Strategy

- **Phase 1 (MVP):** Responsive web app (PWA-capable) with mobile-optimized dashboard.
- **Phase 2 (Q2):** Native iOS/Android apps for alerts and quick-trade approval (Indian App Store / Play Store).
- **Phase 3 (Q3):** Full mobile charting and research reports.

**Mobile Web Requirements:**
- Touch-optimized chart interactions (pinch to zoom, pan).
- Bottom-sheet for trade confirmation (thumb-reachable).
- Push notifications via Web Push API (before native apps).
- Offline mode: view cached portfolio snapshot, queue trade approvals.

---

## 14. Integration Requirements

| Integration | Type | Data Direction | Critical? |
|---|---|---|---|
| Zerodha Kite Connect / Upstox API (Trading + Data) | REST + WebSocket | Bidirectional | Yes |
| Supabase (Auth + DB) | REST + Realtime | Bidirectional | Yes |
| Groq (LLM Primary) | REST | Outbound | Yes |
| NVIDIA NIM / OpenRouter (LLM Fallback) | REST | Outbound | Yes |
| MoneyControl RSS / Economic Times | REST | Outbound | No |
| Reddit API / Twitter India API | REST | Outbound | No |
| Screener.in / Tijori Finance | REST | Outbound | No |
| Resend / Indian SMTP (Email) | REST | Outbound | No |
| Cashfree (Payments) | REST + Webhooks | Bidirectional | No |

---

## 15. Risk & Assumptions

| Risk | Impact | Mitigation |
|---|---|---|
| SEBI regulates AI advisory more strictly | High | Maintain "informational only" positioning; human-in-the-loop default; Indian legal counsel review quarterly |
| Indian broker API downtime or breaking changes | High | Fallback to alternate broker (Upstox if Zerodha down, Angel One as tertiary); cache last-known prices; graceful degradation |
| LLM costs exceed projections | Medium | Groq primary (cheap, fast); aggressive caching; token budget enforcement per signal |
| AI signal accuracy below 50% on Indian stocks | High | Rigorous backtesting on NSE historical data before deployment; A/B test prompts; human feedback loop |
| User account compromise (API keys) | High | Server-side proxy only; keys never client-side; MFA mandatory for live trading |
| Market data latency during Indian market volatility | Medium | WebSocket with REST fallback; queue buffering; circuit breakers |
| DPDP compliance requirements | Medium | Data localization plan; privacy policy by Indian counsel; user data export feature |
| SEBI Feb 2025 algo circular (CIR/ISD/CFTP/C-2/2025) | **Critical** | Position as "Advisory + User-Initiated" (White Box); stay below 10 OPS; Generic Algo ID; legal counsel review before Aug 2025 |
| SEBI F&O lot size revisions (Oct 2024 + Jan 2026) | High | Oct 2024: ₹15-20L contract value. Jan 2026: Nifty 50 lot 65, Bank Nifty 30, Fin Nifty 60. Validate all lot multiples before order placement. |
| Union Budget 2024 tax changes (STCG 20%, LTCG 12.5%) | Medium | Update tax reporting in P&L tracking; export format for ITR-2/ITR-3 filing |

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
