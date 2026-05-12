# API & Data Sources Guide — Indian Market

## 1. Market Data & Broker

| Service | Purpose | Cost | Notes |
|---|---|---|---|
| **Zerodha Kite Connect** | Paper/live trading + real-time WS data | ₹2,000/mo (live API) | Largest Indian retail broker. Free sandbox for paper trading. NSE/BSE equities + F&O |
| **Upstox API** | Trading + real-time data | Free API; data charges extra | Good fallback broker. WebSocket tick-by-tick. |
| **Angel One Smart API** | Trading + research | Free | Third fallback. Good for mutual funds + equities. |
| **5paisa API** | Budget trading API | Low-cost plans | Backup broker for redundancy |
| **TrueData** | Real-time tick-by-tick NSE/BSE | ₹1,500–3,000/mo (**PAID — future upgrade**) | Low-latency feeds. Not needed for MVP (use broker WS instead) |
| **Global Data Feeds** | Historical + real-time NSE/BSE | ₹500–2,000/mo | NSE authorized data vendor. Good historical depth |
| **NSE Data & Analytics** | Official NSE historical + bhavcopy | Free (bhavcopy); paid for depth | Authoritative source for EOD and corporate actions |
| **NSE NOW / NSE Mobile** | Official NSE trading terminal data | Free (limited) | Real-time quotes, market depth |
| **BSE India API** | BSE-specific data | Free tier available | BSE announcements, corporate actions, historical |
| **NSE Corporate Filing API** | Quarterly results, annual reports | Free | Official company filings |
| **CMOTS / ProwessIQ** | Institutional-grade Indian data | Paid (institutional) | CMIE database; overkill for retail |

### SEBI-Authorized Data Vendors (NSE)

For algo trading compliance, using SEBI-authorized data vendors is preferred:

| Vendor | Authorization | Data Types |
|---|---|---|
| **TrueData** | NSE authorized | Tick-by-tick, historical, corporate actions |
| **Global Data Feeds** | NSE authorized | EOD, real-time, derivatives |
| **EODHD** | International | NSE EOD data via API |
| **NSE Data & Analytics** | Official NSE arm | All NSE data (authoritative) |

**Recommendation (Free-Tier Strategy):** Start with **Zerodha Kite Connect** (free sandbox) + **NSE Bhavcopy** (free EOD) + **MoneyControl RSS** (free news). These cover 100% of MVP data needs at ₹0 cost. Add TrueData later only if you need sub-second latency at scale.

---

## 2. News & Sentiment

| Service | Purpose | Cost |
|---|---|---|
| **Economic Times API** | Indian financial news | Paid (contact Times Group) |
| **MoneyControl RSS/API** | Market news, earnings, corporate actions | Free (RSS); paid for API |
| **Business Standard API** | Business news, macro | Paid |
| **Livemint API** | Financial + policy news | Paid |
| **SEBI SCORES / Circulars** | Regulatory news, enforcement | Free |
| **NSE / BSE Announcements** | Company filings, board meetings, dividends | Free |
| **Reddit API** | r/IndianStreetBets, r/DalalStreet sentiment | Free with rate limits |
| **Twitter/X API v2** | Indian social sentiment | $100/mo basic (global) |
| **TradingQ&A (Zerodha)** | Indian trader community sentiment | Free (scraping with care) |
| **Telegram (selected channels)** | Indian stock tips + sentiment | Free (channel monitoring) |

**Recommendation:** MoneyControl RSS + NSE/BSE announcements free tier for MVP. Add Economic Times for advanced news. Use Reddit + Twitter for sentiment.

---

## 3. Fundamental & Research Data

| Service | Purpose | Cost |
|---|---|---|
| **Screener.in** | Indian stock fundamentals, custom screens | Free (basic); Premium plans available |
| **Tijori Finance** | Indian financial data, bulk deals, block deals | Free tier |
| **Trendlyne** | Indian stock analysis, DVM scores, technicals | Freemium |
| **Morningstar India** | Mutual fund + equity research | Paid |
| **Capitaline** | Indian corporate database | Paid (institutional) |
| **NSE Corporate Filing** | Quarterly results, annual reports, shareholding | Free |
| **BSE Corporate Announcements** | Same as NSE for BSE-listed companies | Free |

**Recommendation:** Screener.in + Tijori + NSE Corporate Filing free tier for fundamentals. Add Trendlyne for technical + fundamental hybrid scores.

---

## 4. Technical Analysis

| Library | Indicators | Language |
|---|---|---|
| **TA-Lib** | 200+ (MACD, RSI, Bollinger, etc.) | C++ core, Python wrapper |
| **Pandas TA** | 130+ | Pure Python, easier install |
| **ta** | 40+ common | Lightweight Python |
| **nsepy** | NSE historical data + indicators | Python (NSE-specific) |
| **nsepython** | Unofficial NSE data library | Python |

**Recommendation:** `ta-lib` via Docker (C++ compilation is tricky). Use `nsepython` or `nsepy` for Indian market-specific data fetching. Fallback to `pandas-ta` for local dev.

---

## 5. LLM Costs Estimate (Free Tier Strategy)

| Provider | Model | Use Case | Free Tier Limit |
|---|---|---|---|
| **Groq** | Llama 3.3 70B | Fast agent tasks, data summarization | 30 req/min, 14.4K tokens/min |
| **Groq** | Mixtral 8x7B | Balanced reasoning | 30 req/min, 14.4K tokens/min |
| **NVIDIA NIM** | Llama 3.1 405B | Deep analysis, risk manager | 1,000 free credits/month |
| **NVIDIA NIM** | DeepSeek R1 | Complex reasoning, debate | 1,000 free credits/month |
| **NVIDIA NIM** | Mistral Large 2 | Fallback reasoning | 1,000 free credits/month |
| **OpenRouter** | DeepSeek R1 (free) | Last-resort fallback | Free tier available |
| **OpenRouter** | Llama 3.3 70B (free) | Last-resort fallback | Free tier available |

**Estimated Monthly AI Cost (per active user):**
- 10 signals/day × 8 agents × ~5K tokens = 400K tokens/day
- With Groq + NVIDIA NIM free tiers: **₹0/user/month** (within free limits)
- At scale (>500 users): May need NVIDIA NIM paid credits (~₹50-200/user/month)
- **Hard budget cap: ₹5 per signal** (enforced via token budget middleware)

---

## 6. Complete Integration Stack Summary

```
┌──────────────────────────────────────────────────────────────┐
│                     DATA SOURCES MAP                          │
├──────────────────┬────────────────────┬──────────────────────┤
│ Category         │ Primary            │ Fallback             │
├──────────────────┼────────────────────┼──────────────────────┤
│ Real-time Prices │ Zerodha Kite WS    │ Upstox WS (free)   │
│ Historical Data  │ NSE Bhavcopy       │ Global Data Feeds    │
│ Fundamentals     │ Screener.in        │ Tijori / NSE Corp    │
│ News             │ MoneyControl RSS   │ Economic Times / SEBI│
│ Sentiment        │ Reddit r/ISB       │ Twitter India / TQ&A │
│ Regulatory       │ SEBI Circulars     │ NSE / BSE Announce   │
│ Broker Execution │ Zerodha Kite       │ Upstox / Angel One   │
│ AI Inference     │ Groq (free)        │ NVIDIA NIM / OpenRouter (free) │
│ Index Benchmark  │ NIFTY 50           │ SENSEX / NIFTY 500   │
└──────────────────┴────────────────────┴──────────────────────┘
```

---

## 7. Rate Limits & Caching Strategy

| Source | Rate Limit | Cache TTL |
|---|---|---|
| Zerodha Kite (free/sandbox) | 3 orders/sec; 100 WS symbols | Price: 1s, Fundamentals: 1h |
| Upstox API (free) | 10 req/sec | Price: 1s |
| NSE Bhavcopy | Daily EOD only | 1 day |
| MoneyControl RSS | No hard limit (be polite) | 30 min |
| Reddit | 60 req/min | 15 min |
| Groq | 10K req/min | N/A (stateless) |
| Screener.in | Be polite; consider caching | 1h |

**Strategy:** Redis cache layer in Python service. Cache indicators for 1 minute (they don't change intra-tick). Cache news/sentiment for 15-30 minutes. Cache Screener.in fundamentals for 1 hour.

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
