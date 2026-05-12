# API Specification v1.0 (OpenAPI 3.1) — Indian Market

## 1. Overview

This document defines the complete REST API and WebSocket protocol for TradeMind AI (Indian market edition). All endpoints use JSON request/response bodies and follow RESTful conventions. All monetary values are in INR (₹) unless otherwise noted. All timestamps are in IST (Asia/Kolkata, UTC+5:30) unless specified.

**Base URLs:**
- Production: `https://api.trademind.in/v1`
- Staging: `https://api-staging.trademind.in/v1`
- Local: `http://localhost:3000/api/v1`

**Authentication:**
- Primary: Cookie-based session via Supabase Auth (`__Host-psb`)
- API Clients: `Authorization: Bearer <jwt>`
- Webhooks: HMAC-SHA256 signature verification

**Standards:**
- OpenAPI 3.1.0
- JSON:API conventions for resource naming
- RFC 7807 Problem Details for error responses
- RFC 8594 `Prefer: return=representation` support

---

## 2. Common Patterns

### 2.1 Pagination (Cursor-Based)

All list endpoints support cursor-based pagination for consistent ordering with high-throughput data.

```
GET /v1/signals?limit=20&cursor=eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiMjAyNS0wMS0xNVQxMDowMDowMFoifQ==&sort=-created_at
```

**Response Headers:**
```
X-Page-Cursor: eyJpZCI6InV1aWQi... (next page cursor, omitted if last page)
X-Page-Has-More: true
X-Page-Total-Count: 147
```

**Response Body:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "cursor": "eyJpZCI6...",
    "next_cursor": "eyJpZCI6...",
    "has_more": true,
    "total_count": 147
  }
}
```

### 2.2 Filtering

Query parameters with field operators:

```
GET /v1/signals?status=approved&symbol=RELIANCE.NS&confidence_score[gte]=70&created_at[gte]=2025-01-01
```

**Operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`, `ilike`, `null`, `nnull`, `between`

### 2.3 Sorting

```
GET /v1/signals?sort=-created_at,+confidence_score
```

Prefix `+` for ascending (default), `-` for descending.

### 2.4 Field Selection (Sparse Fields)

```
GET /v1/signals?fields=id,symbol,confidence_score,status,created_at
```

### 2.5 Idempotency

All mutating endpoints accept an `Idempotency-Key: <uuid>` header. Keys expire after 24 hours. Duplicate requests with the same key within 24h return the original response (409 if payload differs).

### 2.6 Rate Limit Headers

All responses include:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1705312800
X-RateLimit-Policy: per-minute-per-user
```

---

## 3. Authentication Endpoints

### POST `/v1/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "Priya Sharma",
  "phone": "+91-9876543210",
  "timezone": "Asia/Kolkata"
}
```

**Validation (Zod):**
```typescript
z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  full_name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+91-[\d]{10}$/),
  timezone: z.string().default('Asia/Kolkata'),
});
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Priya Sharma",
    "phone": "+91-9876543210",
    "risk_profile": "moderate",
    "subscription_tier": "free",
    "created_at": "2025-01-15T10:30:00+05:30",
    "session": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "expires_at": "2025-01-15T11:30:00+05:30"
    }
  }
}
```

**Errors:**
- 400: `invalid-request` — Validation failure
- 409: `conflict` — Email already exists
- 422: `unprocessable-entity` — Weak password

---

### POST `/v1/auth/login`

Authenticate with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "...", "full_name": "...", "phone": "+91-9876543210" },
    "session": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "expires_at": "2025-01-15T11:30:00+05:30"
    }
  }
}
```

**Errors:**
- 401: `unauthorized` — Invalid credentials
- 429: `rate-limit-exceeded` — Too many login attempts (5/min)

---

### POST `/v1/auth/refresh`

Refresh access token using refresh token cookie.

**Request:**
```
POST /v1/auth/refresh
Cookie: __Host-psb=eyJhbG... (refresh token)
```

**Response 200:**
```json
{
  "data": {
    "access_token": "eyJhbG...",
    "expires_at": "2025-01-15T12:30:00+05:30"
  }
}
```

**Errors:**
- 401: `unauthorized` — Invalid or expired refresh token

---

### POST `/v1/auth/logout`

Invalidate current session and clear cookies.

**Response 204:** (No body)

---

### POST `/v1/auth/oauth/{provider}`

OAuth callback handlers. Supported providers: `google`.

**Request:**
```json
{
  "code": "4/0AeaYSH...",
  "state": "csrf-state-token"
}
```

**Response 200:** Same as login.

---

### POST `/v1/auth/mfa/enable`

Enable TOTP MFA. Returns secret + QR code URI.

**Response 200:**
```json
{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code_uri": "otpauth://totp/TradeMind:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=TradeMind",
    "backup_codes": ["1234-5678-9012", "9876-5432-1098"]
  }
}
```

---

### POST `/v1/auth/mfa/verify`

Verify TOTP code during login.

**Request:**
```json
{
  "code": "123456",
  "method_id": "mfa-verification-id"
}
```

**Response 200:** Session tokens (same as login).

---

## 4. User & Profile Endpoints

### GET `/v1/users/me`

Get current user's profile with portfolio summary.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Priya Sharma",
    "avatar_url": "https://cdn.trademind.in/avatars/uuid.jpg",
    "phone": "+91-9876543210",
    "pan_hash": "abc123...",
    "risk_profile": "moderate",
    "subscription_tier": "pro",
    "is_paper_trading": true,
    "daily_signals_used": 3,
    "max_daily_signals": 10,
    "signals_reset_at": "2025-01-16T09:00:00+05:30",
    "timezone": "Asia/Kolkata",
    "locale": "en-IN",
    "portfolio_summary": {
      "total_equity": 1250000.00,
      "cash": 450000.00,
      "market_value": 800000.00,
      "buying_power": 450000.00,
      "day_pnl": 8500.00,
      "day_return_pct": 0.68,
      "total_return_pct": 5.2
    }
  }
}
```

---

### PATCH `/v1/users/me`

Update profile fields (partial update).

**Request:**
```json
{
  "full_name": "Priya S. Sharma",
  "risk_profile": "aggressive",
  "timezone": "Asia/Kolkata",
  "push_notifications": true
}
```

**Response 200:** Updated profile object.

**Errors:**
- 422: `unprocessable-entity` — Invalid risk_profile value

---

### DELETE `/v1/users/me`

Soft-delete account (DPDP/GDPR right to erasure). Requires password confirmation.

**Request:**
```json
{
  "password": "SecurePass123!",
  "reason": "too_expensive"
}
```

**Response 202:**
```json
{
  "data": {
    "deletion_scheduled_at": "2025-01-22T10:30:00+05:30",
    "grace_period_days": 7,
    "message": "Account will be permanently deleted in 7 days. Contact support to cancel."
  }
}
```

---

## 5. Watchlist Endpoints

### GET `/v1/watchlists`

List user's watchlists with current price snapshots (NSE/BSE).

**Query params:** `limit`, `cursor`, `sort`, `search`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "symbol": "RELIANCE.NS",
      "name": "Reliance Industries Ltd",
      "sector": "Energy",
      "exchange": "NSE",
      "instrument_type": "EQ",
      "is_ai_recommended": false,
      "current_price": 2850.50,
      "change": 25.30,
      "change_percent": 0.89,
      "alert_price_high": 3000.00,
      "alert_price_low": 2700.00,
      "created_at": "2025-01-10T08:00:00+05:30"
    }
  ],
  "pagination": { "limit": 20, "has_more": false, "total_count": 12 }
}
```

---

### POST `/v1/watchlists`

Add a symbol to watchlist.

**Request:**
```json
{
  "symbol": "INFY.NS",
  "alert_price_high": 1900.00,
  "alert_price_low": 1750.00
}
```

**Response 201:** Watchlist item object.

**Errors:**
- 409: `conflict` — Symbol already in watchlist
- 422: `unprocessable-entity` — Invalid symbol or exchange not supported

---

### DELETE `/v1/watchlists/{symbol}`

Remove a symbol from watchlist.

**Response 204:**

---

### GET `/v1/watchlists/recommendations`

Get AI-recommended symbols based on user's risk profile and Indian market conditions.

**Response 200:**
```json
{
  "data": [
    {
      "symbol": "TCS.NS",
      "name": "Tata Consultancy Services Ltd",
      "sector": "IT",
      "exchange": "NSE",
      "recommendation_reason": "Strong fundamental outlook with AI revenue growth; technical breakout on daily timeframe. FII inflows positive.",
      "confidence": 0.82,
      "match_score": 94
    }
  ]
}
```

---

## 6. Trade Signal Endpoints

### GET `/v1/signals`

List trade signals with filtering and pagination.

**Query params:**
- `status`: `pending`, `approved`, `rejected`, `executed`, `expired`, `canceled`
- `symbol`: filter by symbol
- `signal_type`: `buy`, `sell`, `hold`
- `confidence_score[gte]`: minimum confidence
- `created_at[gte]`: date range start
- `sort`: `-created_at`, `+confidence_score`, etc.
- `limit`: 1-100 (default 20)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "symbol": "RELIANCE.NS",
      "exchange": "NSE",
      "signal_type": "buy",
      "confidence_score": 78,
      "entry_price": 2850.50,
      "stop_loss": 2780.00,
      "take_profit": 3050.00,
      "position_size": 50,
      "lot_size": 1,
      "risk_reward_ratio": 2.08,
      "status": "approved",
      "expires_at": "2025-01-15T16:00:00+05:30",
      "created_at": "2025-01-15T10:30:00+05:30",
      "latency_ms": 23400
    }
  ],
  "pagination": { "limit": 20, "next_cursor": "...", "has_more": true, "total_count": 147 }
}
```

---

### POST `/v1/signals`

Request a new AI trade signal (triggers multi-agent pipeline).

**Request:**
```json
{
  "symbol": "RELIANCE.NS",
  "exchange": "NSE",
  "risk_profile": "moderate",
  "confidence_threshold": 70,
  "auto_execute": false,
  "timeframe": "swing"
}
```

**Validation:**
```typescript
z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.enum(['NSE', 'BSE', 'NFO', 'MCX']).default('NSE'),
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  confidence_threshold: z.number().min(50).max(100).default(70),
  auto_execute: z.boolean().default(false),
  timeframe: z.enum(['scalp', 'swing', 'position']).default('swing'),
});
```

**Response 202:**
```json
{
  "data": {
    "pipeline_id": "uuid",
    "status": "running",
    "symbol": "RELIANCE.NS",
    "estimated_completion_ms": 25000,
    "queue_position": 0
  }
}
```

**Response 429 (Rate Limit):**
```json
{
  "type": "https://api.trademind.in/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have used 3 of 3 daily signals on the Free tier.",
  "retryAfter": 46800,
  "tierLimit": 3,
  "tierName": "free"
}
```

**Errors:**
- 429: `rate-limit-exceeded` — Daily/hourly signal limit reached
- 422: `unprocessable-entity` — Symbol not in watchlist or not supported
- 503: `service-unavailable` — AI pipeline overloaded (queue depth > 100)

---

### GET `/v1/signals/{id}`

Get full signal details including agent reasoning trail.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "symbol": "RELIANCE.NS",
    "exchange": "NSE",
    "signal_type": "buy",
    "confidence_score": 78,
    "entry_price": 2850.50,
    "stop_loss": 2780.00,
    "take_profit": 3050.00,
    "position_size": 50,
    "lot_size": 1,
    "risk_reward_ratio": 2.08,
    "status": "approved",
    "expires_at": "2025-01-15T16:00:00+05:30",
    "created_at": "2025-01-15T10:30:00+05:30",
    "latency_ms": 23400,
    "agents_contributions": {
      "fundamental_analyst": {
        "confidence": 0.72,
        "valuation_signal": "undervalued",
        "key_metrics": { "pe_ratio": 28.5, "roe": 15.2, "promoter_holding": 50.5 }
      },
      "technical_analyst": {
        "confidence": 0.65,
        "trend": "bullish",
        "circuit_proximity": "safe",
        "key_signals": [
          { "indicator": "RSI", "reading": 62, "signal": "neutral", "weight": 0.15 }
        ]
      },
      "bull_researcher": { "probability_bull_scenario": 0.65, "target_price_bull": 3100.00 },
      "bear_researcher": { "probability_bear_scenario": 0.35, "target_price_bear": 2650.00 }
    },
    "debate_summary": "Bull case dominates: strong earnings growth and technical momentum outweigh valuation concerns in Indian market context.",
    "risk_notes": "Approved with standard position sizing. Stop-loss based on ATR(14) × 2. Circuit limits safe.",
    "circuit_warning": false,
    "t2t_warning": false,
    "fo_margin_adequate": true,
    "execution": {
      "trade_id": "uuid",
      "filled_avg_price": 2850.55,
      "filled_qty": 50,
      "status": "filled",
      "filled_at": "2025-01-15T10:30:15+05:30"
    }
  }
}
```

---

### POST `/v1/signals/{id}/approve`

Approve a pending signal for execution.

**Request:**
```json
{
  "position_size_override": 40,
  "notes": "Reducing size due to existing banking exposure"
}
```

**Response 200:** Updated signal object with `status: "approved"`.

**Errors:**
- 409: `conflict` — Signal already approved/rejected/expired
- 422: `unprocessable-entity` — Insufficient buying power

---

### POST `/v1/signals/{id}/reject`

Reject a pending signal.

**Request:**
```json
{
  "reason": "too_aggressive",
  "notes": "I don't want to add more energy exposure right now"
}
```

**Response 200:** Updated signal object with `status: "rejected"`.

---

### GET `/v1/signals/{id}/reasoning`

Get full agent reasoning trail (for explainability and SEBI compliance).

**Response 200:**
```json
{
  "data": {
    "pipeline_id": "uuid",
    "symbol": "RELIANCE.NS",
    "total_latency_ms": 23400,
    "total_cost_inr": 2.65,
    "agents": [
      {
        "agent_name": "fundamental_analyst",
        "model_used": "groq/llama-3.3-70b",
        "tokens_used": 1450,
        "cost_inr": 0.05,
        "latency_ms": 3200,
        "output": { /* full agent output */ },
        "started_at": "2025-01-15T10:30:00+05:30",
        "completed_at": "2025-01-15T10:30:03+05:30"
      }
      // ... all 8 agents
    ],
    "debate_transcript": {
      "bull_case": "...",
      "bear_case": "...",
      "consensus": 0.65
    },
    "trader_decision": {
      "rationale": "...",
      "signal_type": "buy",
      "confidence": 78
    },
    "risk_assessment": {
      "decision": "approved",
      "checks_passed": ["position_size", "stop_loss", "buying_power", "circuit_limits"],
      "checks_flagged": [],
      "adjusted_parameters": {}
    }
  }
}
```

---

## 7. Trade Execution Endpoints

### GET `/v1/trades`

List trade history.

**Query params:** `status`, `symbol`, `side`, `order_type`, `date_range`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "signal_id": "uuid",
      "symbol": "RELIANCE.NS",
      "exchange": "NSE",
      "side": "buy",
      "qty": 50,
      "product_type": "CNC",
      "order_type": "market",
      "filled_avg_price": 2850.55,
      "filled_qty": 50,
      "status": "filled",
      "realized_pnl": null,
      "unrealized_pnl": 4250.00,
      "brokerage": 20.00,
      "stt": 14.25,
      "stamp_duty": 1.43,
      "gst": 3.60,
      "slippage_bps": 1.2,
      "time_in_force": "day",
      "filled_at": "2025-01-15T10:30:15+05:30",
      "created_at": "2025-01-15T10:30:00+05:30"
    }
  ],
  "pagination": { "limit": 20, "has_more": false, "total_count": 45 }
}
```

---

### POST `/v1/trades`

Execute a trade from an approved signal.

**Request:**
```json
{
  "signal_id": "uuid",
  "order_type": "market",
  "product_type": "CNC",
  "qty_override": 40
}
```

**Validation:**
```typescript
z.object({
  signal_id: z.string().uuid(),
  order_type: z.enum(['market', 'limit', 'stop', 'stop_limit', 'bracket_order', 'cover_order']),
  product_type: z.enum(['CNC', 'MIS', 'NRML']).default('CNC'),
  limit_price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  qty_override: z.number().positive().optional(),
  time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
});
```

**Response 202:**
```json
{
  "data": {
    "id": "uuid",
    "signal_id": "uuid",
    "broker_order_id": "ord_abc123",
    "status": "pending",
    "symbol": "RELIANCE.NS",
    "exchange": "NSE",
    "side": "buy",
    "qty": 40,
    "product_type": "CNC",
    "order_type": "market",
    "created_at": "2025-01-15T10:30:00+05:30"
  }
}
```

**Errors:**
- 422: `unprocessable-entity` — Signal not approved, insufficient buying power, circuit limit violation
- 429: `rate-limit-exceeded` — 10 trades/min limit
- 502: `broker-unavailable` — Zerodha/Upstox API error

---

### GET `/v1/trades/{id}`

Get trade details with fill information.

**Response 200:** Trade object (same as list item with full `fill_history` array).

---

### POST `/v1/trades/{id}/cancel`

Cancel a pending order.

**Response 200:** Updated trade with `status: "canceled"`.

**Errors:**
- 409: `conflict` — Order already filled or canceled
- 502: `broker-unavailable` — Broker cancel rejected

---

## 8. Portfolio Endpoints

### GET `/v1/portfolio`

Get current portfolio summary with positions.

**Response 200:**
```json
{
  "data": {
    "total_equity": 1250000.00,
    "cash": 450000.00,
    "market_value": 800000.00,
    "buying_power": 450000.00,
    "day_pnl": 8500.00,
    "day_return_pct": 0.68,
    "total_pnl": 62000.00,
    "total_return_pct": 5.2,
    "sharpe_ratio": 1.85,
    "max_drawdown_pct": 3.2,
    "beta": 1.05,
    "positions": [
      {
        "symbol": "RELIANCE.NS",
        "exchange": "NSE",
        "qty": 50,
        "avg_entry_price": 2850.55,
        "market_price": 2935.80,
        "market_value": 146790.00,
        "unrealized_pnl": 4262.50,
        "unrealized_pnl_pct": 2.99,
        "day_pnl": 850.00,
        "sector": "Energy",
        "portfolio_weight_pct": 11.74
      }
    ],
    "sector_allocation": {
      "IT": 22.5,
      "Financial Services": 20.1,
      "Energy": 15.3,
      "FMCG": 12.4,
      "Pharma": 10.8,
      "Other": 18.9
    }
  }
}
```

---

### GET `/v1/portfolio/snapshots`

Get historical portfolio snapshots.

**Query params:** `start_date`, `end_date`, `granularity` (`daily`, `weekly`, `monthly`)

**Response 200:**
```json
{
  "data": [
    {
      "snapshot_date": "2025-01-15",
      "total_equity": 1250000.00,
      "day_pnl": 8500.00,
      "total_return_pct": 5.2,
      "sharpe_ratio": 1.85,
      "max_drawdown_pct": 3.2
    }
  ]
}
```

---

### GET `/v1/portfolio/performance`

Get performance metrics and benchmark comparison (vs NIFTY 50).

**Response 200:**
```json
{
  "data": {
    "period": "ytd",
    "total_return_pct": 5.2,
    "benchmark_return_pct": 3.1,
    "benchmark_symbol": "NIFTY50",
    "alpha": 2.1,
    "beta": 1.05,
    "sharpe_ratio": 1.85,
    "sortino_ratio": 2.4,
    "max_drawdown_pct": 3.2,
    "win_rate_pct": 62.5,
    "profit_factor": 1.8,
    "avg_win_pct": 4.2,
    "avg_loss_pct": -2.1,
    "benchmark_comparison": [
      { "date": "2025-01-01", "portfolio": 100.0, "nifty50": 100.0 },
      { "date": "2025-01-15", "portfolio": 105.2, "nifty50": 103.1 }
    ]
  }
}
```

---

## 9. Agent Log Endpoints

### GET `/v1/agents/logs`

List agent execution logs.

**Query params:** `agent_name`, `signal_id`, `symbol`, `date_range`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "signal_id": "uuid",
      "agent_name": "fundamental_analyst",
      "agent_role": "analyst",
      "symbol": "RELIANCE.NS",
      "action": "analyze",
      "model_used": "groq/llama-3.3-70b",
      "tokens_used": 1450,
      "cost_inr": 0.05,
      "processing_time_ms": 3200,
      "created_at": "2025-01-15T10:30:03+05:30"
    }
  ]
}
```

---

### GET `/v1/agents/status`

Get active pipeline statuses for the current user.

**Response 200:**
```json
{
  "data": [
    {
      "pipeline_id": "uuid",
      "symbol": "RELIANCE.NS",
      "status": "running",
      "current_agent": "technical_analyst",
      "progress": 0.45,
      "started_at": "2025-01-15T10:30:00+05:30",
      "elapsed_ms": 8500,
      "estimated_remaining_ms": 15000
    }
  ]
}
```

---

### GET `/v1/agents/performance`

Get per-agent accuracy metrics.

**Response 200:**
```json
{
  "data": [
    {
      "agent_name": "fundamental_analyst",
      "total_signals": 450,
      "win_rate_pct": 58.2,
      "avg_confidence": 0.72,
      "avg_latency_ms": 3200,
      "avg_cost_inr": 0.05,
      "contribution_score": 0.35
    }
  ]
}
```

---

## 10. Backtest Endpoints

### POST `/v1/backtests`

Run a new backtest.

**Request:**
```json
{
  "name": "RELIANCE Swing Strategy Q1",
  "symbol": "RELIANCE.NS",
  "exchange": "NSE",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "initial_capital": 1000000.00,
  "strategy_config": {
    "risk_profile": "moderate",
    "confidence_threshold": 70,
    "position_sizing": "kelly_half",
    "stop_loss_atr_multiplier": 2.0,
    "take_profit_risk_reward": 2.0
  }
}
```

**Response 202:**
```json
{
  "data": {
    "id": "uuid",
    "status": "running",
    "name": "RELIANCE Swing Strategy Q1",
    "symbol": "RELIANCE.NS",
    "started_at": "2025-01-15T10:30:00+05:30",
    "estimated_completion_ms": 120000
  }
}
```

---

### GET `/v1/backtests`

List backtests.

**Response 200:** Array of backtest summaries.

---

### GET `/v1/backtests/{id}`

Get backtest results.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "RELIANCE Swing Strategy Q1",
    "symbol": "RELIANCE.NS",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "initial_capital": 1000000.00,
    "final_capital": 1185000.00,
    "total_return_pct": 18.5,
    "sharpe_ratio": 1.92,
    "max_drawdown_pct": 8.4,
    "total_trades": 87,
    "win_rate_pct": 64.4,
    "avg_win_pct": 5.2,
    "avg_loss_pct": -2.8,
    "profit_factor": 2.1,
    "benchmark_return_pct": 15.3,
    "benchmark_symbol": "NIFTY50",
    "alpha": 3.2,
    "trades": [ /* detailed trade list */ ],
    "equity_curve": [
      { "date": "2024-01-01", "equity": 1000000.00 },
      { "date": "2024-12-31", "equity": 1185000.00 }
    ],
    "completed_at": "2025-01-15T10:32:00+05:30"
  }
}
```

---

### GET `/v1/backtests/{id}/report`

Download backtest report as PDF.

**Response 200:** `Content-Type: application/pdf`

---

## 11. Alert Endpoints

### GET `/v1/alerts`

List user's alerts.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "alert_type": "signal_generated",
      "symbol": "RELIANCE.NS",
      "title": "New Buy Signal: RELIANCE",
      "body": "AI generated a buy signal for RELIANCE with 78% confidence. Entry: ₹2850.50",
      "channels": ["in_app", "email"],
      "status": "delivered",
      "read_at": "2025-01-15T10:31:00+05:30",
      "created_at": "2025-01-15T10:30:00+05:30"
    }
  ]
}
```

---

### POST `/v1/alerts`

Create a custom alert.

**Request:**
```json
{
  "alert_type": "price_target",
  "symbol": "RELIANCE.NS",
  "title": "RELIANCE above ₹3000",
  "condition": {
    "field": "price",
    "operator": "gte",
    "value": 3000.00
  },
  "channels": ["in_app", "email", "push"]
}
```

**Response 201:** Alert object.

---

### DELETE `/v1/alerts/{id}`

Delete an alert.

**Response 204:**

---

### GET `/v1/alerts/settings`

Get alert preferences.

**Response 200:**
```json
{
  "data": {
    "email_enabled": true,
    "push_enabled": true,
    "signal_generated": ["in_app", "email"],
    "price_target": ["in_app", "email", "push"],
    "stop_loss": ["in_app", "email", "push"],
    "daily_summary": ["email"],
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    "timezone": "Asia/Kolkata"
  }
}
```

---

### POST `/v1/alerts/settings`

Update alert preferences.

**Request:** Same structure as GET response.

**Response 200:** Updated preferences.

---

## 12. Webhook Endpoints (Inbound)

### POST `/v1/webhooks/broker/trade`

Broker (Zerodha/Upstox) trade fill webhook.

**Headers:**
```
X-Broker-Signature: hmac=base64(hmac-sha256(payload, WEBHOOK_SECRET))
```

**Request:**
```json
{
  "event": "fill",
  "order": {
    "id": "ord_abc123",
    "client_order_id": "uuid",
    "symbol": "RELIANCE.NS",
    "exchange": "NSE",
    "side": "buy",
    "qty": "50",
    "filled_qty": "50",
    "filled_avg_price": "2850.55",
    "status": "filled",
    "created_at": "2025-01-15T10:30:00+05:30",
    "filled_at": "2025-01-15T10:30:15+05:30"
  }
}
```

**Response 200:** `{ "received": true }`

**Verification:**
```python
import hmac, hashlib, base64

def verify_broker_signature(payload: str, signature: str, secret: str) -> bool:
    expected = base64.b64encode(
        hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)
```

---

### POST `/v1/webhooks/cashfree`

Cashfree payment event webhook. Signature verification via `CASHFREE_WEBHOOK_SECRET` is **mandatory** (see SEBI compliance for financial data integrity).

**Events handled:** `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_USER_DROPPED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_CHARGED`, `REFUND_STATUS`

---

## 13. WebSocket Protocol Specification

### 13.1 Connection

**URL:** `wss://api.trademind.in/v1/ws`

**Authentication:** Send auth message immediately after connection:
```json
{
  "type": "auth",
  "token": "eyJhbG..."
}
```

**Connection Limits:**
- Max 1 connection per user
- Heartbeat: server sends `ping` every 30s; client must respond `pong` within 10s
- Reconnection: exponential backoff (1s, 2s, 4s, 8s, max 30s)

### 13.2 Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `subscribe:price` | `{ "symbol": "RELIANCE.NS" }` | Subscribe to real-time price updates for symbol |
| `unsubscribe:price` | `{ "symbol": "RELIANCE.NS" }` | Unsubscribe from price updates |
| `subscribe:agent` | `{ "pipeline_id": "uuid" }` | Subscribe to agent pipeline status |
| `subscribe:portfolio` | `{}` | Subscribe to portfolio P&L updates |
| `ping` | `{}` | Heartbeat response |

### 13.3 Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `price:tick` | `{ "symbol": "RELIANCE.NS", "price": 2850.55, "change": 25.30, "change_percent": 0.89, "volume": 15420, "timestamp": "2025-01-15T10:30:00.123+05:30" }` | Real-time price update |
| `price:bar` | `{ "symbol": "RELIANCE.NS", "timeframe": "1m", "open": 2845.20, "high": 2855.60, "low": 2840.15, "close": 2850.55, "volume": 15420, "timestamp": "2025-01-15T10:30:00+05:30" }` | Completed candlestick bar |
| `agent:status` | `{ "pipeline_id": "uuid", "agent": "fundamental_analyst", "status": "running\|complete\|error", "progress": 0.35, "output": {} }` | Agent pipeline step update |
| `agent:pipeline:start` | `{ "pipeline_id": "uuid", "symbol": "RELIANCE.NS", "started_at": "2025-01-15T10:30:00+05:30" }` | Pipeline initiated |
| `agent:pipeline:complete` | `{ "pipeline_id": "uuid", "signal": {...}, "latency_ms": 23400 }` | Pipeline finished |
| `agent:pipeline:error` | `{ "pipeline_id": "uuid", "error": "Timeout on sentiment analyst", "stage": "sentiment", "retryable": true }` | Pipeline error |
| `portfolio:update` | `{ "total_equity": 1250000.00, "day_pnl": 8500.00, "positions": [...] }` | Portfolio snapshot update |
| `alert:new` | `{ "alert_id": "uuid", "title": "New Buy Signal: RELIANCE", "body": "...", "type": "signal_generated" }` | New alert notification |
| `trade:fill` | `{ "trade_id": "uuid", "symbol": "RELIANCE.NS", "filled_qty": 50, "filled_avg_price": 2850.55, "status": "filled" }` | Trade fill update |
| `pong` | `{}` | Heartbeat acknowledgment |
| `error` | `{ "code": "auth_failed", "message": "Invalid or expired token" }` | Connection error |

### 13.4 Error Codes

| Code | Description | Action |
|---|---|---|
| `auth_failed` | Invalid or expired token | Re-authenticate and reconnect |
| `rate_limit` | Too many messages | Back off and retry |
| `invalid_symbol` | Symbol not found or not supported | Check symbol and retry |
| `already_subscribed` | Duplicate subscription | Ignore, already active |
| `server_error` | Internal server error | Reconnect after 5s |
| `maintenance` | Server maintenance | Reconnect after announced window |

---

## 14. Error Response Schema (RFC 7807)

All errors follow this structure:

```json
{
  "type": "https://api.trademind.in/errors/{error-code}",
  "title": "Human-readable title",
  "status": 400,
  "detail": "Detailed explanation of what went wrong and how to fix it.",
  "instance": "/v1/signals",
  "timestamp": "2025-01-15T10:30:00+05:30",
  "requestId": "req_abc123",
  "code": "error_code",
  "errors": [
    {
      "field": "symbol",
      "message": "Symbol must be a valid NSE/BSE ticker (e.g., RELIANCE.NS)",
      "code": "invalid_format"
    }
  ]
}
```

### 14.1 Error Catalog

| Status | Code | Type | When |
|---|---|---|---|
| 400 | `invalid-request` | `invalid-request` | Validation failure, malformed JSON |
| 400 | `invalid-query` | `invalid-query` | Invalid filter/sort parameter |
| 401 | `unauthorized` | `unauthorized` | Missing/invalid auth token |
| 403 | `forbidden` | `forbidden` | Insufficient permissions (tier limit) |
| 404 | `not-found` | `not-found` | Resource doesn't exist |
| 409 | `conflict` | `conflict` | Idempotency key conflict, duplicate resource |
| 409 | `signal-expired` | `business-rule-violation` | Signal past expiry time |
| 422 | `unprocessable-entity` | `unprocessable-entity` | Business logic failure |
| 422 | `insufficient-buying-power` | `business-rule-violation` | Not enough cash for trade |
| 422 | `circuit-limit-violation` | `business-rule-violation` | Entry within NSE circuit limit |
| 422 | `sebi-margin-shortfall` | `business-rule-violation` | Insufficient SPAN + Exposure margin |
| 429 | `rate-limit-exceeded` | `rate-limit-exceeded` | Too many requests |
| 500 | `internal-error` | `internal-error` | Unexpected server error |
| 502 | `broker-unavailable` | `external-service-error` | Broker API down or error |
| 503 | `service-unavailable` | `service-unavailable` | AI pipeline overloaded |
| 503 | `maintenance-mode` | `service-unavailable` | Platform in maintenance |

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
