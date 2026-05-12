# Zerodha Kite Connect Integration Guide

## 1. Overview

This guide covers the complete integration of **Zerodha Kite Connect** APIs for TradeMind AI. Zerodha is India's largest retail broker and the primary broker for TradeMind.

**Official Docs:** [Kite Connect API](https://kite.trade/docs/connect/v3/)  
**Python SDK:** [pykiteconnect](https://github.com/zerodha/pykiteconnect)  
**API Pricing:** ₹2,000/month for live API access (historical data extra)

---

## 2. App Registration & API Keys

### 2.1 Creating a Kite Connect App

1. Log in to [Kite Developer Console](https://developers.kite.trade)
2. Create a new app:
   - **App Name:** TradeMind AI
   - **Redirect URL:** `https://trademind.in/api/auth/zerodha/callback`
   - **Permissions:** Read orders, Write orders, Read holdings
3. Receive:
   - `api_key` (public)
   - `api_secret` (private — never expose)

### 2.2 Key Security Rules

| Rule | Implementation |
|---|---|
| **Never expose `api_secret`** | Store server-side only; AES-256-GCM encrypted in DB |
| **Use server-side proxy** | All broker API calls from Next.js → Python FastAPI → Zerodha |
| **Request token expiry** | Valid for single login session only (few minutes) |
| **Access token expiry** | Valid for 24 hours; must re-authenticate daily |
| **Rate limits** | 3 orders/second; 100 WebSocket subscriptions |

---

## 3. Authentication Flow (OAuth 2.0)

### 3.1 Step-by-Step Flow

```
User clicks "Connect Zerodha" in TradeMind
  → Next.js redirects to:
    https://kite.zerodha.com/connect/login?v=3&api_key={API_KEY}
  
User logs in to Zerodha + enters 2FA PIN
  → Zerodha redirects to:
    https://trademind.in/api/auth/zerodha/callback?request_token=xyz

TradeMind backend exchanges request_token for access_token:
  POST https://api.kite.trade/session/token
  Body: api_key, request_token, checksum=hmac256(api_key+request_token+api_secret)

Store access_token (encrypted) for 24h use
```

### 3.2 Python Implementation

```python
from kiteconnect import KiteConnect
import hmac, hashlib

def get_access_token(request_token: str, api_key: str, api_secret: str) -> str:
    """Exchange request token for access token."""
    kite = KiteConnect(api_key=api_key)
    
    # Generate checksum: SHA-256(api_key + request_token + api_secret)
    checksum = hmac.new(
        api_secret.encode(),
        f"{api_key}{request_token}".encode(),
        hashlib.sha256
    ).hexdigest()
    
    data = kite.generate_session(request_token, api_secret=api_secret)
    return data["access_token"]  # Valid for 24 hours
```

### 3.3 Daily Re-Authentication (SEBI Feb 2025 Requirement)

SEBI mandates daily 2FA for API access. TradeMind must:

1. Notify user at 8:45 AM IST: "Please re-authenticate Zerodha for today's session"
2. User clicks → redirected to Zerodha login → completes 2FA
3. New access_token generated → stored encrypted → valid until 8:30 AM next day
4. If not re-authenticated by 9:15 AM: "Trading paused — re-authenticate to resume"

---

## 4. Order Placement

### 4.1 Order Types Supported

| Order Type | Zerodha Parameter | Use Case |
|---|---|---|
| **Market** | `order_type=KiteConnect.ORDER_TYPE_MARKET` | Immediate execution at best available price |
| **Limit** | `ORDER_TYPE_LIMIT` | Execute only at specified price or better |
| **SL (Stop-Loss)** | `ORDER_TYPE_SL` | Market order triggered when stop price hit |
| **SL-M (Stop-Loss Market)** | `ORDER_TYPE_SLM` | Market order at trigger (no limit price) |
| **CO (Cover Order)** | Bracket order variant | Entry + mandatory stop-loss |
| **BO (Bracket Order)** | Entry + stop-loss + target | Note: BO suspended by SEBI since 2020; check current status |

### 4.2 Product Types

| Product | Code | Description | Margin |
|---|---|---|---|
| **CNC** | `PRODUCT_CNC` | Cash and Carry (Delivery) | 100% of order value |
| **MIS** | `PRODUCT_MIS` | Margin Intraday Square-off | ~5× leverage; auto-sq-off at 3:15 PM |
| **NRML** | `PRODUCT_NRML` | Normal (F&O overnight) | SPAN + Exposure margin |

### 4.3 Placing an Order

```python
from kiteconnect import KiteConnect

def place_order(access_token: str, api_key: str, symbol: str, 
                transaction_type: str, quantity: int, 
                order_type: str, product_type: str,
                price: float = None, trigger_price: float = None):
    """Place order via Zerodha Kite."""
    
    kite = KiteConnect(api_key=api_key)
    kite.set_access_token(access_token)
    
    # SEBI Feb 2025: All API orders are algo orders
    # Tag with Generic Algo ID (handled by broker automatically)
    # Ensure OPS stays below 10 per second
    
    try:
        order_id = kite.place_order(
            variety=kite.VARIETY_REGULAR,  # or CO, AMO, ICESC
            exchange=kite.EXCHANGE_NSE,
            tradingsymbol=symbol,  # e.g., "RELIANCE"
            transaction_type=transaction_type,  # BUY or SELL
            quantity=quantity,
            product=product_type,  # CNC, MIS, NRML
            order_type=order_type,  # MARKET, LIMIT, SL, SL-M
            price=price,
            trigger_price=trigger_price,
            tag="TRADEMIND_AI_SIGNAL"  # Optional: for tracking
        )
        return {"success": True, "order_id": order_id}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 4.4 Order Validation (Pre-Submit)

Before calling `place_order`, validate:

```python
def validate_order_for_zerodha(signal, portfolio):
    """Pre-submission validation for Zerodha-specific rules."""
    errors = []
    
    # 1. Check CNC requires full margin (no leverage)
    if signal.product_type == 'CNC':
        required_margin = signal.qty * signal.entry_price
        if portfolio.buying_power < required_margin:
            errors.append(f"CNC requires ₹{required_margin:.2f}; available ₹{portfolio.buying_power:.2f}")
    
    # 2. MIS leverage check (typically 5× on Zerodha)
    if signal.product_type == 'MIS':
        required_margin = (signal.qty * signal.entry_price) / 5
        if portfolio.buying_power < required_margin:
            errors.append(f"MIS requires ₹{required_margin:.2f} (20% margin); available ₹{portfolio.buying_power:.2f}")
    
    # 3. NRML (F&O) requires SPAN + Exposure margin
    if signal.product_type == 'NRML':
        # Fetch from Zerodha margin API
        span_margin = get_span_margin(signal.symbol, signal.qty)
        exposure_margin = get_exposure_margin(signal.symbol, signal.qty)
        if portfolio.buying_power < (span_margin + exposure_margin):
            errors.append(f"NRML requires SPAN ₹{span_margin:.2f} + Exposure ₹{exposure_margin:.2f}")
    
    # 4. Lot size validation for F&O
    if signal.instrument_type in ['FUT', 'CE', 'PE']:
        if signal.qty % signal.lot_size != 0:
            errors.append(f"Quantity {signal.qty} not in lot multiples of {signal.lot_size}")
    
    return errors
```

---

## 5. WebSocket Real-Time Data

### 5.1 Connecting to Kite WebSocket

```python
from kiteconnect import KiteTicker
import logging

def on_ticks(ws, ticks):
    """Called on every tick received."""
    for tick in ticks:
        print(f"{tick['instrument_token']}: LTP={tick['last_price']}")
        # Publish to Redis → Next.js via Socket.io

def on_connect(ws, response):
    """Subscribe to symbols on connection."""
    ws.subscribe([738561, 5633])  # Instrument tokens for RELIANCE, TCS
    ws.set_mode(ws.MODE_FULL, [738561, 5633])  # Full mode: LTP + depth + OHLC

def on_close(ws, code, reason):
    """Auto-reconnect on disconnect."""
    ws.stop()

# Initialize
ticker = KiteTicker(api_key, access_token)
ticker.on_ticks = on_ticks
ticker.on_connect = on_connect
ticker.on_close = on_close

# Start (runs in separate thread/process)
ticker.connect(threaded=True)
```

### 5.2 Tick Data Format

```python
{
    'instrument_token': 738561,      # Unique ID for RELIANCE
    'last_price': 2850.50,
    'last_quantity': 50,
    'average_price': 2848.20,
    'volume': 154200,
    'buy_quantity': 2500,
    'sell_quantity': 1800,
    'ohlc': {
        'open': 2845.00,
        'high': 2855.60,
        'low': 2840.15,
        'close': 2842.00  # Previous day close
    },
    'change': 8.50,                   # Absolute change from prev close
    'last_trade_time': '2025-01-15 10:30:00',
    'timestamp': '2025-01-15 10:30:00'
}
```

### 5.3 Instrument Token Lookup

```python
# Fetch all NSE instruments
instruments = kite.instruments("NSE")

# Find token for RELIANCE
reliance = [i for i in instruments if i['tradingsymbol'] == 'RELIANCE'][0]
print(f"RELIANCE token: {reliance['instrument_token']}")  # 738561
```

---

## 6. Portfolio & Holdings

### 6.1 Fetch Holdings

```python
holdings = kite.holdings()
# Returns: List of delivery positions (CNC)
```

### 6.2 Fetch Positions

```python
positions = kite.positions()
# Returns:
#   'day': []  # Intraday positions (MIS) — reset daily
#   'net': []  # Net positions (CNC + NRML carry-forward)
```

### 6.3 Fetch Orders

```python
orders = kite.orders()
# Returns all orders for the day
```

### 6.4 Fetch Margins

```python
margins = kite.margins()
# Returns:
#   'equity': {
#       'enabled': True,
#       'net': 1250000.00,          # Total equity
#       'available': {
#           'adhoc_margin': 0,
#           'cash': 450000.00,      # Free cash
#           'collateral': 0,
#           'intraday_payin': 0
#       },
#       'used': {
#           'debits': 800000.00,    # Used in positions
#           'exposure': 0,
#           'm2m_realised': 0,
#           'm2m_unrealised': 0,
#           'option_premium': 0,
#           'payout': 0,
#           'span': 0,
#           'holding_t1': 0
#       }
#   }
```

---

## 7. GTT (Good Till Triggered) Orders

Zerodha's GTT allows setting stop-loss and target orders that persist until triggered (up to 1 year).

```python
# Create a single GTT (e.g., stop-loss)
gtt = kite.place_gtt(
    trigger_type=kite.GTT_TYPE_SINGLE,
    tradingsymbol="RELIANCE",
    exchange="NSE",
    trigger_values=[2780.00],  # Stop-loss trigger
    last_price=2850.00,
    orders=[{
        "exchange": "NSE",
        "tradingsymbol": "RELIANCE",
        "transaction_type": "SELL",
        "quantity": 50,
        "order_type": "MARKET",
        "product": "CNC"
    }]
)

# GTT IDs for tracking
gtt_id = gtt["data"]["id"]
```

---

## 8. Paper Trading Limitations

**Important:** Zerodha's paper trading environment has limitations:

| Feature | Live | Paper (Sandbox) | TradeMind Workaround |
|---|---|---|---|
| **Real-time prices** | ✅ Live tick | ⚠️ Delayed 15 min | Use live WebSocket but don't execute |
| **Order fills** | ✅ Real market | ❌ No real fills | Build custom paper engine |
| **Margin calculation** | ✅ Real SPAN | ⚠️ Simulated | Use same calculation logic |
| **Brokerage** | ✅ Actual | ❌ Not simulated | Apply Zerodha brokerage formula |

### 8.1 Custom Paper Trading Engine

Since Zerodha sandbox is limited, TradeMind should build its own paper engine:

```python
class PaperTradingEngine:
    """Simulates Zerodha execution for paper trading."""
    
    # Slippage model calibrated to Indian market liquidity tiers
    SLIPPAGE_MODEL = {
        'nifty50':     {'mean_bps': 2,  'std_bps': 1},   # Large-cap, high liquidity
        'nifty100':    {'mean_bps': 4,  'std_bps': 2},   # Mid-large-cap
        'midcap':      {'mean_bps': 10, 'std_bps': 5},   # Mid-cap stocks
        'smallcap':    {'mean_bps': 25, 'std_bps': 10},  # Small-cap, lower liquidity
        't2t':         {'mean_bps': 50, 'std_bps': 20},  # Trade-to-trade (delivery only)
        'fno_liquid':  {'mean_bps': 3,  'std_bps': 2},   # F&O near-month, liquid strikes
        'fno_illiquid':{'mean_bps': 15, 'std_bps': 8},   # F&O far OTM, far-month
        'fno_expiry':  {'mean_bps': 30, 'std_bps': 15},  # F&O on expiry day (high volatility)
    }
    
    def __init__(self, initial_capital: float):
        self.cash = initial_capital
        self.positions = {}  # symbol -> Position
        self.orders = []
        self.trade_history = []
    
    def _estimate_slippage(self, signal) -> float:
        """Estimate slippage based on stock category and market conditions."""
        category = self._classify_instrument(signal)
        model = self.SLIPPAGE_MODEL.get(category, self.SLIPPAGE_MODEL['midcap'])
        
        # Gaussian slippage: mean + noise, always adverse to trader
        slippage_bps = max(0, random.gauss(model['mean_bps'], model['std_bps']))
        
        # Direction: slippage is adverse (higher for buys, lower for sells)
        direction = 1 if signal.side == 'buy' else -1
        return slippage_bps * direction
    
    def _classify_instrument(self, signal) -> str:
        """Classify instrument into liquidity tier for slippage modeling."""
        if hasattr(signal, 'instrument_type') and signal.instrument_type in ['CE', 'PE', 'FUT']:
            if is_expiry_day(signal.expiry):
                return 'fno_expiry'
            avg_oi = get_average_oi(signal.symbol)  # From cache
            return 'fno_liquid' if avg_oi > 100000 else 'fno_illiquid'
        
        if is_t2t_stock(signal.symbol):
            return 't2t'
        
        index_membership = get_index_membership(signal.symbol)  # From instrument cache
        if 'NIFTY 50' in index_membership:
            return 'nifty50'
        elif 'NIFTY 100' in index_membership:
            return 'nifty100'
        elif 'NIFTY MIDCAP 150' in index_membership:
            return 'midcap'
        else:
            return 'smallcap'
    
    def place_paper_order(self, signal) -> dict:
        """Simulate order fill at current market price with realistic slippage."""
        # Get current price from WebSocket cache
        fill_price = self.get_current_price(signal.symbol)
        
        # Apply liquidity-aware slippage model
        slippage_bps = self._estimate_slippage(signal)
        slippage_amount = fill_price * (slippage_bps / 10000)
        fill_price += slippage_amount
        
        # Apply Zerodha brokerage
        brokerage = min(max(fill_price * signal.qty * 0.0003, 20), 20)  # ₹20 flat for F&O/intraday
        stt = fill_price * signal.qty * 0.00025  # 0.025% on sell for equity intraday
        
        # Update positions and cash
        order_value = fill_price * signal.qty
        self.cash -= order_value + brokerage + stt
        
        # Log paper trade
        self.trade_history.append({
            'symbol': signal.symbol,
            'side': signal.side,
            'qty': signal.qty,
            'price': fill_price,
            'slippage_bps': abs(slippage_bps),
            'slippage_category': self._classify_instrument(signal),
            'brokerage': brokerage,
            'stt': stt,
            'timestamp': datetime.now(IST)
        })
        
        return {'status': 'filled', 'price': fill_price, 'slippage_bps': abs(slippage_bps)}
```

---

## 9. Rate Limits & Error Handling

### 9.1 Rate Limits

| Limit | Value | Consequence |
|---|---|---|
| **Orders per second** | 3 | Excess orders rejected with rate limit error |
| **WebSocket subscriptions** | 100 instruments | Excess subscriptions ignored |
| **API calls per minute** | 100 | 429 Rate Limit error |
| **Historical data requests** | 3/minute | Delay between requests |

### 9.2 Common Errors

| Error Code | Meaning | Resolution |
|---|---|---|
| `400` | Bad request (validation) | Check order parameters |
| `401` | Unauthorized | Access token expired; re-authenticate |
| `403` | Forbidden (insufficient margin) | Check margin API; reduce order size |
| `429` | Rate limit exceeded | Back off; retry with exponential delay |
| `500` | Broker server error | Retry after 5 seconds; escalate if persistent |
| `Network` | Connection failed | Auto-reconnect with exponential backoff |

### 9.3 Exponential Backoff for Retries

```python
import time

def execute_with_retry(func, max_retries=3):
    """Execute broker API call with retry logic."""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt  # 1s, 2s, 4s
            time.sleep(wait_time)
```

---

## 10. Fallback to Upstox API

When Zerodha is down or user's Zerodha account has issues:

| Scenario | Fallback Action |
|---|---|
| **Zerodha API down** | Queue orders; notify user; offer Upstox re-connection |
| **User wants to switch broker** | One-click Upstox OAuth flow; migrate watchlist |
| **Zerodha margin insufficient** | Alert user; suggest CNC instead of MIS |
| **Order rejected by Zerodha** | Log rejection reason; display to user; suggest fix |

**Upstox API differences:**
- Similar OAuth 2.0 flow
- Different instrument token format
- Slightly different order API parameters
- WebSocket endpoint: `wss://api.upstox.com/v2/feed`

---

## 11. Security Best Practices

```
┌─────────────────────────────────────────┐
│         SECURITY ARCHITECTURE           │
├─────────────────────────────────────────┤
│  Client (Next.js)                       │
│    → NEVER stores broker keys           │
│    → Makes API calls to TradeMind BE    │
│                                         │
│  TradeMind Backend (Python FastAPI)     │
│    → Stores encrypted broker keys       │
│    → Proxies all broker API calls       │
│    → Rate limits: 3 orders/sec per user │
│    → Circuit breaker on broker errors   │
│                                         │
│  Zerodha Kite API                       │
│    → OAuth 2.0 + daily 2FA              │
│    → Static IP whitelisted              │
│    → SEBI Generic Algo ID auto-tagged  │
└─────────────────────────────────────────┘
```

---

## 12. Integration Checklist

- [ ] Register Kite Connect app and obtain API keys
- [ ] Implement OAuth 2.0 callback handler
- [ ] Build daily re-authentication flow (SEBI Feb 2025)
- [ ] Implement order placement with all product types (CNC/MIS/NRML)
- [ ] Add pre-trade validation (margin, lot size, circuit limits)
- [ ] Connect to Kite WebSocket for real-time ticks
- [ ] Build instrument token cache (update weekly)
- [ ] Implement GTT for stop-loss orders
- [ ] Build custom paper trading engine
- [ ] Add rate limiting and retry logic
- [ ] Test all order types in sandbox
- [ ] Verify Generic Algo ID tagging with broker
- [ ] Document static IP + 2FA requirements for users
- [ ] Implement fallback to Upstox API
- [ ] Log all orders for SEBI audit compliance (8 years)
