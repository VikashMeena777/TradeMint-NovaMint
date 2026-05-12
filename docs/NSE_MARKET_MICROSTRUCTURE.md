# NSE/BSE Market Microstructure Guide

## 1. Market Sessions (IST)

| Session | Time (IST) | Activity | Key Events |
|---|---|---|---|
| **Pre-open** | 09:00 - 09:08 | Order entry | Place/modify/cancel orders |
| **Pre-open (No-cancellation)** | 09:08 - 09:12 | No cancellation | Final order adjustments |
| **Pre-open (Call Auction)** | 09:12 - 09:15 | Price discovery | Opening price determined via call auction |
| **Normal / Continuous** | 09:15 - 15:30 | Continuous trading | Standard order matching |
| **Post-close** | 15:30 - 15:40 | Closing price calc | VWAP of last 30 min = closing price |
| **Closed** | 15:40 - 09:00 (next day) | No trading | Overnight orders queued for next session |

**Note:** India has **no extended hours trading** for equities (unlike US markets).

---

## 2. Pre-Open Call Auction

### 2.1 How It Works

1. **09:00 - 09:08:** Traders place, modify, and cancel orders
2. **09:08 - 09:12:** No cancellation allowed; only new orders and modifications
3. **09:12 - 09:15:** Call auction runs; opening price determined

### 2.2 Opening Price Calculation

The opening price is the price that maximizes traded volume (single-price auction).

```
If no overlapping buy/sell orders → Opening price = previous day close
If overlapping orders exist → Price that maximizes executable quantity
```

### 2.3 TradeMind Pre-Market Strategy

```python
def pre_market_strategy(symbol: str) -> dict:
    """Analyze pre-market data for trading opportunity."""
    
    pre_open_data = fetch_pre_open_order_book(symbol)
    # Returns: bid qty at various prices, ask qty at various prices
    
    total_bid_qty = sum(pre_open_data['bids'])
    total_ask_qty = sum(pre_open_data['asks'])
    imbalance = total_bid_qty - total_ask_qty
    
    # If massive buy imbalance (>2× sell), expect gap-up open
    # If massive sell imbalance (>2× buy), expect gap-down open
    
    imbalance_ratio = abs(imbalance) / max(1, min(total_bid_qty, total_ask_qty))
    
    return {
        'expected_open_direction': 'gap_up' if imbalance > total_ask_qty else 'gap_down' if imbalance < -total_bid_qty else 'flat',
        'imbalance_ratio': imbalance_ratio,
        'action': 'place_limit_at_expected_open' if imbalance_ratio > 2 else 'wait_for_continuous'
    }
```

---

## 3. Circuit Limits

### 3.1 Daily Price Bands

| Circuit Limit | Applicable To | Action |
|---|---|---|
| **±5%** | Most Nifty 50 stocks, Nifty 100 stocks | Trading halts for 15 min if hit; resumes with 5% extended band |
| **±10%** | Some mid-cap stocks, less liquid stocks | Trading halts for 15 min; resumes with 10% extended band |
| **±20%** | Small-cap stocks, very illiquid stocks | Trading halts for 15 min; resumes with 20% extended band |
| **No limit** | T2T (Trade-to-Trade) segment stocks | No circuit limits; but delivery mandatory |

### 3.2 Circuit Limit Calculation

```python
def get_circuit_limits(symbol: str, previous_close: float, segment: str) -> dict:
    """Calculate daily circuit limits for a stock."""
    
    if segment == 'T2T':
        return {'upper': float('inf'), 'lower': 0, 'band_pct': None}
    
    # Circuit limit depends on stock category
    circuit_pct = get_circuit_percentage(symbol)  # 5%, 10%, or 20%
    
    upper = previous_close * (1 + circuit_pct / 100)
    lower = previous_close * (1 - circuit_pct / 100)
    
    # Round to tick size (typically ₹0.05)
    tick_size = 0.05
    upper = round(upper / tick_size) * tick_size
    lower = round(lower / tick_size) * tick_size
    
    return {
        'upper': upper,
        'lower': lower,
        'band_pct': circuit_pct,
        'previous_close': previous_close
    }
```

### 3.3 Circuit Hit Behavior

When a stock hits its circuit limit:

1. **Upper circuit hit:** No more buy orders accepted at/above circuit price; only sell orders
2. **Lower circuit hit:** No more sell orders accepted at/below circuit price; only buy orders
3. **15-minute cooling-off:** Trading halts for 15 minutes (index-wide circuit) or stock-specific
4. **Extended band:** After cooling-off, circuit extended by same percentage (e.g., 5% → effective 10% total)

### 3.4 Market-Wide Circuit Breakers

| Trigger | Action | Duration |
|---|---|---|
| **Nifty drops 10%** | Trading halt across all markets | 45 minutes |
| **Nifty drops 15%** | Trading halt across all markets | 45 minutes + 15 min pre-open |
| **Nifty drops 20%** | Trading halt for remainder of day | Until next trading day |

**Note:** Market-wide circuit breakers have not been triggered since 2009 (post-2008 crisis).

---

## 4. T2T (Trade-to-Trade) Segment

### 4.1 What Is T2T?

Stocks in the T2T segment:
- **Must be delivered** — no intraday trading allowed
- **No circuit limits** — can move any amount in a day
- **Typically:** Illiquid stocks, suspected manipulation, newly listed, or under surveillance

### 4.2 T2T Impact on TradeMind

```python
def check_t2t_impact(symbol: str, proposed_product_type: str) -> dict:
    """Check if stock is in T2T segment and validate product type."""
    
    is_t2t = check_t2t_status(symbol)
    
    if is_t2t:
        if proposed_product_type == 'MIS':
            return {
                'allowed': False,
                'reason': f'{symbol} is in T2T segment. Intraday (MIS) not allowed. Use CNC for delivery.',
                'suggested_action': 'Switch to CNC product type'
            }
        else:
            return {
                'allowed': True,
                'warning': f'{symbol} is in T2T segment. No circuit limits; extreme volatility possible.',
                'note': 'Delivery mandatory. Position will settle in T+1.'
            }
    
    return {'allowed': True, 'is_t2t': False}
```

---

## 5. Tick Size & Price Bands

### 5.1 Tick Size Rules

| Price Range | Tick Size | Example |
|---|---|---|
| **Below ₹10** | ₹0.01 | ₹9.85, ₹9.86 |
| **₹10 - ₹100** | ₹0.05 | ₹45.50, ₹45.55 |
| **₹100 - ₹500** | ₹0.10 | ₹250.10, ₹250.20 |
| **₹500 - ₹1,000** | ₹0.50 | ₹750.50, ₹751.00 |
| **Above ₹1,000** | ₹1.00 | ₹2,850, ₹2,851 |

### 5.2 Price Band Implementation

```python
def round_to_tick(price: float, tick_size: float) -> float:
    """Round price to valid tick size for NSE."""
    return round(price / tick_size) * tick_size

# Example
price = 2850.33
tick = 1.00  # RELIANCE is above ₹1000
valid_price = round_to_tick(price, tick)  # 2850.00
```

---

## 6. Settlement Cycle

### 6.1 T+1 Settlement (Effective Feb 2022)

| Day | Activity |
|---|---|
| **T (Trade day)** | Order executed; funds/shares blocked |
| **T+1 (Settlement day)** | Funds debited/credited; shares delivered to demat |

**Note:** India moved from T+2 to T+1 settlement in phases during 2021-2022. All segments are now T+1.

### 6.2 Auction Market (For Short Delivery)

If a seller fails to deliver shares on T+1:

1. **Auction on T+2:** Exchange conducts auction to buy shares for the buyer
2. **Auction penalty:** Short-selling party pays difference + penalty
3. **Close-out:** If auction fails, cash settlement at close-out price

---

## 7. Corporate Actions

### 7.1 Types of Corporate Actions

| Action | Impact on Position | TradeMind Handling |
|---|---|---|
| **Stock Split** | Qty × ratio; Price ÷ ratio | Auto-adjust qty and cost basis |
| **Reverse Split** | Qty ÷ ratio; Price × ratio | Auto-adjust qty and cost basis |
| **Bonus Issue** | Free shares received (e.g., 1:1) | Add to position; cost basis = ₹0 |
| **Cash Dividend** | Cash credited to account | Record as income; adjust total return |
| **Stock Dividend** | Additional shares | Add to position; adjust cost basis |
| **Rights Issue** | Option to buy at discount | Alert user; track if exercised |
| **Merger/Acquisition** | Shares converted to acquirer's stock | Flag for manual review |
| **Delisting** | Shares removed from exchange | Alert user; offer exit options |

### 7.2 Ex-Date vs Record Date

| Date | Meaning | Trading Impact |
|---|---|---|
| **Ex-Date** | Date from which stock trades without the benefit | Price typically drops by dividend/bonus amount |
| **Record Date** | Date on which company checks shareholder register | Must hold shares on this date to receive benefit |

**India specific:** Ex-date is typically 1-2 days before record date.

---

## 8. Block Deals & Bulk Deals

### 8.1 Block Deal

- **Minimum value:** ₹5 crores
- **Minimum quantity:** 5 lakh shares
- **Timing:** First 15 minutes of market open (9:15-9:30) or last 15 minutes (15:15-15:30)
- **Price:** Within ±1% of previous close or current market price
- **Visibility:** Reported to exchange after execution

### 8.2 Bulk Deal

- **Minimum quantity:** 0.5% of total equity shares
- **Timing:** Any time during market hours
- **Reporting:** Must be disclosed to exchange within 30 minutes
- **Significance:** Often indicates institutional activity; may signal trend

---

## 9. Market Indices

### 9.1 Key NSE Indices

| Index | Constituents | Free-Float Market Cap | Use Case |
|---|---|---|---|
| **Nifty 50** | Top 50 NSE stocks by free-float mcap | ~65% of total NSE mcap | Broad market benchmark |
| **Nifty 100** | Top 100 stocks | ~80% of total NSE mcap | Large-cap benchmark |
| **Nifty 200** | Top 200 stocks | ~90% of total NSE mcap | Large + mid-cap |
| **Nifty 500** | Top 500 stocks | ~95% of total NSE mcap | All-cap benchmark |
| **Nifty Next 50** | 51st to 100th by mcap | ~15% of Nifty 100 | Mid-cap proxy |
| **Nifty Midcap 100** | Top 100 mid-cap stocks | Mid-cap segment | Mid-cap benchmark |
| **Nifty Smallcap 100** | Top 100 small-cap stocks | Small-cap segment | Small-cap benchmark |
| **Nifty Bank** | Top 12 banking stocks | Banking sector | Banking sector proxy |
| **Nifty IT** | Top 10 IT stocks | IT sector | IT sector proxy |
| **Nifty Auto** | Top 15 auto stocks | Auto sector | Auto sector proxy |
| **Nifty Pharma** | Top 10 pharma stocks | Pharma sector | Pharma sector proxy |
| **Nifty FMCG** | Top 15 FMCG stocks | FMCG sector | FMCG sector proxy |
| **Nifty Energy** | Top 10 energy stocks | Energy sector | Energy sector proxy |

### 9.2 Index Rebalancing

- **Nifty 50:** Semi-annual review (March & September)
- **Criteria:** Free-float market cap, liquidity (impact cost < 0.5%)
- **Impact:** Stocks added/removed can see 5-15% price movement on rebalancing day

---

## 10. NSE vs BSE Comparison

| Attribute | NSE | BSE |
|---|---|---|
| **Founded** | 1992 | 1875 |
| **Market Share (Equity)** | ~90% | ~10% |
| **Liquidity** | Higher | Lower |
| **Spreads** | Tighter | Wider |
| **F&O** | Primary exchange | Limited |
| **Listing Cost** | Higher | Lower |
| **Technology** | Modern (NTS) | Modern (BOLT+) |
| **Co-location** | Available | Available |
| **Algos** | More algo activity | Less |

**Recommendation:** TradeMind should default to NSE for most orders due to higher liquidity. Use BSE only if:
- Stock is BSE-exclusive
- NSE spread is unusually wide
- User explicitly prefers BSE

---

## 11. Holiday Calendar

### 11.1 NSE Trading Holidays 2025 (Partial List)

| Date | Festival | Status |
|---|---|---|
| Jan 26 | Republic Day | Closed |
| Mar 14 | Holi | Closed |
| Mar 31 | Id-ul-Fitr | Closed |
| Apr 10 | Good Friday | Closed |
| Apr 14 | Ambedkar Jayanti | Closed |
| May 1 | Maharashtra Day | Closed |
| Aug 15 | Independence Day | Closed |
| Aug 27 | Ganesh Chaturthi | Closed |
| Oct 2 | Gandhi Jayanti | Closed |
| Oct 21 | Diwali (Laxmi Pujan) | **Special Muhurat Trading** (evening session) |
| Nov 5 | Guru Nanak Jayanti | Closed |
| Dec 25 | Christmas | Closed |

**Special Note:** Diwali has a special **Muhurat Trading** session (typically 1 hour in the evening). Check NSE website for exact timing each year.

### 11.2 API for Holiday Check

```python
import requests
from datetime import date

def is_trading_holiday(check_date: date) -> bool:
    """Check if a date is an NSE trading holiday."""
    # NSE publishes holiday calendar as CSV
    holidays = fetch_nse_holidays()  # Cache this; update annually
    return check_date.strftime('%Y-%m-%d') in holidays

def get_next_trading_day(from_date: date) -> date:
    """Get the next trading day (skip weekends and holidays)."""
    next_day = from_date + timedelta(days=1)
    while next_day.weekday() >= 5 or is_trading_holiday(next_day):
        next_day += timedelta(days=1)
    return next_day
```

---

## 12. Data Sources for Microstructure

| Data | Source | Frequency | Cost |
|---|---|---|---|
| **Bhavcopy (EOD prices)** | NSE Data & Analytics | Daily EOD | Free |
| **Circuit limits** | NSE Circulars | Daily | Free |
| **T2T segment list** | NSE Circulars | Weekly | Free |
| **Corporate actions** | NSE/BSE Announcements | Real-time | Free |
| **Holiday calendar** | NSE Website | Annual | Free |
| **Index constituents** | NSE Indices Website | Semi-annual | Free |
| **Block/bulk deals** | NSE Reports | Daily EOD | Free |
| **Tick-by-tick data** | Zerodha/Upstox WS (free) | Real-time | Free (broker account) |

---

## 13. TradeMind Market Data Integration Checklist

- [ ] Fetch daily bhavcopy for EOD prices and circuit limits
- [ ] Maintain T2T segment list (updated weekly)
- [ ] Track corporate actions calendar (dividends, splits, bonuses)
- [ ] Implement NSE holiday calendar (skip non-trading days in backtests)
- [ ] Support pre-market data for gap-up/gap-down analysis
- [ ] Handle market-wide circuit breaker scenarios
- [ ] Validate tick sizes for all order price inputs
- [ ] Adjust positions for stock splits and bonus issues automatically
- [ ] Monitor block/bulk deals for institutional sentiment
- [ ] Track index rebalancing dates (Nifty 50: March & September)
- [ ] Default to NSE; offer BSE as alternative for each symbol
