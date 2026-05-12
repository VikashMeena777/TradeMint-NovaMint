# 🧠 TradeMind AI

**AI-powered trade signal generator for Indian stock markets (NSE/BSE)**

An 8-agent AI pipeline that analyzes stocks using technical indicators, fundamental data, sentiment, and news — then debates bull vs bear cases before generating actionable BUY/SELL/HOLD signals with entry, stop-loss, and target prices.

---

## ✨ Features

- **8-Agent AI Pipeline** — Fundamental, Technical, Sentiment, News analysts → Bull/Bear debate → Trader → Risk Manager
- **3 Free LLM Providers** — Groq (fastest) → NVIDIA NIM → OpenRouter with automatic fallback
- **36+ Technical Indicators** — RSI, MACD, Bollinger, ADX, Supertrend, Stochastic, VWAP, Pivot Points
- **Live Market Data** — Real-time NSE/BSE prices via Yahoo Finance (free, no API key)
- **TradingView Charts** — Interactive candlestick + volume charts
- **Signal Detail Pages** — Full AI reasoning, bull/bear debate, risk assessment
- **Watchlist** — Track stocks with live prices and one-click signal generation
- **Risk Profiling** — 5-step onboarding quiz (experience, capital, risk tolerance)
- **SEBI Compliant** — Disclaimers, no guaranteed returns, educational purpose
- **Zero Cost** — All services use free tiers (Groq, NVIDIA, OpenRouter, Supabase, Vercel, Render)

---

## 🏗️ Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│   Next.js Frontend  │────▶│   Python FastAPI Engine   │
│   (Vercel - Free)   │     │   (Render - Free)        │
│                     │     │                          │
│ • Dashboard         │     │ • Market Data (yfinance) │
│ • Signals + Charts  │     │ • 36 Indicators (ta)     │
│ • Watchlist         │     │ • 8 AI Agents            │
│ • Onboarding        │     │ • LLM Gateway            │
│ • Auth (Supabase)   │     │   Groq → NVIDIA → OR    │
└─────────────────────┘     └──────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐     ┌──────────────────────────┐
│  Supabase (Mumbai)  │     │   Yahoo Finance API      │
│  • 6 Tables + RLS   │     │   • OHLCV Data (Free)    │
│  • Auth + Profiles  │     │   • NSE/BSE Indices      │
└─────────────────────┘     └──────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account (free)
- At least one LLM API key (all free):
  - [Groq](https://console.groq.com) — Recommended, fastest
  - [NVIDIA NIM](https://build.nvidia.com) — 1000 free credits
  - [OpenRouter](https://openrouter.ai) — Free models available

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/AI-TradeMind.git
cd AI-TradeMind

# Frontend
cd web
npm install

# AI Engine
cd ../ai-engine
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Frontend — copy and fill in Supabase credentials
cp web/.env.example web/.env.local

# AI Engine — add at least one LLM API key
cp ai-engine/.env.example ai-engine/.env
```

### 3. Run

```bash
# Terminal 1 — AI Engine
cd ai-engine
.\venv\Scripts\python.exe main.py
# → http://localhost:8000

# Terminal 2 — Frontend
cd web
npm run dev
# → http://localhost:3000
```

### 4. Generate Your First Signal

1. Open http://localhost:3000/dashboard
2. Click **"Generate Signal"**
3. Enter a stock symbol (e.g. `RELIANCE`, `TCS`, `HDFCBANK`)
4. Watch the 8-agent pipeline analyze the stock in real-time
5. View the full signal with entry, stop-loss, target, and AI reasoning

---

## 📁 Project Structure

```
AI-TradeMind/
├── web/                         # Next.js 15 Frontend
│   ├── src/app/
│   │   ├── page.tsx             # Landing page
│   │   ├── (app)/
│   │   │   ├── dashboard/       # Live indices + signals
│   │   │   ├── signals/         # Generate + view signals
│   │   │   ├── signals/[id]/    # Signal detail + reasoning
│   │   │   ├── watchlist/       # Stock tracking + charts
│   │   │   ├── onboarding/     # Risk profile quiz
│   │   │   └── settings/       # Profile + preferences
│   │   └── api/
│   │       ├── signals/generate/ # AI engine proxy
│   │       ├── market-data/     # Market data proxy
│   │       └── chart-data/      # Chart data proxy
│   └── src/components/
│       ├── charts/stock-chart   # TradingView charts
│       └── dashboard/signal-card # Signal cards
│
├── ai-engine/                   # Python FastAPI Backend
│   ├── main.py                  # FastAPI endpoints
│   ├── agents.py                # 8-agent orchestrator
│   ├── llm_gateway.py           # Groq/NVIDIA/OpenRouter
│   ├── indicators.py            # 36+ technical indicators
│   ├── market_data.py           # Yahoo Finance fetcher
│   ├── prompts.py               # Agent system prompts
│   ├── config.py                # Settings
│   ├── Dockerfile               # Render deployment
│   └── render.yaml              # Render blueprint
│
└── docs/                        # Architecture documents
```

---

## 🤖 AI Agent Pipeline

```
Stock Symbol → Market Data + 36 Indicators
     ↓
┌────────────────────────────────────┐
│  Phase 1: Parallel Analysis        │
│  • Fundamental Analyst             │
│  • Technical Analyst               │
│  • Sentiment Analyst               │
│  • News Analyst                    │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│  Phase 2: Debate                   │
│  • Bull Researcher (buy case)      │
│  • Bear Researcher (sell case)     │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│  Phase 3: Decision                 │
│  • Trader (synthesize → signal)    │
│  • Risk Manager (validate/reject)  │
└────────────┬───────────────────────┘
             ↓
     BUY / SELL / HOLD Signal
     + Entry, Stop-Loss, Target
     + Confidence Score (0-100%)
```

---

## 💰 Cost: $0/month

| Service | Free Tier |
|---|---|
| Groq | 30 req/min, 14.4K tokens/min |
| NVIDIA NIM | 1000 free credits |
| OpenRouter | Free models (Llama, Mistral) |
| Supabase | 500MB DB, 50K users |
| Vercel | Unlimited deploys |
| Render | 750 hrs/month |
| Yahoo Finance | Unlimited (delayed data) |

---

## ⚠️ Disclaimer

This project is for **educational and research purposes only**. It does not constitute financial advice. Trading in stocks involves risk. Past performance is not indicative of future results. Always consult a SEBI-registered financial advisor before making investment decisions.

---

## 📜 License

MIT
