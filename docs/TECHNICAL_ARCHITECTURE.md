# Technical Architecture Plan v2.0 — Indian Market

## 1. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript | SSR, SEO, real-time dashboard, React Server Components |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Rapid UI, accessible components, design token system |
| **Charts** | Lightweight-charts (TradingView) | Financial-grade, pixel-perfect, 100K+ candles at 60fps |
| **State (Client)** | Zustand + React Query (TanStack Query) | Server state + client state separation; optimistic updates |
| **State (Server)** | Redis (Upstash) + PostgreSQL | Session, cache, real-time pub/sub |
| **Backend (API)** | Next.js API Routes + Server Actions | Unified full-stack; co-location of API + UI |
| **Backend (AI)** | Python FastAPI microservice | TA-Lib, Pandas, heavy compute, LangGraph orchestration |
| **Database** | Supabase PostgreSQL + TimescaleDB extension | Real-time subscriptions, RLS, time-series optimization |
| **Auth** | Supabase Auth (@supabase/ssr) | Cookie-based, PKCE flow, MFA support + mobile OTP |
| **Broker API** | Zerodha Kite Connect / Upstox API / Angel One Smart API | Commission-free on delivery, paper trading, WebSocket tick data for NSE/BSE |
| **LLM Primary** | Groq (Llama 3.3 70B, Mixtral 8x7B) | Free tier: 30 req/min, <100ms inference, cost-effective |
| **LLM Secondary** | NVIDIA NIM (Llama 3.1 405B, DeepSeek R1, Mistral Large) | Free tier: 1,000 credits/month, deep analysis, complex reasoning |
| **LLM Fallback** | OpenRouter (DeepSeek R1, Llama 3.3 70B free tiers) | Free tier available, last-resort fallback |
| **AI Framework** | LangGraph (LangChain) | Agent orchestration, ReAct loops, persistent state |
| **Indicators** | TA-Lib + Pandas TA + nsepython | 200+ technical indicators; Indian market data helpers |
| **News/Sentiment** | Economic Times API + MoneyControl RSS + Reddit r/IndianStreetBets + Twitter India API | Multi-source sentiment for Indian markets |
| **Message Queue** | Inngest / BullMQ (Redis) | Agent pipeline job queue, scheduled tasks |
| **Event Bus** | Redis Pub/Sub + Inngest | Cross-service events, real-time notifications |
| **WebSocket (Prices)** | Broker WebSocket (Zerodha/Upstox) + Socket.io | Real-time NSE/BSE prices + agent status updates |
| **WebSocket (App)** | Socket.io (Next.js) | Internal real-time UI updates |
| **Email** | Resend (free: 3K emails/month) | Professional notifications, high deliverability |
| **Payments** | Cashfree (cashfree-pg SDK) | Tiered subscription plans in INR; UPI Autopay, cards, netbanking |
| **Hosting (Web)** | Vercel (free tier) | Edge deployment, auto-scaling, preview environments |
| **Hosting (AI)** | Render (free: 750 hrs/month) | Python containers, separate compute from frontend |
| **CDN** | Vercel Edge Network + Cloudflare (free) | Static assets, DDoS protection, WAF |
| **Monitoring** | Grafana Cloud (free: 10K metrics) + UptimeRobot (free) | Metrics, logs, uptime checks |
| **Error Tracking** | Sentry (free: 5K errors/month) | Real-time error tracking, source maps |
| **Secrets** | Environment variables (Vercel/Render dashboard) | Server-side only, no client exposure |
| **IaC** | Docker Compose (dev) + Render/Vercel config (prod) | Reproducible infrastructure |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐     │
│  │   Next.js    │  │  Dashboard   │  │  TradingView Charts          │     │
│  │   (Vercel)   │  │  (shadcn/ui) │  │  (lightweight-charts)        │     │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────────┘     │
└─────────┼────────────────┼───────────────────────┼───────────────────────┘
          │                │                       │
          ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE / CDN LAYER                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Vercel Edge Mumbai/Singapore (Static Assets, ISR, API Cache) + WAF  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER (Next.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐     │
│  │  Auth/Users  │  │  Trade API   │  │  Agent Orchestration API     │     │
│  │  (Supabase)  │  │  (Zerodha/   │  │  (LangGraph via Python)      │     │
│  │              │  │   Upstox)    │  │                              │     │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────────┘     │
│         │                 │                       │                         │
│         ▼                 ▼                       ▼                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Rate Limiting (@upstash/ratelimit) + Request Validation (Zod)     │   │
│  │  Auth Middleware (Supabase SSR) + Security Headers (CSP, HSTS)       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MESSAGE QUEUE / EVENT BUS                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Redis Pub/Sub (Real-time)  +  Inngest (Scheduled / Background)    │   │
│  │  Topics: price.updates, signal.generated, trade.filled, agent.log   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AI ENGINE (Python FastAPI)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐     │
│  │  LangGraph   │  │  TA-Lib      │  │  LLM Gateway                 │     │
│  │  Multi-Agent │  │  Indicators  │  │  Groq → NVIDIA NIM → OpenRouter│    │
│  │  Orchestrator│  │  (Pandas)    │  │  Token budget enforcement    │     │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────────┘     │
│         │                 │                       │                         │
│         ▼                 ▼                       ▼                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  State Checkpointing (PostgresSaver / RedisSaver)                    │   │
│  │  Streaming (astream_events v2) → Socket.io relay to frontend        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA & BROKER LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐     │
│  │  Supabase    │  │  Zerodha /   │  │  Economic Times /            │     │
│  │  PostgreSQL  │  │  Upstox API  │  │  MoneyControl / Reddit /     │     │
│  │  + Timescale │  │  (Trading)   │  │  Twitter India / SEBI        │     │
│  │              │  │  + Zerodha  │  │  Circulars                   │     │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Decision Records (ADRs)

### ADR-001: Why Next.js 15 (App Router)
- **Context:** Need SSR for SEO landing pages + dynamic dashboard with real-time data.
- **Decision:** Next.js 15 App Router with React Server Components.
- **Consequences:** (+) Unified backend/frontend, edge deployment, streaming. (-) Vendor lock-in to Vercel for optimal performance.
- **Alternatives:** Remix (good, smaller ecosystem), SvelteKit (less mature for enterprise).

### ADR-002: Why LangGraph (not CrewAI / AutoGen)
- **Context:** Multi-agent trading requires cyclic workflows, state persistence, human-in-the-loop.
- **Decision:** LangGraph with PostgresSaver checkpointing.
- **Consequences:** (+) Deterministic state machine, resume after crash, streaming. (-) Steeper learning curve, requires careful state schema design.
- **Alternatives:** CrewAI (simpler, no persistence), AutoGen (conversational, less control).

### ADR-003: Why Supabase PostgreSQL + TimescaleDB
- **Context:** Need relational data + real-time subscriptions + time-series price data for NSE/BSE.
- **Decision:** PostgreSQL with TimescaleDB extension on Supabase (consider Mumbai region for DPDP).
- **Consequences:** (+) Single database, hypertables for price data, RLS, realtime. (-) TimescaleDB adds complexity; careful partitioning required.
- **Alternatives:** MongoDB (no time-series), separate InfluxDB (more ops overhead).

### ADR-004: Why Zerodha Kite Connect (Primary Broker)
- **Context:** Indian equities + F&O focus, need paper + live trading, clean API, largest retail ecosystem.
- **Decision:** Zerodha Kite Connect primary; Upstox API fallback; Angel One Smart API tertiary.
- **Consequences:** (+) Free sandbox (limited), WebSocket tick data, massive ecosystem. (-) Sandbox is limited; no full paper trading. May need custom paper engine. Outages require fallback.

### ADR-005: Why Free-Tier LLM Strategy (Groq → NVIDIA NIM → OpenRouter)
- **Context:** Need fast, cheap inference for 8 agents × multiple signals daily. Budget constraint: ₹0 LLM cost in MVP phase.
- **Decision:** Groq Llama 3.3 70B primary (free: 30 req/min); NVIDIA NIM (free: 1,000 credits/month) for deep reasoning; OpenRouter free tiers as last-resort fallback.
- **Consequences:** (+) ₹0 cost in free tier, <100ms Groq inference, access to DeepSeek R1 / Llama 405B via NIM. (-) Rate limits (30 req/min Groq); free tier exhaustion at scale (>500 users); need graceful degradation when limits hit.

### ADR-006: Why Separate Python AI Service
- **Context:** TA-Lib is C++ based, LangGraph is Python-native, heavy compute, nsepython for Indian data.
- **Decision:** Python FastAPI microservice decoupled from Next.js frontend.
- **Consequences:** (+) Independent scaling, Python ecosystem, isolation. (-) Network latency between services (~20-50ms), serialization overhead.
- **Alternatives:** Edge functions (too limited), monolith (hard to scale AI separately).

### ADR-007: Data Localization Consideration (India)
- **Context:** Digital Personal Data Protection Bill (DPDP) may require Indian user data to be stored/processed in India.
- **Decision:** Primary database on Supabase (free tier: 500MB, closest region to India). Consider Supabase Mumbai region when available.
- **Consequences:** (+) DPDP compliance readiness. (-) Slightly higher latency for non-Indian users (not a concern for India-only product).

---

## 4. Data Pipeline & ETL Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA PIPELINE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Raw Ingestion → Normalization → Feature Store → Agent Inputs → Signals   │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │ Broker WS   │ → │ Canonical   │ → │ Indicator   │ → │ LangGraph   │   │
│  │ MoneyCtrl   │   │ Schema      │   │ Cache       │   │ State       │   │
│  │ Reddit/X    │   │ (JSON)      │   │ (Redis)     │   │ (TypedDict) │   │
│  │ SEBI Circulars│   │             │   │             │   │             │   │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   │
│                                                                             │
│  Raw Storage (Supabase Storage) → Cleaned DB → Materialized Views → Analytics │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Quality Checks:**
- **Anomaly Detection:** Price spikes >5% in 1 min flagged; stale data >30s rejected.
- **Schema Validation:** All ingested data validated against JSON Schema before storage.
- **Deduplication:** Idempotency keys on all price bars; UPSERT semantics.
- **Backfill:** Automatic backfill on WebSocket gap detection (broker REST fallback + NSE Bhavcopy).

---

## 5. Caching Architecture (L1 / L2 / L3)

| Layer | Technology | Data | TTL | Hit Rate Target |
|---|---|---|---|---|
| **L1** | In-memory (Node.js LRU) | Session state, feature flags | 5 min | 80% |
| **L2** | Redis (Upstash) | Price bars, indicators, news sentiment | 1-15 min | 90% |
| **L3** | Vercel Edge + Cloudflare | Static assets, API responses (GET) | 1-24h | 95% |

**Cache Invalidation Strategy:**
- Price data: Time-based expiry (1s for NSE ticks, 1m for bars).
- Indicators: Compute-once per bar; cache key = `indicator:{symbol}:{timeframe}:{bar_time}`.
- News/Sentiment: Background refresh every 15 min; stale-while-revalidate.
- Agent signals: Immutable after generation; no invalidation needed.
- Screener.in fundamentals: Cache 1h.

---

## 6. WebSocket Architecture

### 6.1 Price Data WebSocket (Broker — Zerodha/Upstox)
```
Zerodha Kite WebSocket Server (co-located in Mumbai)
  → Vercel Edge Mumbai / Next.js API (auth validation)
  → Redis Pub/Sub (broadcast to all subscribers)
  → Socket.io rooms (per-symbol: price:RELIANCE.NS)
  → Client Dashboard (Zustand store update)
```

**Scaling:**
- Use Socket.io Redis adapter for multi-node broadcast.
- Connection limit: 10K per node; auto-scale on Vercel.
- Reconnection: Exponential backoff (1s, 2s, 4s, 8s, max 30s).
- Heartbeat: Ping/pong every 30s; timeout 10s.

### 6.2 Agent Status WebSocket (Socket.io)
```
LangGraph (Python) → astream_events() → REST push → Next.js API
  → Redis Pub/Sub (agent.status channel)
  → Socket.io (user-specific room)
  → Client UI (agent progress animation)
```

---

## 7. Microservices Communication

| Service | Protocol | Pattern | Auth |
|---|---|---|---|
| Next.js ↔ Python AI | HTTP/REST + SSE | Request/response + streaming | Service-to-service JWT |
| Next.js ↔ Supabase | HTTP + WebSocket | CRUD + realtime | Supabase anon/service key |
| Next.js ↔ Broker (Zerodha/Upstox) | HTTP + WebSocket | Broker proxy | Server-side encrypted keys |
| Python AI ↔ Broker | WebSocket + REST | Data ingestion | API key (env var) |
| Python AI ↔ Groq/NVIDIA NIM/OpenRouter | HTTP/REST | LLM inference | API key (Vault / env var) |
| All → Redis | TCP | Pub/Sub + Cache + Queue | Redis AUTH |
| All → Inngest | HTTP | Background jobs | Inngest signing key |

**Internal API Contract:**
- REST: JSON, OpenAPI 3.1 spec, Zod validation on both sides.
- Streaming: Server-Sent Events (SSE) for agent progress; WebSocket for real-time prices.
- Idempotency: `Idempotency-Key` header on all mutating requests.

---

## 8. Database Architecture

### 8.1 Connection Pooling
- **Supabase:** PgBouncer built-in (transaction mode).
- **Custom pool size:** 20 connections per Next.js instance; 50 for Python AI service.
- **Read replicas:** Enable Supabase read replica for analytics queries; routing logic in API layer.

### 8.2 Partitioning Strategy
- **Price bars (TimescaleDB):** Hypertable partitioned by `time` (1-day chunks).
- **Agent logs:** Partitioned by `created_at` (1-month chunks, auto-drop after 90 days).
- **Trade signals:** Partitioned by `created_at` (1-year chunks, archive after 3 years).

### 8.3 Materialized Views (for Reporting)
- `mv_daily_portfolio`: Aggregated P&L per user per day; refresh every 15 min.
- `mv_agent_performance`: Win rate per agent per week; refresh nightly.
- `mv_signal_accuracy`: Predicted vs actual per signal type; refresh daily.

---

## 9. Scaling Triggers & Auto-Scaling

| Metric | Threshold | Action |
|---|---|---|
| CPU (Web) >70% | 2 min | Scale Vercel functions |
| CPU (AI) >80% | 1 min | Scale Render containers (upgrade from free) |
| WebSocket connections >8K/node | Immediate | Spawn new node |
| Redis memory >80% | 5 min | Upgrade plan / evict LRU |
| DB connections >80% pool | Immediate | Enable read replica, throttle |
| AI queue depth >100 | 2 min | Scale worker containers |
| Signal latency p95 >45s | Immediate | Alert + scale AI service |

---

## 10. Monitoring & Observability Stack

| Layer | Tool | Purpose |
|---|---|---|
| **Metrics** | Grafana Cloud (free: 10K series, 14-day retention) | Custom business metrics (signals/min, trades/min, P&L, agent latency) |
| **Traces** | OpenTelemetry + Grafana Tempo (free: 50GB/month) | Distributed trace across Next.js → Python → Broker → LLM |
| **Logs** | Grafana Loki (free: 50GB/month) | Structured JSON logs, searchable |
| **Errors** | Sentry (free: 5K errors/month) | Real-time error tracking, source maps, release tracking |
| **Uptime** | UptimeRobot (free: 50 monitors, 5-min checks) | Ping API health checks every 5min |
| **Alerting** | Grafana Cloud alerts + UptimeRobot notifications | Email/Slack alerts on threshold breach |

**Key SLOs:**
- API availability: 99.9% during Indian market hours (9:15-15:30 IST).
- AI pipeline success rate: >99%.
- P95 signal latency: <30s.
- P95 trade execution: <2s.
- Error rate: <0.1%.

---

## 11. Security Architecture

### 11.1 Secrets Management
- **HashiCorp Vault** (or AWS Secrets Manager) for all API keys.
- **Dynamic credentials:** Database credentials rotated every 24h.
- **Broker keys:** Encrypted at rest (AES-256-GCM); decrypted only in server memory at runtime.
- **LLM keys:** Stored in Vault; injected as env vars; never logged.

### 11.2 Network Security
- **TLS 1.3** everywhere; HSTS header (max-age 31536000).
- **Cloudflare WAF:** Rate limiting, bot detection, IP reputation.
- **Vercel Firewall:** Geo-blocking if needed; IP allowlists for admin APIs.
- **VPC:** Python AI service in private subnet; no public IP except via ALB.

### 11.3 API Security
- **Rate Limiting:**
  - Auth endpoints: 5 req/min per IP.
  - Trade endpoints: 10 req/min per user.
  - General API: 60 req/min per user.
  - AI signal generation: 20 req/hour per user (Free), unlimited (Pro).
- **Input Validation:** Zod schemas on all inputs; strict type checking.
- **CSP Headers:** Strict Content-Security-Policy to prevent XSS.
- **CORS:** Restricted to known origins only.

---

## 12. CI/CD Pipeline

```
GitHub Push
  → GitHub Actions
    → Lint (ESLint, Ruff, Prettier)
    → Unit Tests (Jest, Vitest, pytest)
    → Integration Tests (MSW, testcontainers)
    → Security Scan (Snyk, OWASP ZAP)
    → Build + Type Check (tsc, next build)
    → Preview Deployment (Vercel)
    → E2E Tests (Playwright on preview)
    → Visual Regression (Chromatic)
    → Merge to main
      → Staging Deployment (Vercel + Render staging)
      → Smoke Tests (k6)
      → Blue-Green Deploy (AI service)
      → Production Deployment (manual gate for AI service)
```

**Deployment Strategies:**
- **Frontend (Vercel):** Automatic preview per PR; production on merge.
- **AI Service (Render):** Auto-deploy on git push; health check before traffic shift.
- **Database Migrations:** Expand-contract pattern; backward-compatible changes.

---

## 13. File Structure (Target)

```
tradmind-ai/
├── apps/
│   ├── web/                          # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router (routes, layouts, loading)
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn components
│   │   │   │   ├── charts/           # TradingView wrappers
│   │   │   │   ├── agents/           # Agent status displays
│   │   │   │   └── trades/           # Order forms, history
│   │   │   ├── lib/
│   │   │   │   ├── supabase/         # Auth, DB client
│   │   │   │   ├── broker/           # Zerodha/Upstox proxy
│   │   │   │   └── websocket/        # Socket.io client
│   │   │   ├── hooks/                # React Query hooks, Zustand stores
│   │   │   └── types/                # Shared TypeScript schemas
│   │   ├── public/
│   │   └── tests/                    # E2E, integration
│   └── ai-engine/                    # Python FastAPI service
│       ├── src/
│       │   ├── agents/               # LangGraph agent definitions
│       │   ├── tools/                # API wrappers (Screener.in, Economic Times, NSE)
│       │   ├── indicators/           # TA-Lib + nsepython wrappers
│       │   ├── pipelines/            # LangGraph graph definitions
│       │   ├── models/               # Pydantic schemas
│       │   ├── services/             # Business logic
│       │   ├── api/                  # FastAPI routers
│       │   └── core/                 # Config, logging, exceptions
│       ├── tests/                    # pytest suite
│       ├── Dockerfile
│       └── pyproject.toml
├── packages/
│   ├── shared-types/                 # Zod + Pydantic shared schemas
│   ├── ui/                           # shadcn component library (if extracted)
│   └── ts-config/                    # Shared TypeScript config
├── supabase/
│   ├── migrations/                   # SQL migrations (numbered)
│   ├── functions/                    # Edge functions (if needed)
│   └── seed.sql                      # Development seed data
├── infra/
│   ├── terraform/                    # IaC definitions
│   └── github/                       # GitHub Actions workflows
├── docker-compose.yml                # Local development stack
└── README.md
```

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
