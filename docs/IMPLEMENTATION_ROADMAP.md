# Implementation Roadmap v2.0 — Indian Market

## Overview

This roadmap covers 4 quarters (12 months) from MVP to post-launch scale for the Indian market. Each phase has defined OKRs, resource requirements, budget estimates (INR), dependency graphs, risk registers, and go/no-go criteria.

---

## Q1: Foundation & MVP (Months 1-3)

### Objectives & Key Results
- **O1:** Launch MVP with core trading + AI signal generation for Indian markets
  - KR1.1: 500 beta users (India-focused) with 80% onboarding completion
  - KR1.2: Time-to-first-signal <5 minutes for 90% of users
  - KR1.3: DAU >200 by end of Q1
- **O2:** Validate AI signal quality in paper trading on NSE stocks
  - KR2.1: Directional accuracy >55% over 30 days on Nifty 50 constituents
  - KR2.2: Average confidence score correlates with win rate (R² >0.6)
  - KR2.3: Risk Manager rejection rate <15% (SEBI circuit + margin aware)
- **O3:** Ensure platform stability
  - KR3.1: Uptime >99.5% during Indian market hours (9:15–15:30 IST)
  - KR3.2: AI pipeline failure rate <2%
  - KR3.3: P95 signal latency <45s

### Deliverables
- [ ] Next.js 15 + Supabase scaffold with auth (email + Google OAuth + mobile OTP)
- [ ] Zerodha Kite Connect integration (paper trading only)
- [ ] Real-time NSE price dashboard with lightweight-charts
- [ ] Database schema v2.0 (Indian market edition) + RLS policies + migrations
- [ ] Basic watchlist and portfolio tracking (INR)
- [ ] Single-agent AI (Technical Analyst) with signal generation for NSE stocks
- [ ] Signal history + basic explainability (reasoning text)
- [ ] Risk profile quiz + onboarding flow (Indian context)
- [ ] Basic alerts (in-app + email + push notifications)
- [ ] Legal pages (Terms, Privacy, Disclaimers in English + Hindi)
- [ ] Security headers + rate limiting + input validation
- [ ] SEBI Feb 2025 algo compliance implementation:
  - [ ] Generic Algo ID tagging on all broker API orders
  - [ ] System throttling below 10 OPS per user per exchange
  - [ ] White Box explainability trail per signal
  - [ ] Static IP + daily 2FA documentation for users
  - [ ] Legal counsel review of "Advisory + User-Initiated" classification
- [ ] F&O lot size update for SEBI Oct 2024 changes (₹15-20L contract value)
- [ ] SEBI compliance documentation

### Team Composition
| Role | FTE | Notes |
|---|---|---|
| Full-Stack Lead (Next.js/TypeScript) | 1.0 | Also handles frontend architecture |
| Backend/AI Engineer (Python/FastAPI) | 1.0 | LangGraph, TA-Lib, nsepython, agent pipeline |
| Product/Design (UI/UX) | 0.5 | Part-time contractor |
| DevOps/SRE | 0.25 | Part-time; infrastructure setup |
| Legal/Compliance (India) | 0.1 | SEBI compliance review, Terms/Privacy |

### Budget Estimate (₹0 Free-Tier Strategy)
| Service | Free Tier Limit | Monthly Cost |
|---|---|---|
| Vercel (Frontend hosting) | Unlimited deploys, 100GB bandwidth | ₹0 |
| Render (AI Engine hosting) | 750 hrs/month free, 512MB RAM | ₹0 |
| Supabase (Database + Auth) | 500MB DB, 50K users, 1GB storage | ₹0 |
| Groq (Primary LLM) | 30 req/min, 14.4K tokens/min | ₹0 |
| NVIDIA NIM (Secondary LLM) | 1,000 credits/month | ₹0 |
| OpenRouter (Fallback LLM) | Free-tier models available | ₹0 |
| Upstash Redis | 10K commands/day, 256MB | ₹0 |
| Resend (Email) | 3,000 emails/month | ₹0 |
| Sentry (Error tracking) | 5K errors/month | ₹0 |
| UptimeRobot (Monitoring) | 50 monitors, 5-min checks | ₹0 |
| Zerodha Kite API (Broker) | Free sandbox/paper trading | ₹0 |
| Cashfree (Payments) | Per-transaction only (no monthly fee) | ₹0 |
| GitHub Actions (CI/CD) | 2,000 min/month | ₹0 |
| Inngest (Background jobs) | 25K events/month | ₹0 |
| PostHog (Analytics) | 1M events/month | ₹0 |
| **Total Q1** | **All free tiers** | **₹0/month** |

### Dependencies
```
Database schema → Auth system → Zerodha Kite integration → Dashboard
     ↓                ↓              ↓                  ↓
  AI pipeline ← TA-Lib setup ← Python service ← API contracts
     ↓                ↓              ↓                  ↓
  NSE data ← nsepython ← bhavcopy downloader
```

### Risk Register
| Risk | Impact | Mitigation |
|---|---|---|
| Zerodha Kite API changes/breaking | High | Use official SDK; monitor changelog; Upstox fallback ready |
| TA-Lib compilation issues | Medium | Docker-based local dev; CI build tests |
| Signal accuracy <50% on Indian stocks | High | Extensive backtesting on NSE historical data before launch; conservative confidence thresholds |
| User onboarding drop-off | Medium | A/B test onboarding flows; simplify to 3 steps max; mobile OTP mandatory |
| SEBI regulatory uncertainty | Medium | Maintain "informational only" positioning; legal counsel on retainer |

### Go/No-Go Criteria (End of Q1)
- [ ] 100+ successful paper trades with no system errors on Zerodha Kite sandbox
- [ ] Signal accuracy >50% on 30-day Nifty 50 backtest
- [ ] Security scan score >90 (Snyk)
- [ ] Indian legal counsel sign-off on Terms + Privacy (DPDP compliant)
- [ ] <3% AI pipeline failure rate in last 2 weeks
- [ ] Mumbai-region latency test passed (<500ms p95 for NSE prices)

---

## Q2: Multi-Agent & Monetization (Months 4-6)

### Objectives & Key Results
- **O1:** Launch full 8-agent multi-agent system
  - KR1.1: All 8 agents operational with <30s pipeline latency
  - KR1.2: Bull/Bear debate visible in UI with streaming progress
  - KR1.3: Post-signal accuracy tracking per agent
- **O2:** Convert free users to Pro tier
  - KR2.1: MRR >₹4,00,000
  - KR2.2: Free-to-Pro conversion rate >10%
  - KR2.3: Churn rate <5% monthly
- **O3:** Enable live trading graduation on Indian brokers
  - KR3.1: 100 users graduate to live trading via Zerodha/Upstox
  - KR3.2: Zero erroneous live executions on NSE/BSE
  - KR3.3: Average slippage <5 bps on NSE market orders

### Deliverables
- [ ] LangGraph multi-agent orchestration (all 8 agents)
- [ ] Bull/Bear debate pipeline with streaming UI
- [ ] Risk Manager validation gate with SEBI circuit + margin checks
- [ ] Research memo generation (HTML + PDF in INR)
- [ ] Paper-to-live graduation flow (30-day gate + PAN KYC)
- [ ] Cashfree payment integration (Free/Pro/Fund tiers in INR; UPI Autopay for recurring)
- [ ] Community leaderboard (anonymized strategies)
- [ ] Backtesting module (1-year NSE/BSE history, <60s)
- [ ] Performance analytics page (Sharpe, drawdown, win rate in INR)

### Team Composition
| Role | FTE | Notes |
|---|---|---|
| Full-Stack Lead | 1.0 | Payment integration, leaderboard |
| Backend/AI Engineer | 1.0 | Multi-agent pipeline optimization |
| Product/Design | 0.5 | Pro tier UX, graduation flow |
| Growth/Marketing | 0.5 | Content, waitlist, launch campaign |
| DevOps/SRE | 0.5 | Scaling, monitoring, alerting |
| Compliance/Legal (India) | 0.1 | SEBI review, payment compliance |

### Budget Estimate (INR) — Scaling Beyond Free Tiers
| Category | Cost |
|---|---|
| Infrastructure (Supabase Pro if >500MB DB) | ₹2,100/month ($25) |
| AI LLM costs (still free if <500 users) | ₹0 |
| Data APIs (Zerodha Kite free; no TrueData needed) | ₹0 |
| Payment gateway fees (Cashfree: 1.95% per txn) | Pay-per-use |
| Tools (Sentry/UptimeRobot/Resend free tiers) | ₹0 |
| Marketing (organic content, social media) | ₹0 |
| **Total Q2** | **₹0–₹2,100/month** |

### Dependencies
```
Q1 MVP → Multi-agent pipeline → Streaming UI → Live trading graduation
              ↓                      ↓                ↓
        Prompt registry      Research memos    Payment (Cashfree)
```

### Risk Register
| Risk | Impact | Mitigation |
|---|---|---|
| Multi-agent latency >30s | High | Optimize parallel execution; reduce model sizes where possible |
| Live trading bugs | Critical | Extensive sandbox testing; kill switch; circuit breaker |
| Low conversion to Pro | High | A/B test pricing; add exclusive features (backtests, API) |
| SEBI regulatory changes | Medium | Monitor SEBI announcements; legal counsel on retainer |
| GST compliance on subscriptions | Medium | Register for GST before payment launch; invoice automation |

### Go/No-Go Criteria (End of Q2)
- [ ] Multi-agent pipeline P95 latency <30s
- [ ] 100+ live trades executed with 100% accuracy (no system errors)
- [ ] Pro tier generates >₹3,00,000 MRR
- [ ] NPS score >30
- [ ] All legal disclaimers reviewed and updated post-live-launch

---

## Q3: Scale & Expand Asset Classes (Months 7-9)

### Objectives & Key Results
- **O1:** Scale to 5,000 active users
  - KR1.1: DAU >1,500
  - KR1.2: API availability >99.9%
  - KR1.3: Signal generation <20s P95
- **O2:** Expand asset classes for Indian markets
  - KR2.1: F&O options chain support (via broker OMS — Sensibull-style analytics)
  - KR2.2: Commodity / currency derivatives (MCX, NSE CD)
  - KR2.3: Mutual fund research + SIP recommendations (via AMFI data)
- **O3:** Advanced analytics & institutional features
  - KR3.1: Performance attribution (Brinson model)
  - KR3.2: Tax-loss harvesting suggestions (STCG/LTCG/STT-aware)
  - KR3.3: API access for Fund tier users

### Deliverables
- [ ] Auto-scaling infrastructure (Kubernetes consideration)
- [ ] Read replicas + query optimization
- [ ] F&O options chain connector (broker OMS integration)
- [ ] MCX commodity data + basic analytics
- [ ] Mutual fund data (AMFI) + SIP AI recommendations
- [ ] Advanced portfolio analytics (alpha/beta decomposition vs NIFTY 50)
- [ ] Tax lot optimization (FIFO/LIFO/STCG/LTCG/STT-aware)
- [ ] REST API for Fund tier (rate-limited, documented)
- [ ] Mobile app (React Native) — MVP
- [ ] SOC 2 Type I audit initiated

### Team Composition
| Role | FTE | Notes |
|---|---|---|
| Full-Stack Lead | 1.0 | API development, mobile |
| Backend/AI Engineer | 1.5 | F&O connectors, scaling |
| Mobile Engineer | 1.0 | React Native |
| Product/Design | 1.0 | Full-time |
| Growth/Marketing | 1.0 | Full-time |
| DevOps/SRE | 1.0 | Full-time |
| Compliance/Operations | 0.5 | Part-time; SOC 2 prep |

### Budget Estimate (INR)
| Category | Cost |
|---|---|
| Infrastructure | ₹3,00,000/month |
| AI LLM costs (5,000 users) | ₹12,00,000/month |
| Data APIs (multi-source) | ₹1,50,000/month |
| Tools + Monitoring | ₹1,20,000/month |
| Team salaries (contractors + hires) | ₹32,00,000/month |
| Marketing | ₹6,00,000/month |
| **Total Q3** | **~₹45,00,000/month** |

### Dependencies
```
Q2 Pro launch → Scaling infrastructure → F&O connectors → Mobile app
                    ↓                        ↓                  ↓
              Database optimization      MCX/AMFI data      SOC 2 prep
```

### Risk Register
| Risk | Impact | Mitigation |
|---|---|---|
| Infrastructure costs balloon | High | Cost monitoring dashboards; optimize caching; negotiate volume discounts |
| F&O regulatory uncertainty | Medium | Start with equity options only; avoid exotic derivatives; legal review per SEBI circular |
| Mobile app delays | Medium | PWA first; native only after PWA proves demand |
| Key person dependency | High | Documentation; cross-training; hire #2 AI engineer |

---

## Q4: Enterprise & IPO Readiness (Months 10-12)

### Objectives & Key Results
- **O1:** Launch enterprise/Fund tier for Indian PMS/AIF
  - KR1.1: 50 Fund-tier customers (Indian PMS / AIF / family offices)
  - KR1.2: API usage >10K requests/day
  - KR1.3: White-label pilot with 1 SEBI-registered RIA partner
- **O2:** Achieve profitability
  - KR2.1: MRR >₹40,00,000
  - KR2.2: Gross margin >60%
  - KR2.3: CAC payback <6 months
- **O3:** Prepare for next funding round or profitability
  - KR3.1: SOC 2 Type II certification
  - KR3.2: Complete financial audit
  - KR3.3: Data room ready for Series A

### Deliverables
- [ ] White-label platform (branded for Indian RIAs/PMS)
- [ ] Advanced risk management (VaR, stress testing)
- [ ] Multi-broker support (Angel One, ICICI Direct, 5paisa)
- [ ] Options execution (level 2 strategies)
- [ ] Custom agent builder (user-defined prompt templates)
- [ ] Advanced backtesting (walk-forward, Monte Carlo on NSE data)
- [ ] SOC 2 Type II certification
- [ ] DPDP full compliance audit
- [ ] Series A pitch deck + data room

### Team Composition
| Role | FTE |
|---|---|
| Engineering Team | 4.0 |
| AI/ML Team | 2.0 |
| Product | 1.5 |
| Design | 1.0 |
| Growth/Sales | 2.0 |
| Compliance/Legal | 1.0 |
| DevOps/SRE | 1.5 |
| **Total** | **13.0** |

### Budget Estimate (INR)
| Category | Cost |
|---|---|
| Team (13 FTE @ avg ₹6.5L/mo) | ₹84,50,000/month |
| Infrastructure | ₹6,00,000/month |
| AI LLM + Data APIs | ₹20,00,000/month |
| Tools + Compliance | ₹2,40,000/month |
| Marketing + Sales | ₹12,00,000/month |
| **Total Q4** | **~₹1.25 Cr/month** |

---

## Technical Debt Tracking

| Item | Created | Severity | Remediation Target | Effort |
|---|---|---|---|---|
| Single-broker dependency (Zerodha Kite) | Q1 | High | Q3 | 2 weeks |
| No read replicas | Q1 | Medium | Q2 | 3 days |
| Agent prompts not versioned | Q1 | Medium | Q2 | 1 week |
| No automated DB cleanup | Q1 | Low | Q2 | 2 days |
| Frontend not PWA-ready | Q1 | Medium | Q2 | 1 week |
| No chaos engineering | Q2 | Medium | Q3 | 2 weeks |
| Manual scaling | Q2 | High | Q3 | 2 weeks |
| Missing API documentation | Q2 | Medium | Q2 | 1 week |
| No load testing | Q2 | High | Q3 | 1 week |
| F&O not in separate infra | Q3 | Medium | Q3 | 1 week |

---

## Engineering Quality Gates (Per Phase)

| Gate | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| **Test Coverage** | >60% | >75% | >80% | >85% |
| **E2E Tests Passing** | Core flows | All flows | + Mobile | + API |
| **Performance Budget** | Lighthouse >80 | Lighthouse >85 | Lighthouse >90 | Lighthouse >92 |
| **Security Scan** | Snyk >90 | Snyk >95 | Pentest passed | SOC 2 ready |
| **AI Pipeline Failure** | <2% | <1% | <0.5% | <0.1% |
| **Signal Latency P95** | <45s | <30s | <20s | <15s |
| **Uptime (market hours)** | >99.5% | >99.7% | >99.9% | >99.95% |

---

## Rollback Procedures

### Database Migration Rollback
1. Check `migrations/` for `down` script.
2. Run `supabase db reset` to staging first.
3. If staging OK, run down migration on production during maintenance window.
4. Verify app functionality with smoke tests.
5. Alert users if rollback affects visible data.

### AI Service Rollback
1. Render maintains last 5 deployments with instant rollback.
2. Click "Rollback" in dashboard.
3. Verify health check passes.
4. Monitor error rates for 30 min.

### Feature Flag Rollback
1. Toggle feature flag in `system_settings` table.
2. Change propagates to all nodes within 30s (Redis pub/sub).
3. No deployment needed.

---

## Unit Economics Projections (INR)

| Metric | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| Users | 500 | 1,500 | 5,000 | 12,000 |
| Free % | 100% | 70% | 60% | 50% |
| Pro % | 0% | 25% | 30% | 35% |
| Fund % | 0% | 5% | 10% | 15% |
| MRR | ₹0 | ₹4,00,000 | ₹20,00,000 | ₹40,00,000+ |
| CAC | ₹0 | ₹1,200 | ₹1,600 | ₹2,000 |
| LTV (Pro) | ₹0 | ₹14,400 | ₹28,800 | ₹43,200 |
| LTV/CAC | N/A | 12:1 | 18:1 | 21:1 |
| Gross Margin | N/A | 60% | 65% | 70% |

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
