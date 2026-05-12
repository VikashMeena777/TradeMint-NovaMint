# Multi-Agent AI Framework Design v2.0 — Indian Market

## 1. Agent Architecture (LangGraph Production Patterns)

### 1.1 High-Level Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT WORKFLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │ Fundamental │     │  Technical  │     │  Sentiment  │
    │   Analyst   │     │   Analyst   │     │   Analyst   │
    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               ▼
                    ┌─────────────────┐
                    │  News Analyst   │   (runs in parallel with above 3)
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  Analyst Report │   (structured JSON aggregation)
                    │  (Structured)    │
                    └────────┬────────┘
                             ▼
              ┌────────────────────────────┐
              │      RESEARCHER DEBATE      │
              │  ┌─────────┐ ┌─────────┐  │
              │  │  Bull   │ │  Bear   │  │
              │  │Researcher│ │Researcher│  │
              │  └────┬────┘ └────┬────┘  │
              │       └──────┬──────┘      │
              │           Debate           │
              └─────────────┬──────────────┘
                            ▼
              ┌────────────────────────────┐
              │      TRADER AGENT           │
              │  Synthesizes all signals    │
              │  → Trade Decision Score       │
              └─────────────┬──────────────┘
                            ▼
              ┌────────────────────────────┐
              │    RISK MANAGEMENT TEAM     │
              │  - Position sizing check    │
              │  - Stop-loss validation     │
              │  - Portfolio heat check     │
              │  - SEBI margin check       │
              │  - Circuit limit check      │
              │  - Buying power check       │
              └─────────────┬──────────────┘
                            ▼
              ┌────────────────────────────┐
              │   FINAL TRADE SIGNAL        │
              │  Confidence: 0-100          │
              │  Buy/Sell/Hold              │
              │  Entry / Stop / Take-Profit │
              │  Position Size                │
              │  Risk Notes                   │
              └────────────────────────────┘
```

### 1.2 Execution Mode: Parallel vs Sequential

| Stage | Agents | Mode | Rationale |
|---|---|---|---|
| Data Gathering | Fundamental, Technical, Sentiment, News | **Parallel** | Independent data sources; reduce latency |
| Synthesis | Analyst Report | Sequential | Needs all analyst outputs |
| Debate | Bull + Bear | **Parallel** | Independent reasoning; merge into structured debate |
| Decision | Trader | Sequential | Needs debate + analysts |
| Validation | Risk Manager | Sequential | Gate before execution; must be final step |

**Latency Budget:**
- Parallel analysts: ~5-10s (dominated by slowest API — Screener.in / Economic Times)
- Debate: ~10-15s
- Trader synthesis: ~3-5s
- Risk validation: ~2-3s
- **Total target: <30s**

---

## 2. Agent Specifications

### 2.1 Model Selection Per Agent (Free-Tier Strategy)

| Agent | Primary Model | Fallback Model | Temperature | Max Tokens | Provider |
|---|---|---|---|---|---|
| **Fundamental Analyst** | Groq Llama 3.3 70B | NVIDIA NIM Llama 3.1 70B | 0.1 | 2,000 | Groq (free) |
| **Technical Analyst** | Groq Llama 3.3 70B | NVIDIA NIM Llama 3.1 70B | 0.1 | 2,000 | Groq (free) |
| **Sentiment Analyst** | Groq Mixtral 8x7B | OpenRouter Mistral Large (free) | 0.2 | 3,000 | Groq (free) |
| **News Analyst** | Groq Llama 3.3 70B | NVIDIA NIM Mistral Large 2 | 0.1 | 2,500 | Groq (free) |
| **Bull Researcher** | NVIDIA NIM DeepSeek R1 | OpenRouter DeepSeek R1 (free) | 0.3 | 4,000 | NVIDIA NIM (free) |
| **Bear Researcher** | NVIDIA NIM DeepSeek R1 | OpenRouter DeepSeek R1 (free) | 0.3 | 4,000 | NVIDIA NIM (free) |
| **Risk Manager** | NVIDIA NIM Llama 3.1 405B | Groq Llama 3.3 70B | 0.0 | 2,000 | NVIDIA NIM (free) |
| **Trader Agent** | NVIDIA NIM DeepSeek R1 | Groq Llama 3.3 70B | 0.2 | 2,500 | NVIDIA NIM (free) |

**Total per-signal cost: ₹0 (all free-tier providers).**
At scale (>500 users), NVIDIA NIM free credits may exhaust → fall back to OpenRouter free tiers → Groq.
Hard budget cap: **₹5 per signal** enforced via token budget middleware (safety net if free tiers change).

---

## 3. Prompt Engineering Specs

### 3.1 Prompt Template: Fundamental Analyst (India)

```
SYSTEM PROMPT (Fundamental Analyst — Indian Market)
───────────────────────────────────────────────────
You are a senior equity research analyst with 15 years of experience covering Indian equities and Ind AS financial reporting.
Your task is to analyze {symbol} ({company_name}) on the {exchange} and produce a structured fundamental report.

INPUT DATA:
- Financial statements (last 4 quarters, Ind AS compliant)
- Key ratios: P/E {pe_ratio}, P/B {pb_ratio}, EV/EBITDA {ev_ebitda}, RoE {roe}, RoCE {roce}
- Revenue growth: YoY {revenue_growth}%
- Debt/Equity: {debt_equity}
- Promoter holding: {promoter_holding}% (check for pledge: {promoter_pledge}%)
- FII holding: {fii_holding}%; DII holding: {dii_holding}%
- Insider transactions (SEBI SAST last 90 days): {insider_summary}
- Earnings calendar: next result date {earnings_date}
- Sector: {sector} (Indian classification)
- Recent corporate actions: {corporate_actions}

OUTPUT FORMAT (STRICT JSON):
{
  "symbol": "RELIANCE.NS",
  "fair_value_estimate": 2850.50,
  "current_price": 2450.30,
  "valuation_signal": "undervalued",  // undervalued | fair | overvalued
  "growth_rating": "strong",          // weak | moderate | strong
  "key_metrics": {
    "pe_ratio": 28.5,
    "forward_pe": 25.2,
    "peg_ratio": 1.85,
    "roe": 15.2,
    "roce": 18.5,
    "debt_equity": 0.42,
    "promoter_holding": 50.5,
    "promoter_pledge": 2.1,
    "fii_holding": 22.3,
    "dii_holding": 18.7
  },
  "earnings_outlook": "positive",     // negative | neutral | positive
  "insider_sentiment": "bullish",    // bearish | neutral | bullish
  "confidence": 0.78,                // 0.0 - 1.0
  "summary": "Concise 2-sentence investment thesis in Indian market context.",
  "risks": ["Risk 1 relevant to Indian regulation/sector", "Risk 2"],
  "india_specific": {
    "ind_as_impact": "Any material Ind AS adjustment impact on earnings",
    "sebi_concern": "Any recent SEBI enforcement or observation",
    "sector_tailwind": "Indian government policy tailwind or headwind"
  }
}

RULES:
- All numeric values must be numbers, not strings. Prices in INR.
- Confidence reflects data quality and recency (prefer Tijori / Screener.in data).
- If data is missing, set confidence < 0.5 and explain in summary.
- Never hallucinate financial data not present in input.
- Consider Ind AS vs old GAAP differences when evaluating trends.
```

### 3.2 Prompt Template: Technical Analyst (India)

```
SYSTEM PROMPT (Technical Analyst — Indian Market)
─────────────────────────────────────────────────
You are a quantitative technical analyst specializing in Indian stock systematic trading signals.
Analyze {symbol} on {exchange} using the provided indicator data and output a structured technical assessment.

INPUT INDICATORS:
- Price: ₹{current_price}
- 50-day MA: ₹{ma_50}, 200-day MA: ₹{ma_200}
- RSI(14): {rsi}
- MACD: {macd_line} / {macd_signal} (hist: {macd_hist})
- Bollinger Bands: Lower ₹{bb_lower} / Middle ₹{bb_middle} / Upper ₹{bb_upper}
- ADX(14): {adx}
- ATR(14): ₹{atr}
- Volume profile: {volume_summary}
- Pivot Points (Classic): R3 ₹{r3}, R2 ₹{r2}, R1 ₹{r1}, PP ₹{pp}, S1 ₹{s1}, S2 ₹{s2}, S3 ₹{s3}
- NSE circuit limits: Upper ₹{upper_circuit}, Lower ₹{lower_circuit}
- F&O status: {fo_status} (F&O / non-F&O)
- Recent OI change: {oi_change}% (for F&O stocks)

OUTPUT FORMAT (STRICT JSON):
{
  "symbol": "RELIANCE.NS",
  "trend": "bullish",               // bearish | sideways | bullish
  "trend_strength": 0.72,           // 0.0 - 1.0
  "momentum": "positive",          // negative | neutral | positive
  "volatility_regime": "normal",   // low | normal | high | extreme
  "key_signals": [
    {"indicator": "RSI", "reading": 62, "signal": "neutral", "weight": 0.15}
  ],
  "nearest_support": 2400.50,
  "nearest_resistance": 2550.00,
  "circuit_proximity": "safe",      // safe | near_upper | near_lower | at_circuit
  "risk_reward_setup": {
    "entry": 2450.30,
    "stop_loss": 2380.50,
    "take_profit_1": 2600.00,
    "take_profit_2": 2750.00
  },
  "confidence": 0.65,
  "timeframe_bias": "swing",        // scalp | swing | position
  "fo_relevant": true,
  "oi_signal": "long_buildup",      // long_buildup | short_buildup | long_unwinding | short_unwinding
  "summary": "Concise technical narrative with Indian market context (circuit limits, F&O if applicable)."
}

RULES:
- Stop-loss must be based on ATR or support level, not arbitrary %.
- Consider NSE circuit limits in risk assessment. Do not suggest entry near circuit.
- For F&O stocks, incorporate Open Interest trend if available.
- Confidence reflects convergence of multiple indicators.
- If indicators conflict, reduce confidence and explain divergence.
- Pivot Points are widely used by Indian traders; include in analysis.
```

### 3.3 Prompt Template: Bull Researcher (Debate — India)

```
SYSTEM PROMPT (Bull Researcher — Indian Market)
───────────────────────────────────────────────
You are a bullish Indian equity researcher. Your job is to argue the STRONGEST possible bull case
for {symbol} on {exchange} based on the analyst reports provided. You must acknowledge risks but rebut them.

INPUT:
- Fundamental Report: {fundamental_json}
- Technical Report: {technical_json}
- Sentiment Report: {sentiment_json}
- News Report: {news_json}

OUTPUT FORMAT (STRICT JSON):
{
  "symbol": "RELIANCE.NS",
  "bull_case_summary": "3-4 sentence compelling bull argument in Indian market context.",
  "key_catalysts": [
    "Catalyst 1 (e.g., Jio IPO, new refinery capacity, retail expansion)",
    "Catalyst 2 (e.g., government PLI scheme benefit)",
    "Catalyst 3 (e.g., FII inflow pickup in sector)"
  ],
  "probability_bull_scenario": 0.65,  // 0.0 - 1.0
  "target_price_bull": 3100.00,       // INR
  "risk_mitigation": "How risks can be overcome or are overstated in Indian context.",
  "confidence": 0.70,
  "india_catalysts": {
    "policy": "Union Budget or RBI policy tailwind",
    "sector_rotation": "Domestic/institutional flow trend",
    "event": "Upcoming earnings, AGM, or corporate action"
  }
}

RULES:
- Be persuasive but honest. Do not invent catalysts not in input data.
- Probability reflects your conviction given the evidence.
- If the evidence is weak, say so and reduce probability.
- Consider Indian-specific catalysts (government schemes, RBI rate cycle, monsoon impact).
```

### 3.4 Prompt Template: Risk Manager (India)

```
SYSTEM PROMPT (Risk Manager — Indian Market)
───────────────────────────────────────────
You are a risk management officer at an Indian portfolio management services (PMS) firm.
Your ONLY job is to approve or reject trade proposals based on strict risk criteria aligned with SEBI norms.
You are paranoid and conservative by design.

INPUT:
- Proposed Signal: {trader_signal_json}
- User Portfolio: {portfolio_json}
- User Risk Profile: {risk_profile}
- Market Context: {market_context}
- SEBI Circuit Limits: {circuit_limits}
- Broker Margin: {margin_available}
- Instrument Type: {instrument_type} (EQ / FUT / OPT)
- Lot Size: {lot_size}

VALIDATION CRITERIA:
1. Position size ≤ max allowed for risk profile:
   - Conservative: 5% of equity
   - Moderate: 10% of equity
   - Aggressive: 20% of equity
2. Stop-loss must be present and logical (not arbitrary %). Must be below lower circuit for buy orders.
3. Risk/Reward ratio must be ≥ 1:2 for conservative, ≥ 1:1.5 for moderate, ≥ 1:1 for aggressive.
4. Portfolio heat: No more than 3 positions in same sector (e.g., no more than 3 banking stocks).
5. Circuit limit check: For buy, stop-loss must be above lower circuit. Entry must not be within 2% of upper circuit.
6. SEBI margin check: For F&O, verify sufficient margin (SPAN + Exposure) in broker account.
7. Buying power check: Sufficient cash/margin for proposed position in INR.
8. Correlation check: New position not highly correlated (>0.8) with existing holdings.
9. T2T segment check: If stock is in Trade-to-Trade (T2T) segment, warn about intraday restrictions.
10. F&O expiry check: For derivatives, position must not carry into expiry unless explicitly opted.

OUTPUT FORMAT (STRICT JSON):
{
  "signal_id": "uuid",
  "decision": "approved",            // approved | rejected | conditional
  "approval_conditions": ["Reduce position size to 8%", "Tighten stop to ₹X"],
  "risk_notes": "Detailed explanation of risk assessment with Indian market context.",
  "position_size_adjusted": 50,
  "stop_loss_adjusted": 2380.50,
  "max_loss_amount": 3500.00,         // INR
  "max_loss_pct": 1.5,
  "circuit_warning": false,
  "t2t_warning": false,
  "fo_margin_adequate": true,
  "confidence": 0.92               // confidence in risk assessment itself
}

RULES:
- Reject if ANY critical criterion fails (1, 2, 5, 7).
- Conditional approval for minor issues (3, 4, 6, 8) with specific adjustments.
- Never approve without clear stop-loss.
- Document every check performed in risk_notes.
- For F&O, ensure lot size multiplier is correctly applied.
```

### 3.5 Few-Shot Examples

Stored in `ai-engine/src/agents/prompts/few_shots/` with versioned JSONL files:
- `fundamental_examples_india.jsonl`
- `technical_examples_india.jsonl`
- `debate_examples_india.jsonl`
- `risk_examples_india.jsonl`

Each example contains: `input_data`, `expected_output`, `explanation`.

---

## 4. LangGraph State Schema & Graph Definition

### 4.1 State Definition (Pydantic — Production Recommended)

```python
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime

class AnalystReport(BaseModel):
    agent_name: str
    symbol: str
    exchange: str = "NSE"
    confidence: float = Field(ge=0.0, le=1.0)
    output: Dict[str, Any]
    processing_time_ms: int
    tokens_used: int
    cost_inr: float
    error: Optional[str] = None

class Signal(BaseModel):
    symbol: str
    exchange: str = "NSE"
    signal_type: Literal["buy", "sell", "hold"]
    confidence_score: int = Field(ge=0, le=100)
    entry_price: Optional[float] = None        # INR
    stop_loss: Optional[float] = None           # INR
    take_profit: Optional[float] = None         # INR
    position_size: Optional[int] = None       # shares or lots
    lot_size: Optional[int] = 1
    risk_reward_ratio: Optional[float] = None
    reasoning: Dict[str, Any] = Field(default_factory=dict)
    agents_contributions: Dict[str, Any] = Field(default_factory=dict)
    debate_summary: Optional[str] = None
    risk_notes: Optional[str] = None
    status: Literal["pending", "approved", "rejected", "executed", "expired"] = "pending"
    circuit_warning: bool = False
    t2t_warning: bool = False
    fo_margin_adequate: Optional[bool] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)

class PipelineState(BaseModel):
    symbol: str
    exchange: str = "NSE"
    user_id: str
    risk_profile: Literal["conservative", "moderate", "aggressive"] = "moderate"
    analyst_reports: Dict[str, AnalystReport] = Field(default_factory=dict)
    bull_research: Optional[Dict[str, Any]] = None
    bear_research: Optional[Dict[str, Any]] = None
    trader_signal: Optional[Signal] = None
    risk_assessment: Optional[Dict[str, Any]] = None
    final_signal: Optional[Signal] = None
    errors: List[str] = Field(default_factory=list)
    total_cost_inr: float = 0.0
    total_latency_ms: int = 0
```

### 4.2 Graph Definition (LangGraph)

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

# Define the graph
builder = StateGraph(PipelineState)

# Parallel analyst nodes
builder.add_node("fundamental_analyst", run_fundamental_analyst)
builder.add_node("technical_analyst", run_technical_analyst)
builder.add_node("sentiment_analyst", run_sentiment_analyst)
builder.add_node("news_analyst", run_news_analyst)

# Sequential nodes
builder.add_node("bull_researcher", run_bull_researcher)
builder.add_node("bear_researcher", run_bear_researcher)
builder.add_node("trader_agent", run_trader_agent)
builder.add_node("risk_manager", run_risk_manager)

# Parallel execution for analysts
builder.set_entry_point("fundamental_analyst")
builder.add_edge("fundamental_analyst", "analyst_collector")
builder.add_edge("technical_analyst", "analyst_collector")
builder.add_edge("sentiment_analyst", "analyst_collector")
builder.add_edge("news_analyst", "analyst_collector")

# Sequential after analysts
builder.add_conditional_edges(
    "analyst_collector",
    lambda state: "bull_researcher" if all_reports_present(state) else END,
    {True: "bull_researcher", False: END}
)
builder.add_edge("bull_researcher", "bear_researcher")
builder.add_edge("bear_researcher", "trader_agent")
builder.add_edge("trader_agent", "risk_manager")
builder.add_edge("risk_manager", END)

# Compile
graph = builder.compile()
```

---

## 5. Agent Tool Definitions

### 5.1 Fundamental Analyst Tools

| Tool | API | Purpose | Rate Limit |
|---|---|---|---|
| `screener_fundamentals` | Screener.in API / scrape | Balance sheet, P&L, cash flow, ratios | Cache 1h |
| `tijori_financials` | Tijori Finance API | Promoter holding, pledge, bulk deals | Cache 1h |
| `nse_corporate_filing` | NSE official API | Quarterly results, annual reports, shareholding | As published |
| `nse_announcements` | NSE announcements | Board meetings, dividends, splits | Real-time |
| `sebi_sast` | SEBI SAST disclosures | Insider trading, bulk deals | Daily batch |

### 5.2 Technical Analyst Tools

| Tool | Library/API | Purpose | Rate Limit |
|---|---|---|---|
| `ta_indicators` | TA-Lib + pandas-ta | Compute 200+ indicators | Compute-once |
| `nse_bhavcopy` | NSE Bhavcopy (EOD) | Historical EOD prices | Daily |
| `broker_tick_data` | Zerodha/Upstox WS | Intraday tick data | Real-time |
| `pivot_points` | Custom (Classic) | Support/resistance levels | Compute-once |
| `nse_circuit_limits` | NSE API | Upper/lower circuit for the day | Daily update |

### 5.3 Sentiment Analyst Tools

| Tool | API | Purpose | Rate Limit |
|---|---|---|---|
| `reddit_sentiment` | Reddit API | r/IndianStreetBets, r/DalalStreet sentiment | 60 req/min |
| `twitter_india_sentiment` | Twitter/X API v2 | Indian stock-related tweets | Paid tier |
| `tradingqa_sentiment` | Scraping / API | Zerodha TradingQ&A sentiment | Be polite |
| `telegram_monitor` | Custom bot | Selected Indian stock tip channels | Configurable |
| `moneycontrol_boards` | Scraping | MoneyControl message boards | Be polite |

### 5.4 News Analyst Tools

| Tool | API | Purpose | Rate Limit |
|---|---|---|---|
| `economic_times_api` | Economic Times API | Indian financial news | Paid |
| `moneycontrol_rss` | MoneyControl RSS | Market news, earnings, corporate actions | RSS poll |
| `business_standard_api` | Business Standard API | Business + policy news | Paid |
| `livemint_api` | Livemint API | Financial + policy news | Paid |
| `sebi_circulars` | SEBI RSS/API | Regulatory circulars, enforcement | Daily batch |
| `nse_bse_announcements` | NSE/BSE official | Company announcements | Real-time |

---

## 6. Streaming & Real-Time Updates

### 6.1 Streaming to Frontend

```python
# FastAPI endpoint with SSE
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langgraph import graph

@app.post("/api/v1/signals/stream")
async def stream_signal(request: SignalRequest):
    async def event_generator():
        async for event in graph.astream_events(
            {"symbol": request.symbol, "user_id": request.user_id},
            version="v2"
        ):
            yield f"data: {json.dumps({
                'agent': event.get('name'),
                'status': event['event'],
                'progress': calculate_progress(event),
                'output': event.get('data', {})
            })}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### 6.2 Progress Calculation

| Stage | Agents | Progress Weight |
|---|---|---|
| Data Gathering | Fundamental, Technical, Sentiment, News | 0.45 |
| Debate | Bull, Bear | 0.30 |
| Decision | Trader | 0.15 |
| Validation | Risk Manager | 0.10 |

---

## 7. Error Handling & Recovery

### 7.1 Agent Failure Modes

| Failure | Behavior | Fallback |
|---|---|---|
| Fundamental API down (Screener.in) | Skip fundamental; reduce confidence | Use Tijori / NSE filing only |
| Technical API down | Skip technical; mark as data unavailable | Use cached indicators |
| Sentiment API rate-limited | Use cached sentiment (15 min stale) | Skip sentiment; reduce weight |
| News API down | Skip news; reduce confidence | Use NSE announcements only |
| LLM timeout (>15s) | Retry once; then fallback model | Fallback model (see ADR-005) |
| Risk Manager rejects | Return rejected signal with full notes | User can override (with warning) |

### 7.2 Circuit Breaker

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60, expected_exception=(APIError, TimeoutError))
def call_llm_with_fallback(agent_name: str, prompt: str, primary_model: str):
    try:
        return call_llm(prompt, model=primary_model)
    except RateLimitError:
        logger.warning(f"Rate limit on {primary_model}, falling back")
        return call_llm(prompt, model=FALLBACK_MODELS[agent_name][0])
    except APIError:
        logger.error(f"API error on {primary_model}, trying fallback 2")
        return call_llm(prompt, model=FALLBACK_MODELS[agent_name][1])
```

---

## 8. Cost Tracking (INR)

```python
# ai-engine/src/monitoring/cost_tracker.py
class CostTracker:
    def __init__(self, budget_inr_per_signal: float = 2.70):
        self.budget = budget_inr_per_signal
        self.daily_budget = budget_inr_per_signal * signals_per_day_estimate
        
    def log_agent_cost(self, agent_name: str, model: str, tokens_in: int, 
                       tokens_out: int, cost_inr: float, latency_ms: int):
        metrics.gauge(
            f"agent_cost_inr",
            cost_inr,
            tags={"agent": agent_name, "model": model}
        )
        metrics.histogram(
            f"agent_latency_ms",
            latency_ms,
            tags={"agent": agent_name, "model": model}
        )
    
    def check_budget(self, running_cost: float) -> bool:
        if running_cost > self.budget:
            alerts.send(
                severity="warning",
                message=f"Signal cost ₹{running_cost:.2f} exceeded budget ₹{self.budget:.2f}"
            )
            return False
        return True
```

---

## 11. Error Handling & Graceful Degradation

### 11.1 LLM Provider Failure Chain

The free-tier LLM strategy requires robust fallback handling since free tiers have strict rate limits.

```python
class LLMGateway:
    """Multi-provider LLM gateway with automatic fallback chain."""
    
    PROVIDER_CHAIN = [
        {"name": "groq", "client": GroqClient, "timeout": 30, "max_retries": 2},
        {"name": "nvidia_nim", "client": NVIDIANIMClient, "timeout": 60, "max_retries": 1},
        {"name": "openrouter", "client": OpenRouterClient, "timeout": 90, "max_retries": 1},
    ]
    
    async def invoke(self, agent_name: str, prompt: str, model_config: dict) -> LLMResponse:
        """Try each provider in order. Return first successful response."""
        errors = []
        
        for provider in self.PROVIDER_CHAIN:
            try:
                client = provider["client"](api_key=get_api_key(provider["name"]))
                response = await asyncio.wait_for(
                    client.chat_completion(
                        model=model_config.get(provider["name"]),
                        messages=[{"role": "user", "content": prompt}],
                        temperature=model_config["temperature"],
                        max_tokens=model_config["max_tokens"],
                    ),
                    timeout=provider["timeout"]
                )
                
                # Track which provider succeeded for cost/latency metrics
                metrics.increment(f"llm.{provider['name']}.success", tags={"agent": agent_name})
                return LLMResponse(
                    content=response.choices[0].message.content,
                    provider=provider["name"],
                    tokens_used=response.usage.total_tokens,
                    latency_ms=response.latency_ms,
                )
                
            except RateLimitError as e:
                errors.append(f"{provider['name']}: Rate limited ({e})")
                metrics.increment(f"llm.{provider['name']}.rate_limited", tags={"agent": agent_name})
                continue  # Try next provider
                
            except (TimeoutError, asyncio.TimeoutError) as e:
                errors.append(f"{provider['name']}: Timeout ({provider['timeout']}s)")
                metrics.increment(f"llm.{provider['name']}.timeout", tags={"agent": agent_name})
                continue
                
            except (ConnectionError, APIError) as e:
                errors.append(f"{provider['name']}: API error ({e})")
                metrics.increment(f"llm.{provider['name']}.api_error", tags={"agent": agent_name})
                continue
        
        # ALL providers failed
        metrics.increment("llm.all_providers_failed", tags={"agent": agent_name})
        raise AllProvidersFailedError(
            agent=agent_name,
            errors=errors,
            message=f"All LLM providers exhausted for {agent_name}: {'; '.join(errors)}"
        )
```

### 11.2 Partial Pipeline Results

When some agents complete but others fail, TradeMind must still provide value:

| Scenario | Agents Completed | User Experience | Signal Generated? |
|---|---|---|---|
| **Full success** | All 8 agents | Complete signal with debate + reasoning | ✅ Yes, full confidence |
| **Partial success (≥5 agents)** | 5-7 agents | Signal with reduced confidence + warning banner | ⚠️ Yes, with "partial analysis" badge |
| **Partial success (<5 agents)** | 1-4 agents | Show completed analyses only, no signal | ❌ No signal — show partial insights |
| **Risk Manager fails** | 7 agents, Risk fails | **BLOCK signal generation** — never skip risk | ❌ Never — risk gate is mandatory |
| **All LLM providers down** | 0 agents | Error page: "AI engine temporarily unavailable" + show cached last signal | ❌ No — show status page |

```python
class PipelineResultHandler:
    """Handle partial pipeline completions gracefully."""
    
    MIN_AGENTS_FOR_SIGNAL = 5
    MANDATORY_AGENTS = ["risk_manager"]  # These MUST succeed
    
    def evaluate_pipeline(self, results: dict[str, AgentResult]) -> PipelineOutcome:
        completed = {k: v for k, v in results.items() if v.status == "success"}
        failed = {k: v for k, v in results.items() if v.status == "failed"}
        
        # Rule 1: Mandatory agents must succeed
        for agent in self.MANDATORY_AGENTS:
            if agent in failed:
                return PipelineOutcome(
                    status="blocked",
                    reason=f"Mandatory agent '{agent}' failed: {failed[agent].error}",
                    signal=None,
                    completed_analyses=completed,
                    user_message="Risk validation unavailable. Signal generation blocked for your safety."
                )
        
        # Rule 2: Minimum agent threshold
        if len(completed) < self.MIN_AGENTS_FOR_SIGNAL:
            return PipelineOutcome(
                status="insufficient",
                reason=f"Only {len(completed)}/{len(results)} agents completed",
                signal=None,
                completed_analyses=completed,
                user_message=f"Partial analysis available ({len(completed)} of {len(results)} agents). Not enough data for a reliable signal."
            )
        
        # Rule 3: Partial success — generate with reduced confidence
        confidence_penalty = (len(failed) / len(results)) * 20  # -20% max
        return PipelineOutcome(
            status="partial",
            reason=f"{len(completed)}/{len(results)} agents completed",
            signal=self.generate_signal(completed, confidence_penalty),
            completed_analyses=completed,
            user_message=f"Signal generated with {len(completed)} of {len(results)} agents. Confidence adjusted."
        )
```

### 11.3 Token Budget Exhaustion Mid-Pipeline

```python
class TokenBudgetManager:
    """Enforce per-signal token budgets across the agent pipeline."""
    
    MAX_BUDGET_PER_SIGNAL = 50000  # tokens (hard limit)
    WARNING_THRESHOLD = 0.8  # Warn at 80% usage
    
    def __init__(self):
        self.consumed = 0
        self.agent_usage = {}
    
    def consume(self, agent_name: str, tokens: int) -> BudgetStatus:
        self.consumed += tokens
        self.agent_usage[agent_name] = tokens
        
        remaining = self.MAX_BUDGET_PER_SIGNAL - self.consumed
        
        if remaining <= 0:
            return BudgetStatus(
                exhausted=True,
                action="skip_remaining_agents",
                message=f"Token budget exhausted ({self.consumed}/{self.MAX_BUDGET_PER_SIGNAL}). "
                        f"Skipping remaining agents. Generating signal from available data."
            )
        
        if self.consumed / self.MAX_BUDGET_PER_SIGNAL > self.WARNING_THRESHOLD:
            return BudgetStatus(
                exhausted=False,
                action="reduce_max_tokens",
                message=f"Budget at {self.consumed/self.MAX_BUDGET_PER_SIGNAL:.0%}. "
                        f"Reducing max_tokens for remaining agents.",
                adjusted_max_tokens=min(500, remaining // 2)  # Conservative
            )
        
        return BudgetStatus(exhausted=False, action="continue")
```

### 11.4 Rate Limit Handling Strategy

Since free tiers have strict rate limits, the system implements proactive throttling:

| Provider | Free Limit | TradeMind Strategy |
|---|---|---|
| **Groq** | 30 req/min | Token bucket with 25 req/min target (83% utilization) |
| **NVIDIA NIM** | 1,000 credits/month | Daily budget: 33 credits/day; alert at 80% monthly usage |
| **OpenRouter** | Varies by model | Emergency-only; no proactive usage |

```python
class RateLimitThrottler:
    """Proactive rate limiting to stay within free tier bounds."""
    
    def __init__(self, provider: str):
        self.provider = provider
        self.window_start = time.time()
        self.request_count = 0
        self.limits = {
            "groq": {"requests_per_minute": 25, "tokens_per_minute": 12000},
            "nvidia_nim": {"credits_per_day": 33},
            "openrouter": {"requests_per_minute": 10},
        }
    
    async def wait_if_needed(self):
        """Sleep if approaching rate limit. Better to slow down than get 429."""
        limit = self.limits.get(self.provider, {})
        rpm = limit.get("requests_per_minute")
        
        if rpm and self.request_count >= rpm:
            elapsed = time.time() - self.window_start
            if elapsed < 60:
                sleep_time = 60 - elapsed + 1  # +1s buffer
                logger.warning(f"Rate limit approaching for {self.provider}. Sleeping {sleep_time:.1f}s")
                await asyncio.sleep(sleep_time)
                self.request_count = 0
                self.window_start = time.time()
```

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
